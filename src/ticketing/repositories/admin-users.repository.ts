// Migrated to Prisma's native model API (prisma.customer.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 3).
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";

async function attachWalletAndTicketCounts<T extends { id: number }>(customers: T[]) {
    const ids = customers.map((c) => c.id);
    const [wallets, ticketCounts] = await Promise.all([
        prismaDb.wallet.findMany({ where: { customer_id: { in: ids } }, select: { customer_id: true, balance: true } }),
        prismaDb.event_ticket.groupBy({ by: ['customer_id'], where: { customer_id: { in: ids }, is_deleted: false }, _count: { _all: true } }),
    ]);
    const balanceByCustomer = new Map(wallets.map((w) => [w.customer_id, w.balance]));
    const ticketCountByCustomer = new Map(ticketCounts.map((t) => [t.customer_id, t._count._all]));

    return customers.map((c) => ({
        ...c,
        wallet_balance: balanceByCustomer.get(c.id) ?? 0,
        total_tickets_purchased: ticketCountByCustomer.get(c.id) ?? 0,
    }));
}

export class AdminUsersRepository {

    static async findAll(opts: {
        limit: number; offset: number; includeDeleted: boolean;
        role?: string; isActive?: boolean; allCustomers: boolean;
    }) {
        const where: Prisma.customerWhereInput = {};
        if (!opts.includeDeleted) where.is_deleted = false;
        if (opts.role) where.role = opts.role;
        if (opts.isActive !== undefined) where.is_active = opts.isActive;

        // Default view: only customers with real ticketing activity (an
        // organizer profile, or at least one ticket purchase) — this
        // endpoint otherwise returns the entire customer base (shared
        // 1-for-1 with the travel/booking "Clients" screen), which is
        // mostly noise for a ticketing-admin workflow. `all_customers=true`
        // lifts this so an admin can still find someone before their first
        // purchase.
        if (!opts.allCustomers) {
            where.OR = [
                { role: 'organizer' },
                { event_ticket: { some: { is_deleted: false } } },
            ];
        }

        const [rows, total] = await Promise.all([
            prismaDb.customer.findMany({
                where,
                select: {
                    id: true, first_name: true, last_name: true, email: true, phone: true,
                    role: true, is_active: true, is_deleted: true, created_at: true, updated_at: true,
                },
                orderBy: { created_at: 'desc' },
                take: opts.limit,
                skip: opts.offset,
            }),
            prismaDb.customer.count({ where }),
        ]);

        const users = await attachWalletAndTicketCounts(rows);
        return { users, total };
    }

    static async search(q: string, role?: string, isActive?: boolean) {
        const where: Prisma.customerWhereInput = {
            is_deleted: false,
            OR: [
                { first_name: { contains: q, mode: 'insensitive' } },
                { last_name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
            ],
        };
        if (role) where.role = role;
        if (isActive !== undefined) where.is_active = isActive;

        const rows = await prismaDb.customer.findMany({
            where,
            select: { id: true, first_name: true, last_name: true, email: true, phone: true, role: true, is_active: true, created_at: true },
            orderBy: { created_at: 'desc' },
            take: 50,
        });

        return attachWalletAndTicketCounts(rows).then((users) =>
            // `searchUsers`'s original SELECT never included
            // total_tickets_purchased (only getAllUsers's did) — drop it
            // here to match that exact column list.
            users.map(({ total_tickets_purchased: _t, ...rest }) => rest)
        );
    }

    static async findById(id: number) {
        const user = await prismaDb.customer.findUnique({ where: { id } });
        if (!user) return null;

        const [wallet, ticketCount, organizerCount] = await Promise.all([
            prismaDb.wallet.findUnique({ where: { customer_id: id }, select: { balance: true } }),
            prismaDb.event_ticket.count({ where: { customer_id: id, is_deleted: false } }),
            prismaDb.event_organizer.count({ where: { customer_id: id, is_deleted: false } }),
        ]);

        return {
            ...user,
            wallet_balance: wallet?.balance ?? 0,
            total_tickets_purchased: ticketCount,
            organizer_profiles: organizerCount,
        };
    }

    static async updateStatus(id: number, isActive: boolean) {
        return prismaDb.customer.update({
            where: { id },
            data: { is_active: isActive, updated_at: new Date() },
        });
    }

    static async getTransactions(customerId: number) {
        const rows = await prismaDb.wallet_transaction.findMany({
            where: { customer_id: customerId },
            include: { customer: { select: { first_name: true, last_name: true, email: true } } },
            orderBy: { created_at: 'desc' },
        });

        // Original selected `c.first_name/last_name/email` as flat TOP-
        // LEVEL columns (no json_build_object here, unlike most other
        // controllers in this module) — flattened the same way, not
        // nested under a `customer` key.
        return rows.map((row) => {
            const { customer, ...rest } = row;
            return { ...rest, first_name: customer.first_name, last_name: customer.last_name, email: customer.email };
        });
    }

    static async getTickets(customerId: number) {
        const rows = await prismaDb.event_ticket.findMany({
            where: { customer_id: customerId, is_deleted: false },
            include: {
                event: { select: { id: true, title: true, code: true, event_date: true } },
                event_ticket_type: { select: { id: true, name: true } },
            },
            orderBy: { created_at: 'desc' },
        });

        return rows.map((row) => {
            const { event, event_ticket_type, ...rest } = row;
            return {
                ...rest,
                event: event ? { id: event.id, title: event.title, event_code: event.code, event_date: event.event_date } : null,
                ticket_type: event_ticket_type,
            };
        });
    }

    static async getWallet(customerId: number) {
        // The `wallet` table is never written to by any real payment flow
        // (only seeded at bootstrap) — the actual, actively maintained
        // balance is customer.wallet_balance, managed by WalletRepository
        // (see BOOKING_MODULE_NOTES.md). Sourced from there instead of the
        // stale `wallet` row.
        const customer = await prismaDb.customer.findFirst({
            where: { id: customerId, is_deleted: false },
            select: { id: true, wallet_balance: true, created_at: true, updated_at: true },
        });
        if (!customer) return null;

        // wallet_transaction has no generic type/status column — real
        // column is transaction_type ('top_up'|'payment'|'refund');
        // top_up/refund are credits, payment is a debit. No conditional-
        // SUM-in-one-aggregate equivalent — 2 separate `.aggregate()`
        // calls instead of `SUM(...) FILTER (WHERE ...)`.
        const [count, creditsAgg, debitsAgg] = await Promise.all([
            prismaDb.wallet_transaction.count({ where: { customer_id: customerId } }),
            prismaDb.wallet_transaction.aggregate({
                where: { customer_id: customerId, transaction_type: { in: ['top_up', 'refund'] } },
                _sum: { amount: true },
            }),
            prismaDb.wallet_transaction.aggregate({
                where: { customer_id: customerId, transaction_type: 'payment' },
                _sum: { amount: true },
            }),
        ]);

        return {
            id: customer.id,
            customer_id: customer.id,
            balance: customer.wallet_balance ?? 0,
            transaction_count: count,
            total_credits: creditsAgg._sum.amount ?? 0,
            total_debits: debitsAgg._sum.amount ?? 0,
            created_at: customer.created_at,
            updated_at: customer.updated_at,
        };
    }
}

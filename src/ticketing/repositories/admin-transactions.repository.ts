// Migrated to Prisma's native model API — see BOOKING_MODULE_NOTES.md
// ("Full Prisma relational-API migration", tier 3).
import prismaDb from "../../config/prismaClient";

export class AdminTransactionsRepository {

    static async getWalletTransactions(limit: number, offset: number, type?: string) {
        // wallet_transaction has no `status` column, and its `type` column
        // is actually named `transaction_type` (see BOOKING_MODULE_NOTES.md)
        // — the `status` query param is accepted but was always ignored.
        const where = type ? { transaction_type: type } : {};

        const [rows, total] = await Promise.all([
            prismaDb.wallet_transaction.findMany({
                where,
                include: { customer: { select: { id: true, first_name: true, last_name: true, email: true } } },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            prismaDb.wallet_transaction.count({ where }),
        ]);

        return { transactions: rows, total };
    }

    static async getTicketTransactions(limit: number, offset: number, status?: string) {
        const where = status ? { status } : {};

        const [rows, total] = await Promise.all([
            prismaDb.event_ticket.findMany({
                where,
                include: {
                    event: { select: { id: true, title: true, code: true } },
                    customer: { select: { id: true, first_name: true, last_name: true, email: true } },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            prismaDb.event_ticket.count({ where }),
        ]);

        return { transactions: rows, total };
    }

    static async getPremiumTransactions() {
        // No separate "field service" category exists in the schema —
        // consolidated into has_featured_placement/
        // featured_placement_amount (see migrations/
        // ticketing_admin_surface_rebuild.sql). These columns carry no
        // real billing logic yet, so this list is mostly empty today.
        const rows = await prismaDb.event.findMany({
            where: { OR: [{ has_premium_design: true }, { has_boost: true }, { has_featured_placement: true }] },
            select: {
                id: true, code: true, title: true, has_premium_design: true, premium_design_amount: true,
                has_boost: true, boost_amount: true, has_featured_placement: true, featured_placement_amount: true,
                created_at: true,
                event_organizer: { select: { id: true, name: true, email: true } },
            },
            orderBy: { created_at: 'desc' },
        });

        return rows.map((row) => {
            const { has_boost, boost_amount, has_featured_placement, featured_placement_amount, event_organizer, ...rest } = row;
            return {
                ...rest,
                boost_visibility: has_boost,
                boost_amount,
                field_service: has_featured_placement,
                field_service_amount: featured_placement_amount,
                organizer: event_organizer,
            };
        });
    }

    static async findTransactionById(id: number) {
        // The "Transactions" screen this backs (transactions_repository_impl
        // .dart) works off a purchased *ticket*, not a wallet_transaction
        // row — its Transaction model expects event/ticket_type/quantity/
        // unit_price fields, matching getTicketTransactions() above.
        return prismaDb.event_ticket.findUnique({
            where: { id },
            include: {
                event: { select: { id: true, title: true, code: true } },
                customer: { select: { id: true, first_name: true, last_name: true, email: true, phone: true } },
                event_ticket_type: { select: { id: true, name: true, price: true } },
            },
        }).then((row) => {
            if (!row) return null;
            const { event_ticket_type, ...rest } = row;
            return { ...rest, ticket_type: event_ticket_type };
        });
    }

    static async findTicketForRefund(id: number) {
        return prismaDb.event_ticket.findFirst({ where: { id, is_deleted: false } });
    }

    static async markRefunded(id: number) {
        await prismaDb.event_ticket.updateMany({
            where: { id },
            data: { payment_status: 'refunded', status: 'cancelled' },
        });
    }
}

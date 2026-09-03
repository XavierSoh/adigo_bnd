// Migrated to Prisma's native model API — see BOOKING_MODULE_NOTES.md
// ("Full Prisma relational-API migration", tier 3). This whole export/
// revenue-report flow is a confirmed pre-existing, already-descoped gap
// (see BOOKING_MODULE_NOTES.md's "Known remaining gaps" section: the
// desktop app never renders these exports at all) — several fields
// `ExportService`'s formatters read (`event.event_code`, `event
// .total_tickets/sold_tickets/available_tickets/min_price/max_price`,
// `ticket.is_validated/validated_at`, `tx.type`) were NEVER actually
// selected by the original raw SQL either (real columns are `code`,
// nothing at all, `status`/`used_at`, `transaction_type` respectively) —
// preserved as-is (still absent/undefined in the exported shape), not
// silently "fixed" here, since the user already decided this flow just
// needs to not 500, not to be complete.
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";

export class AdminReportsRepository {

    static async getUsersForExport() {
        const [customers, wallets, ticketCounts] = await Promise.all([
            prismaDb.customer.findMany({
                where: { is_deleted: false },
                select: { id: true, first_name: true, last_name: true, email: true, phone: true, role: true, is_active: true, created_at: true },
                orderBy: { created_at: 'desc' },
            }),
            prismaDb.wallet.findMany({ select: { customer_id: true, balance: true } }),
            prismaDb.event_ticket.groupBy({ by: ['customer_id'], where: { is_deleted: false }, _count: { _all: true } }),
        ]);

        const balanceByCustomer = new Map(wallets.map((w) => [w.customer_id, w.balance]));
        const ticketCountByCustomer = new Map(ticketCounts.map((t) => [t.customer_id, t._count._all]));

        return customers.map((c) => ({
            ...c,
            wallet_balance: balanceByCustomer.get(c.id) ?? 0,
            total_tickets_purchased: ticketCountByCustomer.get(c.id) ?? 0,
        }));
    }

    static async getEventsForExport() {
        const rows = await prismaDb.event.findMany({
            where: { is_deleted: false },
            include: {
                event_category: { select: { name: true } },
                event_organizer: { select: { name: true } },
            },
            orderBy: { created_at: 'desc' },
        });

        return rows.map((row) => {
            const { event_category, event_organizer, ...rest } = row;
            return {
                ...rest,
                category: event_category ? { name: event_category.name } : null,
                organizer: event_organizer ? { organization_name: event_organizer.name } : null,
            };
        });
    }

    static async getTicketsForExport() {
        const rows = await prismaDb.event_ticket.findMany({
            where: { is_deleted: false },
            include: {
                event: { select: { title: true, code: true } },
                customer: { select: { first_name: true, last_name: true, email: true } },
                event_ticket_type: { select: { name: true } },
            },
            orderBy: { created_at: 'desc' },
        });

        return rows.map((row) => {
            const { event_ticket_type, ...rest } = row;
            return { ...rest, ticket_type: event_ticket_type };
        });
    }

    static async getTransactionsForExport() {
        return prismaDb.wallet_transaction.findMany({
            include: { customer: { select: { first_name: true, last_name: true, email: true } } },
            orderBy: { created_at: 'desc' },
        });
    }

    static async getRevenueReport(startDate?: Date, endDate?: Date) {
        const ticketDateFilter: Prisma.event_ticketWhereInput = {};
        if (startDate || endDate) {
            ticketDateFilter.created_at = {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
            };
        }

        // design/boost/featured_placement — minimal columns added for the
        // admin UI to show/toggle, no real billing logic behind them yet
        // (see BOOKING_MODULE_NOTES.md), so these sums are mostly 0 today.
        // No separate "field service" category in the schema —
        // consolidated into featured_placement. These 3 sums are
        // deliberately NOT date-filtered, matching the original's
        // unconditional subqueries (only the ticket revenue itself was).
        const [ticketRevenueAgg, premiumAgg] = await Promise.all([
            prismaDb.event_ticket.aggregate({
                where: { is_deleted: false, ...ticketDateFilter },
                _sum: { total_price: true },
            }),
            prismaDb.event.aggregate({
                where: { is_deleted: false },
                _sum: { premium_design_amount: true, boost_amount: true, featured_placement_amount: true },
            }),
        ]);

        const totalRevenue = {
            tickets_revenue: ticketRevenueAgg._sum.total_price ?? 0,
            design_revenue: premiumAgg._sum.premium_design_amount ?? 0,
            boost_revenue: premiumAgg._sum.boost_amount ?? 0,
            field_service_revenue: premiumAgg._sum.featured_placement_amount ?? 0,
        };

        const [organizers, categories] = await Promise.all([
            prismaDb.event_organizer.findMany({ where: { is_deleted: false }, select: { id: true, name: true } }),
            // event_category has no soft-delete columns at all (no
            // is_deleted/deleted_at), unlike most other ticketing tables;
            // is_active is the closest equivalent.
            prismaDb.event_category.findMany({ where: { is_active: true }, select: { id: true, name: true } }),
        ]);

        const [eventsByOrg, ticketsByOrg, eventsByCat, ticketsByCat] = await Promise.all([
            prismaDb.event.groupBy({
                by: ['organizer_id'],
                where: { is_deleted: false, organizer_id: { in: organizers.map((o) => o.id) } },
                _count: { _all: true },
            }),
            prismaDb.event_ticket.findMany({
                where: { is_deleted: false, ...ticketDateFilter, event: { is_deleted: false, organizer_id: { in: organizers.map((o) => o.id) } } },
                select: { total_price: true, event: { select: { organizer_id: true } } },
            }),
            prismaDb.event.groupBy({
                by: ['category_id'],
                where: { is_deleted: false, category_id: { in: categories.map((c) => c.id) } },
                _count: { _all: true },
            }),
            prismaDb.event_ticket.findMany({
                where: { is_deleted: false, ...ticketDateFilter, event: { is_deleted: false, category_id: { in: categories.map((c) => c.id) } } },
                select: { total_price: true, event: { select: { category_id: true } } },
            }),
        ]);

        const eventCountByOrg = new Map(eventsByOrg.map((e) => [e.organizer_id, e._count._all]));
        const revenueByOrg = new Map<number, number>();
        for (const t of ticketsByOrg) revenueByOrg.set(t.event.organizer_id, (revenueByOrg.get(t.event.organizer_id) ?? 0) + t.total_price);

        const byOrganizer = organizers
            .map((o) => ({
                id: o.id,
                organization_name: o.name,
                events_count: eventCountByOrg.get(o.id) ?? 0,
                revenue: revenueByOrg.get(o.id) ?? 0,
            }))
            .sort((a, b) => b.revenue - a.revenue);

        const eventCountByCat = new Map(eventsByCat.map((e) => [e.category_id, e._count._all]));
        const revenueByCat = new Map<number, number>();
        for (const t of ticketsByCat) revenueByCat.set(t.event.category_id, (revenueByCat.get(t.event.category_id) ?? 0) + t.total_price);

        const byCategory = categories
            .map((c) => ({
                id: c.id,
                name: c.name,
                events_count: eventCountByCat.get(c.id) ?? 0,
                revenue: revenueByCat.get(c.id) ?? 0,
            }))
            .sort((a, b) => b.revenue - a.revenue);

        return { total_revenue: totalRevenue, by_organizer: byOrganizer, by_category: byCategory };
    }
}

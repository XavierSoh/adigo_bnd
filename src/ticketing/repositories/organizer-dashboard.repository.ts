// Migrated to Prisma's native model API — see BOOKING_MODULE_NOTES.md
// ("Full Prisma relational-API migration", tier 3).
import prismaDb from "../../config/prismaClient";

export class OrganizerDashboardRepository {

    static async getStats(organizerId: number) {
        const eventWhere = { organizer_id: organizerId, is_deleted: false } as const;

        // `COUNT(DISTINCT e.id) FILTER (WHERE ...)` per status — no
        // groupBy-with-conditional-COUNT-DISTINCT equivalent, parallel
        // `.count()` calls instead.
        const [totalEvents, publishedEvents, draftEvents, pendingEvents, ticketTypeAgg] = await Promise.all([
            prismaDb.event.count({ where: eventWhere }),
            prismaDb.event.count({ where: { ...eventWhere, status: 'published' } }),
            prismaDb.event.count({ where: { ...eventWhere, status: 'draft' } }),
            prismaDb.event.count({ where: { ...eventWhere, status: 'pending' } }),
            // capacity/sold live on event_ticket_type (tiers), not on event
            // itself (see BOOKING_MODULE_NOTES.md) — SUM across the relation.
            prismaDb.event_ticket_type.aggregate({
                where: { event: eventWhere },
                _sum: { quantity: true, sold: true },
            }),
        ]);

        const totalCapacity = ticketTypeAgg._sum.quantity ?? 0;
        const totalSold = ticketTypeAgg._sum.sold ?? 0;

        const ticketWhere = { event: eventWhere, is_deleted: false } as const;
        // No `is_validated` column on event_ticket — a validated ticket is
        // status='used'.
        const [totalTicketsSold, validatedTickets, revenueAgg, confirmedRevenueAgg] = await Promise.all([
            prismaDb.event_ticket.count({ where: ticketWhere }),
            prismaDb.event_ticket.count({ where: { ...ticketWhere, status: 'used' } }),
            prismaDb.event_ticket.aggregate({ where: ticketWhere, _sum: { total_price: true } }),
            prismaDb.event_ticket.aggregate({ where: { ...ticketWhere, status: 'confirmed' }, _sum: { total_price: true } }),
        ]);

        // Premium services usage — no separate "field service" category
        // exists, consolidated into featured_placement.
        const [eventsWithDesign, eventsWithBoost, eventsWithFieldService, premiumAgg] = await Promise.all([
            prismaDb.event.count({ where: { ...eventWhere, has_premium_design: true } }),
            prismaDb.event.count({ where: { ...eventWhere, has_boost: true } }),
            prismaDb.event.count({ where: { ...eventWhere, has_featured_placement: true } }),
            prismaDb.event.aggregate({
                where: eventWhere,
                _sum: { premium_design_amount: true, boost_amount: true, featured_placement_amount: true },
            }),
        ]);

        return {
            total_events: totalEvents,
            published_events: publishedEvents,
            draft_events: draftEvents,
            pending_events: pendingEvents,
            total_capacity: totalCapacity,
            total_sold: totalSold,
            total_available: totalCapacity - totalSold,
            total_revenue: revenueAgg._sum.total_price ?? 0,
            confirmed_revenue: confirmedRevenueAgg._sum.total_price ?? 0,
            total_tickets_sold: totalTicketsSold,
            validated_tickets: validatedTickets,
            premium_services: {
                events_with_design: eventsWithDesign,
                events_with_boost: eventsWithBoost,
                events_with_field_service: eventsWithFieldService,
                total_design_cost: premiumAgg._sum.premium_design_amount ?? 0,
                total_boost_cost: premiumAgg._sum.boost_amount ?? 0,
                total_field_service_cost: premiumAgg._sum.featured_placement_amount ?? 0,
            },
            occupancy_rate: totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0,
        };
    }

    static async getSales(organizerId: number) {
        const rows = await prismaDb.event_ticket.findMany({
            where: { event: { organizer_id: organizerId }, is_deleted: false },
            include: {
                event: { select: { id: true, title: true, code: true, event_date: true } },
                event_ticket_type: { select: { id: true, name: true } },
                customer: { select: { id: true, first_name: true, last_name: true, email: true } },
            },
            orderBy: { created_at: 'desc' },
        });

        return rows.map((row) => {
            const { event, event_ticket_type, ...rest } = row;
            return {
                ...rest,
                event: event ? { id: event.id, title: event.title, event_code: event.code, event_date: event.event_date } : null,
                ticket_type: event_ticket_type,
                customer: rest.customer,
            };
        });
    }

    static async getValidatedTickets(organizerId: number, eventId?: number) {
        const rows = await prismaDb.event_ticket.findMany({
            where: {
                event: { organizer_id: organizerId },
                status: 'used',
                is_deleted: false,
                ...(eventId ? { event_id: eventId } : {}),
            },
            include: {
                event: { select: { id: true, title: true, event_date: true } },
                customer: { select: { id: true, first_name: true, last_name: true } },
            },
            orderBy: { used_at: 'desc' },
        });

        return rows;
    }

    static async getRevenue(organizerId: number) {
        const events = await prismaDb.event.findMany({
            where: { organizer_id: organizerId, is_deleted: false },
            select: { id: true, title: true, code: true, event_date: true },
            orderBy: { event_date: 'desc' },
        });
        const eventIds = events.map((e) => e.id);

        // `GROUP BY e.id` with 2 differently-filtered aggregates
        // (all tickets vs. `status='used'` only) — no conditional-SUM in a
        // single groupBy, so 2 separate groupBy calls merged in JS instead.
        const [allAgg, usedAgg] = eventIds.length
            ? await Promise.all([
                prismaDb.event_ticket.groupBy({
                    by: ['event_id'],
                    where: { event_id: { in: eventIds }, is_deleted: false },
                    _count: { _all: true },
                    _sum: { total_price: true },
                }),
                prismaDb.event_ticket.groupBy({
                    by: ['event_id'],
                    where: { event_id: { in: eventIds }, is_deleted: false, status: 'used' },
                    _sum: { total_price: true },
                }),
            ])
            : [[], []];

        const allByEvent = new Map(allAgg.map((a) => [a.event_id, a]));
        const usedByEvent = new Map(usedAgg.map((a) => [a.event_id, a]));

        // Original's LEFT JOIN + GROUP BY includes every organizer event
        // even with zero tickets (COUNT/SUM default to 0) — reproduced by
        // iterating `events` (not the aggregate results) and defaulting.
        return events.map((e) => ({
            id: e.id,
            title: e.title,
            event_code: e.code,
            event_date: e.event_date,
            tickets_sold: allByEvent.get(e.id)?._count._all ?? 0,
            total_revenue: allByEvent.get(e.id)?._sum.total_price ?? 0,
            validated_revenue: usedByEvent.get(e.id)?._sum.total_price ?? 0,
        }));
    }
}

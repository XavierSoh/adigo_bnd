// Migrated to Prisma's native model API — see BOOKING_MODULE_NOTES.md
// ("Full Prisma relational-API migration", tier 3).
import prismaDb from "../../config/prismaClient";

function localMidnightDaysAgo(days: number): Date {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return new Date(todayMidnight.getTime() - days * 24 * 60 * 60 * 1000);
}

export class AdminAnalyticsRepository {

    static async getDashboard() {
        const thirtyDaysAgo = localMidnightDaysAgo(30);
        const sevenDaysAgo = localMidnightDaysAgo(7);
        const todayMidnight = localMidnightDaysAgo(0);

        const [
            totalUsers, activeUsers, newUsers30d,
            totalEvents, publishedEvents, pendingEvents, draftEvents, upcomingEvents,
            totalTicketsSold, confirmedTickets, validatedTickets, revenueAgg, confirmedRevenueAgg,
            totalOrganizers, verifiedOrganizers, pendingOrganizers,
            ticketsSold7d, eventsCreated7d, usersRegistered7d,
        ] = await Promise.all([
            prismaDb.customer.count({ where: { is_deleted: false } }),
            prismaDb.customer.count({ where: { is_deleted: false, is_active: true } }),
            prismaDb.customer.count({ where: { is_deleted: false, created_at: { gte: thirtyDaysAgo } } }),

            prismaDb.event.count(),
            prismaDb.event.count({ where: { status: 'published' } }),
            prismaDb.event.count({ where: { status: 'pending' } }),
            prismaDb.event.count({ where: { status: 'draft' } }),
            prismaDb.event.count({ where: { event_date: { gte: todayMidnight } } }),

            prismaDb.event_ticket.count({ where: { is_deleted: false } }),
            prismaDb.event_ticket.count({ where: { is_deleted: false, status: 'confirmed' } }),
            prismaDb.event_ticket.count({ where: { is_deleted: false, status: 'used' } }),
            prismaDb.event_ticket.aggregate({ where: { is_deleted: false }, _sum: { total_price: true } }),
            prismaDb.event_ticket.aggregate({ where: { is_deleted: false, status: 'confirmed' }, _sum: { total_price: true } }),

            prismaDb.event_organizer.count({ where: { is_deleted: false } }),
            prismaDb.event_organizer.count({ where: { is_deleted: false, verification_status: 'verified' } }),
            prismaDb.event_organizer.count({ where: { is_deleted: false, verification_status: 'pending' } }),

            // BUG FIX APPLIED PER EXPLICIT USER DECISION (not guessed): the
            // original computed these 3 counts via a single query built on
            // a FULL OUTER JOIN whose ON conditions don't correlate to the
            // left-hand tables, filtered by a WHERE clause that only keeps
            // rows where a *ticket* is recent — meaning events_created_7d/
            // users_registered_7d silently came back 0 whenever
            // tickets_sold_7d was 0, regardless of real new events/
            // customers. Flagged and fixed to 3 independent counts.
            prismaDb.event_ticket.count({ where: { is_deleted: false, created_at: { gte: sevenDaysAgo } } }),
            prismaDb.event.count({ where: { created_at: { gte: sevenDaysAgo } } }),
            prismaDb.customer.count({ where: { is_deleted: false, created_at: { gte: sevenDaysAgo } } }),
        ]);

        return {
            users: { total_users: totalUsers, active_users: activeUsers, new_users_last_30_days: newUsers30d },
            events: {
                total_events: totalEvents, published_events: publishedEvents, pending_events: pendingEvents,
                draft_events: draftEvents, upcoming_events: upcomingEvents,
            },
            tickets: {
                total_tickets_sold: totalTicketsSold, confirmed_tickets: confirmedTickets, validated_tickets: validatedTickets,
                total_revenue: revenueAgg._sum.total_price ?? 0, confirmed_revenue: confirmedRevenueAgg._sum.total_price ?? 0,
            },
            organizers: { total_organizers: totalOrganizers, verified_organizers: verifiedOrganizers, pending_organizers: pendingOrganizers },
            // Premium services stats — not yet implemented in schema, kept
            // as the original's hardcoded placeholder.
            premium_services: { events_with_design: 0, events_with_boost: 0, total_design_revenue: 0, total_boost_revenue: 0 },
            recent_activity: { tickets_sold_7d: ticketsSold7d, events_created_7d: eventsCreated7d, users_registered_7d: usersRegistered7d },
        };
    }

    static async getSalesTrends(period: 'day' | 'week' | 'month') {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const rows = await prismaDb.event_ticket.findMany({
            where: { is_deleted: false, created_at: { gte: twelveMonthsAgo } },
            select: { created_at: true, total_price: true },
        });

        // `DATE_TRUNC(period, created_at)` + `TO_CHAR(..., format)`, GROUP
        // BY — no server-side date-bucketing in the model API, bucketed in
        // JS instead (flagged perf tradeoff: fetches every matching ticket
        // row rather than aggregating server-side, same tradeoff already
        // accepted elsewhere in this migration for conditional-SUM-style
        // queries). Buckets the JS `Date` Prisma already returns (itself
        // timezone-compensated to this app's established convention) —
        // may bucket a boundary-adjacent ticket differently than
        // Postgres's own session-timezone-based DATE_TRUNC in rare cases,
        // flagged rather than assumed identical.
        const buckets = new Map<string, { tickets_sold: number; revenue: number }>();
        for (const row of rows) {
            const d = row.created_at ?? new Date();
            let key: string;
            if (period === 'day') {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } else if (period === 'week') {
                // Postgres DATE_TRUNC('week', ...) anchors to Monday (ISO week).
                const dow = (d.getDay() + 6) % 7; // 0=Monday
                const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
                key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
            } else {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }
            const bucket = buckets.get(key) ?? { tickets_sold: 0, revenue: 0 };
            bucket.tickets_sold += 1;
            bucket.revenue += row.total_price;
            buckets.set(key, bucket);
        }

        return Array.from(buckets.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([period_key, v]) => ({ period: period_key, ...v }));
    }

    static async getTopOrganizers(limit: number) {
        const organizers = await prismaDb.event_organizer.findMany({
            where: { is_deleted: false },
            select: { id: true, name: true, email: true },
        });
        const orgIds = organizers.map((o) => o.id);

        // `{in: []}` matches nothing and returns `[]` — no need to special
        // case an empty `orgIds` separately.
        const [eventCounts, tickets] = await Promise.all([
            prismaDb.event.groupBy({ by: ['organizer_id'], where: { organizer_id: { in: orgIds } }, _count: { _all: true } }),
            prismaDb.event_ticket.findMany({
                where: { is_deleted: false, event: { organizer_id: { in: orgIds } } },
                select: { total_price: true, event: { select: { organizer_id: true } } },
            }),
        ]);

        const eventCountByOrg = new Map(eventCounts.map((e) => [e.organizer_id, e._count._all]));
        const ticketStatsByOrg = new Map<number, { count: number; revenue: number }>();
        for (const t of tickets) {
            const oid = t.event.organizer_id;
            const cur = ticketStatsByOrg.get(oid) ?? { count: 0, revenue: 0 };
            cur.count += 1;
            cur.revenue += t.total_price;
            ticketStatsByOrg.set(oid, cur);
        }

        return organizers
            .map((o) => ({
                id: o.id,
                name: o.name,
                email: o.email,
                total_events: eventCountByOrg.get(o.id) ?? 0,
                total_tickets_sold: ticketStatsByOrg.get(o.id)?.count ?? 0,
                total_revenue: ticketStatsByOrg.get(o.id)?.revenue ?? 0,
            }))
            .sort((a, b) => b.total_revenue - a.total_revenue)
            .slice(0, limit);
    }

    static async getTopEvents(limit: number, by: 'tickets' | 'revenue') {
        const events = await prismaDb.event.findMany({
            where: { status: 'published' },
            select: {
                id: true, title: true, code: true, event_date: true, city: true,
                event_organizer: { select: { name: true } },
            },
        });
        const eventIds = events.map((e) => e.id);

        const ticketAgg = await prismaDb.event_ticket.groupBy({
            by: ['event_id'],
            where: { event_id: { in: eventIds }, is_deleted: false },
            _count: { _all: true },
            _sum: { total_price: true },
        });
        const aggByEvent = new Map(ticketAgg.map((a) => [a.event_id, a]));

        const mapped = events.map((e) => ({
            id: e.id,
            title: e.title,
            event_code: e.code,
            event_date: e.event_date,
            city: e.city,
            organizer: e.event_organizer?.name ?? null,
            total_tickets_sold: aggByEvent.get(e.id)?._count._all ?? 0,
            total_revenue: aggByEvent.get(e.id)?._sum.total_price ?? 0,
        }));

        mapped.sort((a, b) => by === 'tickets' ? b.total_tickets_sold - a.total_tickets_sold : b.total_revenue - a.total_revenue);
        return mapped.slice(0, limit);
    }

    static async getRevenueBreakdown() {
        const categories = await prismaDb.event_category.findMany({
            where: { is_active: true },
            select: { id: true, name: true },
        });
        const catIds = categories.map((c) => c.id);

        const [eventCounts, tickets, totalRevenueAgg] = await Promise.all([
            prismaDb.event.groupBy({ by: ['category_id'], where: { category_id: { in: catIds } }, _count: { _all: true } }),
            prismaDb.event_ticket.findMany({
                where: { is_deleted: false, event: { category_id: { in: catIds } } },
                select: { total_price: true, event: { select: { category_id: true } } },
            }),
            prismaDb.event_ticket.aggregate({ where: { is_deleted: false }, _sum: { total_price: true } }),
        ]);

        const eventCountByCat = new Map(eventCounts.map((e) => [e.category_id, e._count._all]));
        const ticketStatsByCat = new Map<number, { count: number; revenue: number }>();
        for (const t of tickets) {
            const cid = t.event.category_id;
            const cur = ticketStatsByCat.get(cid) ?? { count: 0, revenue: 0 };
            cur.count += 1;
            cur.revenue += t.total_price;
            ticketStatsByCat.set(cid, cur);
        }

        const byCategory = categories
            .map((c) => ({
                id: c.id,
                name: c.name,
                events_count: eventCountByCat.get(c.id) ?? 0,
                tickets_sold: ticketStatsByCat.get(c.id)?.count ?? 0,
                revenue: ticketStatsByCat.get(c.id)?.revenue ?? 0,
            }))
            .sort((a, b) => b.revenue - a.revenue);

        return {
            by_category: byCategory,
            by_source: {
                tickets_revenue: totalRevenueAgg._sum.total_price ?? 0,
                design_revenue: 0,
                boost_revenue: 0,
                field_service_revenue: 0,
            },
        };
    }
}

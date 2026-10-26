// Migrated to Prisma's native model API — see BOOKING_MODULE_NOTES.md
// ("Full Prisma relational-API migration", tier 3).
//
// Billetterie opérée par Adigo (TICKETING_MODULE_PLAN_2026-10.md §5.1 E) :
// tous les chiffres de vente ne comptent que l'argent réellement encaissé
// et conservé — billets payés (scannés compris), remboursements déduits.
// Avant, les billets en attente (dont les paiements Orange Money échoués),
// annulés et remboursés gonflaient le revenu, et le « revenu confirmé »
// excluait les billets déjà scannés à l'entrée.
import prismaDb from "../../config/prismaClient";
import { CommissionService } from "../services/commission.service";
import { PAID_TICKET_WHERE, retainedAmount, ticketCommission } from "../utils/ticketing-rules";

function localMidnightDaysAgo(days: number): Date {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return new Date(todayMidnight.getTime() - days * 24 * 60 * 60 * 1000);
}

const moneySelect = {
    total_price: true, payment_status: true, refunded_amount: true, commission_rate: true, commission_amount: true,
    created_at: true,
    event: { select: { organizer_id: true, category_id: true, id: true } },
} as const;

/** Billets qui rapportent quelque chose : payés, ou remboursés partiellement. */
const EARNING_WHERE = { is_deleted: false, payment_status: { in: ['paid', 'refunded'] } };

async function earningTickets(extra: Record<string, unknown> = {}) {
    const rows = await prismaDb.event_ticket.findMany({ where: { ...EARNING_WHERE, ...extra }, select: moneySelect });
    const rates = await CommissionService.ratesForOrganizers(Array.from(new Set(rows.map((r) => r.event.organizer_id))));
    return rows
        .map((r) => {
            const gross = retainedAmount(r);
            return { ...r, gross, commission: ticketCommission(r, rates.get(r.event.organizer_id) ?? 0) };
        })
        .filter((r) => r.gross > 0);
}

export class AdminAnalyticsRepository {

    static async getDashboard() {
        const thirtyDaysAgo = localMidnightDaysAgo(30);
        const sevenDaysAgo = localMidnightDaysAgo(7);
        const todayMidnight = localMidnightDaysAgo(0);
        const liveEvent = { is_deleted: false };

        const [
            totalUsers, activeUsers, newUsers30d,
            totalEvents, publishedEvents, pendingEvents, draftEvents, upcomingEvents,
            paidTickets, confirmedTickets, validatedTickets, earning,
            totalOrganizers, verifiedOrganizers, pendingOrganizers,
            ticketsSold7d, eventsCreated7d, usersRegistered7d,
            pendingCancellations,
        ] = await Promise.all([
            prismaDb.customer.count({ where: { is_deleted: false } }),
            prismaDb.customer.count({ where: { is_deleted: false, is_active: true } }),
            prismaDb.customer.count({ where: { is_deleted: false, created_at: { gte: thirtyDaysAgo } } }),

            prismaDb.event.count({ where: liveEvent }),
            prismaDb.event.count({ where: { ...liveEvent, status: 'published' } }),
            prismaDb.event.count({ where: { ...liveEvent, status: 'pending' } }),
            prismaDb.event.count({ where: { ...liveEvent, status: 'draft' } }),
            prismaDb.event.count({ where: { ...liveEvent, status: 'published', event_date: { gte: todayMidnight } } }),

            prismaDb.event_ticket.count({ where: PAID_TICKET_WHERE }),
            prismaDb.event_ticket.count({ where: { ...PAID_TICKET_WHERE, status: 'confirmed' } }),
            prismaDb.event_ticket.count({ where: { ...PAID_TICKET_WHERE, status: 'used' } }),
            earningTickets(),

            prismaDb.event_organizer.count({ where: { is_deleted: false } }),
            prismaDb.event_organizer.count({ where: { is_deleted: false, verification_status: 'verified' } }),
            prismaDb.event_organizer.count({ where: { is_deleted: false, verification_status: 'pending' } }),

            prismaDb.event_ticket.count({ where: { ...PAID_TICKET_WHERE, created_at: { gte: sevenDaysAgo } } }),
            prismaDb.event.count({ where: { ...liveEvent, created_at: { gte: sevenDaysAgo } } }),
            prismaDb.customer.count({ where: { is_deleted: false, created_at: { gte: sevenDaysAgo } } }),

            prismaDb.event_ticket.count({ where: { is_deleted: false, cancel_request_status: 'requested' } }),
        ]);

        const revenue = earning.reduce((sum, t) => sum + t.gross, 0);
        const commission = earning.reduce((sum, t) => sum + t.commission, 0);

        return {
            users: { total_users: totalUsers, active_users: activeUsers, new_users_last_30_days: newUsers30d },
            events: {
                total_events: totalEvents, published_events: publishedEvents, pending_events: pendingEvents,
                draft_events: draftEvents, upcoming_events: upcomingEvents,
            },
            tickets: {
                total_tickets_sold: paidTickets, confirmed_tickets: confirmedTickets, validated_tickets: validatedTickets,
                // Même valeur pour les deux clés historiques : l'argent réellement encaissé.
                total_revenue: revenue, confirmed_revenue: revenue,
                commission_revenue: commission, organizer_revenue: revenue - commission,
                pending_cancellations: pendingCancellations,
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
        const rows = await earningTickets({ created_at: { gte: twelveMonthsAgo } });

        // Bucketed in JS (no server-side date truncation in the model API).
        const buckets = new Map<string, { tickets_sold: number; revenue: number; commission: number }>();
        for (const row of rows) {
            const d = row.created_at ?? new Date();
            let key: string;
            if (period === 'day') {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } else if (period === 'week') {
                const dow = (d.getDay() + 6) % 7; // 0=Monday (ISO week)
                const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
                key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
            } else {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }
            const bucket = buckets.get(key) ?? { tickets_sold: 0, revenue: 0, commission: 0 };
            bucket.tickets_sold += 1;
            bucket.revenue += row.gross;
            bucket.commission += row.commission;
            buckets.set(key, bucket);
        }

        return Array.from(buckets.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([period_key, v]) => ({ period: period_key, ...v }));
    }

    static async getTopOrganizers(limit: number) {
        const [organizers, rows, eventCounts] = await Promise.all([
            prismaDb.event_organizer.findMany({ where: { is_deleted: false }, select: { id: true, name: true, email: true } }),
            earningTickets(),
            prismaDb.event.groupBy({ by: ['organizer_id'], where: { is_deleted: false }, _count: { _all: true } }),
        ]);
        const eventCountByOrg = new Map(eventCounts.map((e) => [e.organizer_id, e._count._all]));
        const stats = new Map<number, { count: number; revenue: number }>();
        for (const t of rows) {
            const cur = stats.get(t.event.organizer_id) ?? { count: 0, revenue: 0 };
            cur.count += 1;
            cur.revenue += t.gross;
            stats.set(t.event.organizer_id, cur);
        }
        return organizers
            .map((o) => ({
                id: o.id,
                name: o.name,
                email: o.email,
                total_events: eventCountByOrg.get(o.id) ?? 0,
                total_tickets_sold: stats.get(o.id)?.count ?? 0,
                total_revenue: stats.get(o.id)?.revenue ?? 0,
            }))
            .sort((a, b) => b.total_revenue - a.total_revenue)
            .slice(0, limit);
    }

    static async getTopEvents(limit: number, by: 'tickets' | 'revenue') {
        const [events, rows] = await Promise.all([
            prismaDb.event.findMany({
                where: { is_deleted: false, status: { in: ['published', 'completed'] } },
                select: { id: true, title: true, code: true, event_date: true, city: true, event_organizer: { select: { name: true } } },
            }),
            earningTickets(),
        ]);
        const stats = new Map<number, { count: number; revenue: number }>();
        for (const t of rows) {
            const cur = stats.get(t.event.id) ?? { count: 0, revenue: 0 };
            cur.count += 1;
            cur.revenue += t.gross;
            stats.set(t.event.id, cur);
        }
        const mapped = events.map((e) => ({
            id: e.id,
            title: e.title,
            event_code: e.code,
            event_date: e.event_date,
            city: e.city,
            organizer: e.event_organizer?.name ?? null,
            total_tickets_sold: stats.get(e.id)?.count ?? 0,
            total_revenue: stats.get(e.id)?.revenue ?? 0,
        }));
        mapped.sort((a, b) => by === 'tickets' ? b.total_tickets_sold - a.total_tickets_sold : b.total_revenue - a.total_revenue);
        return mapped.slice(0, limit);
    }

    static async getRevenueBreakdown() {
        const [categories, eventCounts, rows] = await Promise.all([
            prismaDb.event_category.findMany({ where: { is_active: true }, select: { id: true, name: true } }),
            prismaDb.event.groupBy({ by: ['category_id'], where: { is_deleted: false }, _count: { _all: true } }),
            earningTickets(),
        ]);
        const eventCountByCat = new Map(eventCounts.map((e) => [e.category_id, e._count._all]));
        const stats = new Map<number, { count: number; revenue: number }>();
        for (const t of rows) {
            const cur = stats.get(t.event.category_id) ?? { count: 0, revenue: 0 };
            cur.count += 1;
            cur.revenue += t.gross;
            stats.set(t.event.category_id, cur);
        }
        const byCategory = categories
            .map((c) => ({
                id: c.id,
                name: c.name,
                events_count: eventCountByCat.get(c.id) ?? 0,
                tickets_sold: stats.get(c.id)?.count ?? 0,
                revenue: stats.get(c.id)?.revenue ?? 0,
            }))
            .sort((a, b) => b.revenue - a.revenue);

        return {
            by_category: byCategory,
            by_source: {
                tickets_revenue: rows.reduce((sum, t) => sum + t.gross, 0),
                commission_revenue: rows.reduce((sum, t) => sum + t.commission, 0),
                design_revenue: 0,
                boost_revenue: 0,
                field_service_revenue: 0,
            },
        };
    }
}

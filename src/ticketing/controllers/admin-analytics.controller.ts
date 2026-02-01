/**
 * Admin Analytics Controller
 *
 * Dashboard KPIs and analytics for admin
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
import pgpDb from '../../config/pgdb';

export class AdminAnalyticsController {

    /**
     * Get global dashboard KPIs
     * GET /v1/api/ticketing/admin/analytics/dashboard
     */
    static async getDashboard(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            // Users stats
            const usersStats = await pgpDb.one(`
                SELECT
                    COUNT(*)::int AS total_users,
                    COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_users,
                    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::int AS new_users_last_30_days
                FROM customer
                WHERE is_deleted = FALSE
            `);

            // Events stats
            const eventsStats = await pgpDb.one(`
                SELECT
                    COUNT(*)::int AS total_events,
                    COUNT(*) FILTER (WHERE status = 'published')::int AS published_events,
                    COUNT(*) FILTER (WHERE status = 'pending_validation')::int AS pending_events,
                    COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_events,
                    COUNT(*) FILTER (WHERE event_date >= CURRENT_DATE)::int AS upcoming_events
                FROM event
            `);

            // Tickets stats
            const ticketsStats = await pgpDb.one(`
                SELECT
                    COUNT(*)::int AS total_tickets_sold,
                    COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed_tickets,
                    COUNT(*) FILTER (WHERE status = 'used')::int AS validated_tickets,
                    COALESCE(SUM(total_price), 0)::int AS total_revenue,
                    COALESCE(SUM(total_price) FILTER (WHERE status = 'confirmed'), 0)::int AS confirmed_revenue
                FROM event_ticket
                WHERE is_deleted = FALSE
            `);

            // Organizers stats
            const organizersStats = await pgpDb.one(`
                SELECT
                    COUNT(*)::int AS total_organizers,
                    COUNT(*) FILTER (WHERE verification_status = 'verified')::int AS verified_organizers,
                    COUNT(*) FILTER (WHERE verification_status = 'pending')::int AS pending_organizers
                FROM event_organizer
                WHERE is_deleted = FALSE
            `);

            // Premium services stats (not yet implemented in schema)
            const premiumStats = {
                events_with_design: 0,
                events_with_boost: 0,
                total_design_revenue: 0,
                total_boost_revenue: 0
            };

            // Recent activity (last 7 days)
            const recentActivity = await pgpDb.one(`
                SELECT
                    COUNT(DISTINCT et.id)::int AS tickets_sold_7d,
                    COUNT(DISTINCT e.id)::int AS events_created_7d,
                    COUNT(DISTINCT c.id)::int AS users_registered_7d
                FROM event_ticket et
                FULL OUTER JOIN event e ON e.created_at >= CURRENT_DATE - INTERVAL '7 days'
                FULL OUTER JOIN customer c ON c.created_at >= CURRENT_DATE - INTERVAL '7 days' AND c.is_deleted = FALSE
                WHERE et.created_at >= CURRENT_DATE - INTERVAL '7 days' AND et.is_deleted = FALSE
            `);

            res.status(200).json({
                status: true,
                message: I18n.t('dashboard_retrieved', lang),
                body: {
                    users: usersStats,
                    events: eventsStats,
                    tickets: ticketsStats,
                    organizers: organizersStats,
                    premium_services: premiumStats,
                    recent_activity: recentActivity
                },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getDashboard:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get sales trends
     * GET /v1/api/ticketing/admin/analytics/sales-trends
     */
    static async getSalesTrends(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { period = 'month' } = req.query;

            let groupBy = '';
            let dateFormat = '';

            switch (period) {
                case 'day':
                    groupBy = "DATE_TRUNC('day', created_at)";
                    dateFormat = 'YYYY-MM-DD';
                    break;
                case 'week':
                    groupBy = "DATE_TRUNC('week', created_at)";
                    dateFormat = 'YYYY-MM-DD';
                    break;
                case 'month':
                default:
                    groupBy = "DATE_TRUNC('month', created_at)";
                    dateFormat = 'YYYY-MM';
                    break;
            }

            const trends = await pgpDb.any(`
                SELECT
                    TO_CHAR(${groupBy}, '${dateFormat}') AS period,
                    COUNT(*)::int AS tickets_sold,
                    COALESCE(SUM(total_price), 0)::int AS revenue
                FROM event_ticket
                WHERE is_deleted = FALSE
                AND created_at >= CURRENT_DATE - INTERVAL '12 months'
                GROUP BY ${groupBy}
                ORDER BY ${groupBy} ASC
            `);

            res.status(200).json({
                status: true,
                message: I18n.t('trends_retrieved', lang),
                body: { trends },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getSalesTrends:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get top organizers
     * GET /v1/api/ticketing/admin/analytics/top-organizers
     */
    static async getTopOrganizers(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { limit = 10 } = req.query;

            const topOrganizers = await pgpDb.any(`
                SELECT
                    eo.id,
                    eo.name,
                    eo.email,
                    COUNT(DISTINCT e.id)::int AS total_events,
                    COUNT(DISTINCT et.id)::int AS total_tickets_sold,
                    COALESCE(SUM(et.total_price), 0)::int AS total_revenue
                FROM event_organizer eo
                LEFT JOIN event e ON eo.id = e.organizer_id
                LEFT JOIN event_ticket et ON e.id = et.event_id AND et.is_deleted = FALSE
                WHERE eo.is_deleted = FALSE
                GROUP BY eo.id, eo.name, eo.email
                ORDER BY total_revenue DESC
                LIMIT $1
            `, [parseInt(limit as string)]);

            res.status(200).json({
                status: true,
                message: I18n.t('top_organizers_retrieved', lang),
                body: { organizers: topOrganizers },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getTopOrganizers:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get top events
     * GET /v1/api/ticketing/admin/analytics/top-events
     */
    static async getTopEvents(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { limit = 10, by = 'revenue' } = req.query;

            const orderBy = by === 'tickets' ? 'total_tickets_sold' : 'total_revenue';

            const topEvents = await pgpDb.any(`
                SELECT
                    e.id,
                    e.title,
                    e.code AS event_code,
                    e.event_date,
                    e.city,
                    eo.name AS organizer,
                    COUNT(et.id)::int AS total_tickets_sold,
                    COALESCE(SUM(et.total_price), 0)::int AS total_revenue
                FROM event e
                LEFT JOIN event_organizer eo ON e.organizer_id = eo.id
                LEFT JOIN event_ticket et ON e.id = et.event_id AND et.is_deleted = FALSE
                WHERE e.status = 'published'
                GROUP BY e.id, e.title, e.code, e.event_date, e.city, eo.name
                ORDER BY ${orderBy} DESC
                LIMIT $1
            `, [parseInt(limit as string)]);

            res.status(200).json({
                status: true,
                message: I18n.t('top_events_retrieved', lang),
                body: { events: topEvents },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getTopEvents:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get revenue breakdown
     * GET /v1/api/ticketing/admin/analytics/revenue-breakdown
     */
    static async getRevenueBreakdown(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            // Revenue by category
            const byCategory = await pgpDb.any(`
                SELECT
                    ec.id,
                    ec.name,
                    COUNT(DISTINCT e.id)::int AS events_count,
                    COUNT(et.id)::int AS tickets_sold,
                    COALESCE(SUM(et.total_price), 0)::int AS revenue
                FROM event_category ec
                LEFT JOIN event e ON ec.id = e.category_id
                LEFT JOIN event_ticket et ON e.id = et.event_id AND et.is_deleted = FALSE
                WHERE ec.is_deleted = FALSE
                GROUP BY ec.id, ec.name
                ORDER BY revenue DESC
            `);

            // Revenue by source
            const bySource = await pgpDb.one(`
                SELECT
                    COALESCE(SUM(et.total_price), 0)::int AS tickets_revenue,
                    0::int AS design_revenue,
                    0::int AS boost_revenue,
                    0::int AS field_service_revenue
                FROM event_ticket et
                WHERE et.is_deleted = FALSE
            `);

            res.status(200).json({
                status: true,
                message: I18n.t('revenue_breakdown_retrieved', lang),
                body: {
                    by_category: byCategory,
                    by_source: bySource
                },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getRevenueBreakdown:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}

/**
 * Organizer Dashboard Controller
 *
 * Statistics and reporting for event organizers
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
import pgpDb from '../../config/pgdb';

export class OrganizerDashboardController {

    /**
     * Get organizer statistics
     * GET /v1/api/ticketing/organizer/:id/stats
     */
    static async getStats(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const organizerId = parseInt((req.params as { id: string }).id);

            // Overall stats
            const stats = await pgpDb.one(`
                SELECT
                    COUNT(*)::int AS total_events,
                    COUNT(*) FILTER (WHERE status = 'published')::int AS published_events,
                    COUNT(*) FILTER (WHERE status = 'draft')::int AS draft_events,
                    COUNT(*) FILTER (WHERE status = 'pending_validation')::int AS pending_events,
                    COALESCE(SUM(total_tickets), 0)::int AS total_capacity,
                    COALESCE(SUM(sold_tickets), 0)::int AS total_sold,
                    COALESCE(SUM(available_tickets), 0)::int AS total_available
                FROM event
                WHERE organizer_id = $1
                AND is_deleted = FALSE
            `, [organizerId]);

            // Revenue calculation (tickets sold * prices)
            const revenue = await pgpDb.one(`
                SELECT
                    COALESCE(SUM(t.total_price), 0)::int AS total_revenue,
                    COALESCE(SUM(t.total_price) FILTER (WHERE t.status = 'confirmed'), 0)::int AS confirmed_revenue,
                    COUNT(t.id)::int AS total_tickets_sold,
                    COUNT(t.id) FILTER (WHERE t.is_validated = TRUE)::int AS validated_tickets
                FROM event_ticket t
                JOIN event e ON t.event_id = e.id
                WHERE e.organizer_id = $1
                AND t.is_deleted = FALSE
            `, [organizerId]);

            // Premium services usage
            const premiumServices = await pgpDb.one(`
                SELECT
                    COUNT(*) FILTER (WHERE has_premium_design = TRUE)::int AS events_with_design,
                    COUNT(*) FILTER (WHERE boost_visibility = TRUE)::int AS events_with_boost,
                    COUNT(*) FILTER (WHERE field_service = TRUE)::int AS events_with_field_service,
                    COALESCE(SUM(premium_design_amount), 0)::int AS total_design_cost,
                    COALESCE(SUM(boost_amount), 0)::int AS total_boost_cost,
                    COALESCE(SUM(field_service_amount), 0)::int AS total_field_service_cost
                FROM event
                WHERE organizer_id = $1
                AND is_deleted = FALSE
            `, [organizerId]);

            res.status(200).json({
                status: true,
                message: I18n.t('stats_retrieved', lang),
                body: {
                    ...stats,
                    ...revenue,
                    premium_services: premiumServices,
                    occupancy_rate: stats.total_capacity > 0
                        ? Math.round((stats.total_sold / stats.total_capacity) * 100)
                        : 0
                },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getStats:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get sales history
     * GET /v1/api/ticketing/organizer/:id/sales
     */
    static async getSales(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const organizerId = parseInt((req.params as { id: string }).id);

            const sales = await pgpDb.any(`
                SELECT
                    t.*,
                    json_build_object(
                        'id', e.id,
                        'title', e.title,
                        'event_code', e.code,
                        'event_date', e.event_date
                    ) AS event,
                    json_build_object(
                        'id', tt.id,
                        'name', tt.name
                    ) AS ticket_type,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'email', c.email
                    ) AS customer
                FROM event_ticket t
                JOIN event e ON t.event_id = e.id
                LEFT JOIN event_ticket_type tt ON t.ticket_type_id = tt.id
                LEFT JOIN customer c ON t.customer_id = c.id
                WHERE e.organizer_id = $1
                AND t.is_deleted = FALSE
                ORDER BY t.created_at DESC
            `, [organizerId]);

            res.status(200).json({
                status: true,
                message: I18n.t('sales_retrieved', lang),
                body: { sales, total: sales.length },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getSales:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get validated tickets
     * GET /v1/api/ticketing/organizer/:id/validated-tickets
     */
    static async getValidatedTickets(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const organizerId = parseInt((req.params as { id: string }).id);
            const eventId = req.query.event_id ? parseInt(req.query.event_id as string) : null;

            let query = `
                SELECT
                    t.*,
                    json_build_object(
                        'id', e.id,
                        'title', e.title,
                        'event_date', e.event_date
                    ) AS event,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name
                    ) AS customer
                FROM event_ticket t
                JOIN event e ON t.event_id = e.id
                LEFT JOIN customer c ON t.customer_id = c.id
                WHERE e.organizer_id = $1
                AND t.is_validated = TRUE
                AND t.is_deleted = FALSE
            `;

            const params: any[] = [organizerId];

            if (eventId) {
                query += ` AND t.event_id = $2`;
                params.push(eventId);
            }

            query += ` ORDER BY t.validated_at DESC`;

            const tickets = await pgpDb.any(query, params);

            res.status(200).json({
                status: true,
                message: I18n.t('tickets_retrieved', lang),
                body: { tickets, total: tickets.length },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getValidatedTickets:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get revenue details
     * GET /v1/api/ticketing/organizer/:id/revenue
     */
    static async getRevenue(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const organizerId = parseInt((req.params as { id: string }).id);

            // Revenue by event
            const revenueByEvent = await pgpDb.any(`
                SELECT
                    e.id,
                    e.title,
                    e.event_code,
                    e.event_date,
                    COUNT(t.id)::int AS tickets_sold,
                    COALESCE(SUM(t.total_price), 0)::int AS total_revenue,
                    COALESCE(SUM(t.total_price) FILTER (WHERE t.is_validated = TRUE), 0)::int AS validated_revenue
                FROM event e
                LEFT JOIN event_ticket t ON e.id = t.event_id AND t.is_deleted = FALSE
                WHERE e.organizer_id = $1
                AND e.is_deleted = FALSE
                GROUP BY e.id, e.title, e.event_code, e.event_date
                ORDER BY e.event_date DESC
            `, [organizerId]);

            // Commission calculation (if any)
            // TODO: Calculate ADIGO commission

            res.status(200).json({
                status: true,
                message: I18n.t('revenue_retrieved', lang),
                body: { revenue_by_event: revenueByEvent },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getRevenue:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}

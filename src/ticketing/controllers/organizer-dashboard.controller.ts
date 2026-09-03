/**
 * Organizer Dashboard Controller
 *
 * Statistics and reporting for event organizers
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
// Migrated to Prisma's native model API — logic lives in
// OrganizerDashboardRepository, see BOOKING_MODULE_NOTES.md ("Full Prisma
// relational-API migration", tier 3).
import { OrganizerDashboardRepository } from '../repositories/organizer-dashboard.repository';

export class OrganizerDashboardController {

    /**
     * Get organizer statistics
     * GET /v1/api/ticketing/organizer/:id/stats
     */
    static async getStats(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const organizerId = parseInt((req.params as { id: string }).id);

            const stats = await OrganizerDashboardRepository.getStats(organizerId);

            res.status(200).json({
                status: true,
                message: I18n.t('stats_retrieved', lang),
                body: stats,
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

            const sales = await OrganizerDashboardRepository.getSales(organizerId);

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
            const eventId = req.query.event_id ? parseInt(req.query.event_id as string) : undefined;

            const tickets = await OrganizerDashboardRepository.getValidatedTickets(organizerId, eventId);

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

            const revenueByEvent = await OrganizerDashboardRepository.getRevenue(organizerId);

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

/**
 * Admin Analytics Controller
 *
 * Dashboard KPIs and analytics for admin
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
// Migrated to Prisma's native model API — logic lives in
// AdminAnalyticsRepository, see BOOKING_MODULE_NOTES.md ("Full Prisma
// relational-API migration", tier 3).
import { AdminAnalyticsRepository } from '../repositories/admin-analytics.repository';

export class AdminAnalyticsController {

    /**
     * Get global dashboard KPIs
     * GET /v1/api/ticketing/admin/analytics/dashboard
     */
    static async getDashboard(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            const dashboard = await AdminAnalyticsRepository.getDashboard();

            res.status(200).json({
                status: true,
                message: I18n.t('dashboard_retrieved', lang),
                body: dashboard,
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
            const normalizedPeriod = (period === 'day' || period === 'week') ? period : 'month';

            const trends = await AdminAnalyticsRepository.getSalesTrends(normalizedPeriod);

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

            const topOrganizers = await AdminAnalyticsRepository.getTopOrganizers(parseInt(limit as string));

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
            const normalizedBy = by === 'tickets' ? 'tickets' : 'revenue';

            const topEvents = await AdminAnalyticsRepository.getTopEvents(parseInt(limit as string), normalizedBy);

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

            const breakdown = await AdminAnalyticsRepository.getRevenueBreakdown();

            res.status(200).json({
                status: true,
                message: I18n.t('revenue_breakdown_retrieved', lang),
                body: breakdown,
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

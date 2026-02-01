/**
 * Admin Analytics Controller
 *
 * Dashboard KPIs and analytics for admin
 */
import { Request, Response } from 'express';
export declare class AdminAnalyticsController {
    /**
     * Get global dashboard KPIs
     * GET /v1/api/ticketing/admin/analytics/dashboard
     */
    static getDashboard(req: Request, res: Response): Promise<void>;
    /**
     * Get sales trends
     * GET /v1/api/ticketing/admin/analytics/sales-trends
     */
    static getSalesTrends(req: Request, res: Response): Promise<void>;
    /**
     * Get top organizers
     * GET /v1/api/ticketing/admin/analytics/top-organizers
     */
    static getTopOrganizers(req: Request, res: Response): Promise<void>;
    /**
     * Get top events
     * GET /v1/api/ticketing/admin/analytics/top-events
     */
    static getTopEvents(req: Request, res: Response): Promise<void>;
    /**
     * Get revenue breakdown
     * GET /v1/api/ticketing/admin/analytics/revenue-breakdown
     */
    static getRevenueBreakdown(req: Request, res: Response): Promise<void>;
}

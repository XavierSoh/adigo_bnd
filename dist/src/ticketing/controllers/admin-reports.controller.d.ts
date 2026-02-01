/**
 * Admin Reports Controller
 *
 * Generate and export reports in Excel/CSV format
 */
import { Request, Response } from 'express';
export declare class AdminReportsController {
    /**
     * Export users to Excel
     * GET /v1/api/ticketing/admin/reports/users/export
     */
    static exportUsers(req: Request, res: Response): Promise<void>;
    /**
     * Export events to Excel
     * GET /v1/api/ticketing/admin/reports/events/export
     */
    static exportEvents(req: Request, res: Response): Promise<void>;
    /**
     * Export tickets to Excel
     * GET /v1/api/ticketing/admin/reports/tickets/export
     */
    static exportTickets(req: Request, res: Response): Promise<void>;
    /**
     * Export transactions to Excel
     * GET /v1/api/ticketing/admin/reports/transactions/export
     */
    static exportTransactions(req: Request, res: Response): Promise<void>;
    /**
     * Generate revenue report
     * GET /v1/api/ticketing/admin/reports/revenue
     */
    static getRevenueReport(req: Request, res: Response): Promise<void>;
}

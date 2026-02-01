/**
 * Organizer Dashboard Controller
 *
 * Statistics and reporting for event organizers
 */
import { Request, Response } from 'express';
export declare class OrganizerDashboardController {
    /**
     * Get organizer statistics
     * GET /v1/api/ticketing/organizer/:id/stats
     */
    static getStats(req: Request, res: Response): Promise<void>;
    /**
     * Get sales history
     * GET /v1/api/ticketing/organizer/:id/sales
     */
    static getSales(req: Request, res: Response): Promise<void>;
    /**
     * Get validated tickets
     * GET /v1/api/ticketing/organizer/:id/validated-tickets
     */
    static getValidatedTickets(req: Request, res: Response): Promise<void>;
    /**
     * Get revenue details
     * GET /v1/api/ticketing/organizer/:id/revenue
     */
    static getRevenue(req: Request, res: Response): Promise<void>;
}

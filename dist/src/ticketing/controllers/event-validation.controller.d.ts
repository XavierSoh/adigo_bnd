/**
 * Event Validation Controller (Admin ADIGO)
 *
 * Handles event and organizer validation by ADIGO admins
 */
import { Request, Response } from 'express';
export declare class EventValidationController {
    /**
     * Get pending events for validation
     * GET /v1/api/ticketing/admin/events/pending
     */
    static getPendingEvents(req: Request, res: Response): Promise<void>;
    /**
     * Approve event
     * POST /v1/api/ticketing/admin/events/:id/approve
     */
    static approveEvent(req: Request, res: Response): Promise<void>;
    /**
     * Reject event
     * POST /v1/api/ticketing/admin/events/:id/reject
     */
    static rejectEvent(req: Request, res: Response): Promise<void>;
    /**
     * Get pending organizers for verification
     * GET /v1/api/ticketing/admin/organizers/pending
     */
    static getPendingOrganizers(req: Request, res: Response): Promise<void>;
    /**
     * Verify organizer
     * POST /v1/api/ticketing/admin/organizers/:id/verify
     */
    static verifyOrganizer(req: Request, res: Response): Promise<void>;
    /**
     * Get all events with stats (admin dashboard)
     * GET /v1/api/ticketing/admin/events/stats
     */
    static getEventsStats(req: Request, res: Response): Promise<void>;
}

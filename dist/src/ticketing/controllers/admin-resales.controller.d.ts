/**
 * Admin Resales Controller
 *
 * Moderation of ticket resale marketplace
 */
import { Request, Response } from 'express';
export declare class AdminResalesController {
    /**
     * Get all resales
     * GET /v1/api/ticketing/admin/resales
     */
    static getAllResales(req: Request, res: Response): Promise<void>;
    /**
     * Get resale statistics
     * GET /v1/api/ticketing/admin/resales/stats
     */
    static getResaleStats(req: Request, res: Response): Promise<void>;
    /**
     * Approve a resale
     * POST /v1/api/ticketing/admin/resales/:id/approve
     */
    static approveResale(req: Request, res: Response): Promise<void>;
    /**
     * Reject/Cancel a resale (fraudulent)
     * POST /v1/api/ticketing/admin/resales/:id/reject
     */
    static rejectResale(req: Request, res: Response): Promise<void>;
    /**
     * Delete a resale (soft delete)
     * DELETE /v1/api/ticketing/admin/resales/:id
     */
    static deleteResale(req: Request, res: Response): Promise<void>;
}

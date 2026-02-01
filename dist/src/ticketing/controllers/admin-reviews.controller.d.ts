/**
 * Admin Reviews Controller
 *
 * Moderation of event reviews
 */
import { Request, Response } from 'express';
export declare class AdminReviewsController {
    /**
     * Get all reviews
     * GET /v1/api/ticketing/admin/reviews
     */
    static getAllReviews(req: Request, res: Response): Promise<void>;
    /**
     * Get flagged/reported reviews
     * GET /v1/api/ticketing/admin/reviews/flagged
     */
    static getFlaggedReviews(req: Request, res: Response): Promise<void>;
    /**
     * Flag a review as inappropriate
     * POST /v1/api/ticketing/admin/reviews/:id/flag
     */
    static flagReview(req: Request, res: Response): Promise<void>;
    /**
     * Unflag a review
     * POST /v1/api/ticketing/admin/reviews/:id/unflag
     */
    static unflagReview(req: Request, res: Response): Promise<void>;
    /**
     * Delete a review (soft delete)
     * DELETE /v1/api/ticketing/admin/reviews/:id
     */
    static deleteReview(req: Request, res: Response): Promise<void>;
    /**
     * Get review statistics
     * GET /v1/api/ticketing/admin/reviews/stats
     */
    static getReviewStats(req: Request, res: Response): Promise<void>;
}

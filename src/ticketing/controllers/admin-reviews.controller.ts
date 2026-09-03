/**
 * Admin Reviews Controller
 *
 * Moderation of event reviews
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
// Migrated to Prisma's native model API — logic lives in
// AdminReviewsRepository (prisma.event_review.*), see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 3).
import { AdminReviewsRepository } from '../repositories/admin-reviews.repository';

export class AdminReviewsController {

    /**
     * Get all reviews
     * GET /v1/api/ticketing/admin/reviews
     */
    static async getAllReviews(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { limit = 50, offset = 0, event_id, rating } = req.query;

            const { reviews, total } = await AdminReviewsRepository.findAll(
                parseInt(limit as string),
                parseInt(offset as string),
                event_id ? parseInt(event_id as string) : undefined,
                rating ? parseInt(rating as string) : undefined
            );

            res.status(200).json({
                status: true,
                message: I18n.t('reviews_retrieved', lang),
                body: {
                    reviews,
                    pagination: {
                        total,
                        limit: parseInt(limit as string),
                        offset: parseInt(offset as string),
                        has_more: parseInt(offset as string) + parseInt(limit as string) < total
                    }
                },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getAllReviews:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get flagged/reported reviews
     * GET /v1/api/ticketing/admin/reviews/flagged
     */
    static async getFlaggedReviews(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            const reviews = await AdminReviewsRepository.findFlagged();

            res.status(200).json({
                status: true,
                message: I18n.t('flagged_reviews_retrieved', lang),
                body: { reviews, total: reviews.length },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getFlaggedReviews:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Flag a review as inappropriate
     * POST /v1/api/ticketing/admin/reviews/:id/flag
     */
    static async flagReview(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const reviewId = parseInt((req.params as { id: string }).id);
            const { reason } = req.body;
            const adminId = req.userId;

            const updatedReview = await AdminReviewsRepository.flag(reviewId, reason || 'Inappropriate content', adminId);

            res.status(200).json({
                status: true,
                message: I18n.t('review_flagged', lang),
                body: updatedReview,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in flagReview:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Unflag a review
     * POST /v1/api/ticketing/admin/reviews/:id/unflag
     */
    static async unflagReview(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const reviewId = parseInt((req.params as { id: string }).id);

            const updatedReview = await AdminReviewsRepository.unflag(reviewId);

            res.status(200).json({
                status: true,
                message: I18n.t('review_unflagged', lang),
                body: updatedReview,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in unflagReview:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Delete a review (soft delete)
     * DELETE /v1/api/ticketing/admin/reviews/:id
     */
    static async deleteReview(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const reviewId = parseInt((req.params as { id: string }).id);
            const adminId = req.userId;

            const deletedReview = await AdminReviewsRepository.softDelete(reviewId, adminId);

            res.status(200).json({
                status: true,
                message: I18n.t('review_deleted', lang),
                body: deletedReview,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in deleteReview:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get review statistics
     * GET /v1/api/ticketing/admin/reviews/stats
     */
    static async getReviewStats(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            const stats = await AdminReviewsRepository.getStats();

            res.status(200).json({
                status: true,
                message: I18n.t('stats_retrieved', lang),
                body: stats,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getReviewStats:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}

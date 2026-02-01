/**
 * Admin Reviews Controller
 *
 * Moderation of event reviews
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
import pgpDb from '../../config/pgdb';

export class AdminReviewsController {

    /**
     * Get all reviews
     * GET /v1/api/ticketing/admin/reviews
     */
    static async getAllReviews(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { limit = 50, offset = 0, event_id, rating } = req.query;

            let query = `
                SELECT
                    er.*,
                    json_build_object(
                        'id', e.id,
                        'title', e.title,
                        'event_code', e.event_code
                    ) AS event,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'email', c.email
                    ) AS customer
                FROM event_review er
                JOIN event e ON er.event_id = e.id
                JOIN customer c ON er.customer_id = c.id
                WHERE er.is_deleted = FALSE
            `;

            const params: any[] = [];

            if (event_id) {
                params.push(event_id);
                query += ` AND er.event_id = $${params.length}`;
            }

            if (rating) {
                params.push(rating);
                query += ` AND er.rating = $${params.length}`;
            }

            query += ` ORDER BY er.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit as string), parseInt(offset as string));

            const reviews = await pgpDb.any(query, params);

            // Get total count
            let countQuery = `SELECT COUNT(*)::int AS total FROM event_review WHERE is_deleted = FALSE`;
            const countParams: any[] = [];

            if (event_id) {
                countParams.push(event_id);
                countQuery += ` AND event_id = $${countParams.length}`;
            }
            if (rating) {
                countParams.push(rating);
                countQuery += ` AND rating = $${countParams.length}`;
            }

            const { total } = await pgpDb.one(countQuery, countParams);

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

            const reviews = await pgpDb.any(`
                SELECT
                    er.*,
                    json_build_object(
                        'id', e.id,
                        'title', e.title
                    ) AS event,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name
                    ) AS customer
                FROM event_review er
                JOIN event e ON er.event_id = e.id
                JOIN customer c ON er.customer_id = c.id
                WHERE er.is_deleted = FALSE
                AND er.is_flagged = TRUE
                ORDER BY er.created_at DESC
            `);

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

            const updatedReview = await pgpDb.one(`
                UPDATE event_review
                SET is_flagged = TRUE, flag_reason = $2, flagged_by = $3, flagged_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `, [reviewId, reason || 'Inappropriate content', adminId]);

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

            const updatedReview = await pgpDb.one(`
                UPDATE event_review
                SET is_flagged = FALSE, flag_reason = NULL, flagged_by = NULL, flagged_at = NULL
                WHERE id = $1
                RETURNING *
            `, [reviewId]);

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
            const { reason } = req.body;
            const adminId = req.userId;

            const deletedReview = await pgpDb.one(`
                UPDATE event_review
                SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2, deletion_reason = $3
                WHERE id = $1
                RETURNING *
            `, [reviewId, adminId, reason || 'Deleted by admin']);

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

            const stats = await pgpDb.one(`
                SELECT
                    COUNT(*)::int AS total_reviews,
                    COUNT(*) FILTER (WHERE is_flagged = TRUE)::int AS flagged_reviews,
                    ROUND(AVG(rating), 2) AS average_rating,
                    COUNT(*) FILTER (WHERE rating = 5)::int AS five_star,
                    COUNT(*) FILTER (WHERE rating = 4)::int AS four_star,
                    COUNT(*) FILTER (WHERE rating = 3)::int AS three_star,
                    COUNT(*) FILTER (WHERE rating = 2)::int AS two_star,
                    COUNT(*) FILTER (WHERE rating = 1)::int AS one_star,
                    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::int AS reviews_last_7_days
                FROM event_review
                WHERE is_deleted = FALSE
            `);

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

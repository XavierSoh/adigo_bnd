"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventReviewController = void 0;
const event_review_repository_1 = require("../repositories/event-review.repository");
const i18n_1 = require("../../utils/i18n");
class EventReviewController {
    // Create review
    static async create(req, res) {
        try {
            const lang = req.lang || 'en';
            const review = req.body;
            // Validate required fields
            if (!review.event_id || !review.customer_id || !review.rating) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }
            // Validate rating range
            if (review.rating < 1 || review.rating > 5) {
                res.status(400).json({
                    status: false,
                    message: 'Rating must be between 1 and 5',
                    code: 400
                });
                return;
            }
            const result = await event_review_repository_1.EventReviewRepository.create(review);
            if (result.status) {
                result.message = i18n_1.I18n.t('review_created', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.create:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get by ID
    static async getById(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_review_repository_1.EventReviewRepository.findById(id);
            if (!result.status) {
                result.message = i18n_1.I18n.t('review_not_found', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.getById:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get reviews by event
    static async getByEvent(req, res) {
        try {
            const lang = req.lang || 'en';
            const eventId = parseInt(req.params.eventId);
            const approvedOnly = req.query.approved_only !== 'false'; // Default true
            if (isNaN(eventId)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_review_repository_1.EventReviewRepository.findByEvent(eventId, approvedOnly);
            if (result.status) {
                result.message = i18n_1.I18n.t('event_reviews_retrieved', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.getByEvent:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get reviews by customer
    static async getByCustomer(req, res) {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt(req.params.customerId);
            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_review_repository_1.EventReviewRepository.findByCustomer(customerId);
            if (result.status) {
                result.message = i18n_1.I18n.t('customer_reviews_retrieved', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.getByCustomer:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Update review
    static async update(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const review = req.body;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            // Validate rating if provided
            if (review.rating !== undefined && (review.rating < 1 || review.rating > 5)) {
                res.status(400).json({
                    status: false,
                    message: 'Rating must be between 1 and 5',
                    code: 400
                });
                return;
            }
            const result = await event_review_repository_1.EventReviewRepository.update(id, review);
            if (result.status) {
                result.message = i18n_1.I18n.t('review_updated', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.update:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Approve review (admin only)
    static async approve(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_review_repository_1.EventReviewRepository.approve(id);
            if (result.status) {
                result.message = i18n_1.I18n.t('review_approved', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.approve:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Flag review
    static async flag(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const { flag_reason } = req.body;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            if (!flag_reason) {
                res.status(400).json({
                    status: false,
                    message: 'Flag reason is required',
                    code: 400
                });
                return;
            }
            const result = await event_review_repository_1.EventReviewRepository.flag(id, flag_reason);
            if (result.status) {
                result.message = i18n_1.I18n.t('review_flagged', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.flag:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Unflag review (admin only)
    static async unflag(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_review_repository_1.EventReviewRepository.unflag(id);
            if (result.status) {
                result.message = i18n_1.I18n.t('review_unflagged', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.unflag:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get statistics by event
    static async getStatisticsByEvent(req, res) {
        try {
            const lang = req.lang || 'en';
            const eventId = parseInt(req.params.eventId);
            if (isNaN(eventId)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_review_repository_1.EventReviewRepository.getStatisticsByEvent(eventId);
            if (result.status) {
                result.message = i18n_1.I18n.t('review_statistics_retrieved', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.getStatisticsByEvent:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get top-rated events
    static async getTopRated(req, res) {
        try {
            const lang = req.lang || 'en';
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            const minReviews = req.query.min_reviews ? parseInt(req.query.min_reviews) : 3;
            if (isNaN(limit) || limit < 1) {
                res.status(400).json({
                    status: false,
                    message: 'Invalid limit parameter',
                    code: 400
                });
                return;
            }
            if (isNaN(minReviews) || minReviews < 1) {
                res.status(400).json({
                    status: false,
                    message: 'Invalid min_reviews parameter',
                    code: 400
                });
                return;
            }
            const result = await event_review_repository_1.EventReviewRepository.getTopRated(limit, minReviews);
            if (result.status) {
                result.message = i18n_1.I18n.t('top_rated_events_retrieved', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.getTopRated:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get pending reviews (admin only - moderation)
    static async getPending(req, res) {
        try {
            const lang = req.lang || 'en';
            const result = await event_review_repository_1.EventReviewRepository.getPending();
            if (result.status) {
                result.message = i18n_1.I18n.t('pending_reviews_retrieved', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.getPending:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get flagged reviews (admin only - moderation)
    static async getFlagged(req, res) {
        try {
            const lang = req.lang || 'en';
            const result = await event_review_repository_1.EventReviewRepository.getFlagged();
            if (result.status) {
                result.message = i18n_1.I18n.t('flagged_reviews_retrieved', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.getFlagged:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Soft delete review
    static async softDelete(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const deleted_by = req.userId; // From auth middleware
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_review_repository_1.EventReviewRepository.softDelete(id, deleted_by);
            if (result.status) {
                result.message = i18n_1.I18n.t('review_deleted', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.softDelete:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Restore review
    static async restore(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_review_repository_1.EventReviewRepository.restore(id);
            if (result.status) {
                result.message = i18n_1.I18n.t('review_restored', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.restore:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Hard delete review (admin only)
    static async delete(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_review_repository_1.EventReviewRepository.delete(id);
            if (result.status) {
                result.message = i18n_1.I18n.t('review_deleted_permanently', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventReviewController.delete:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
exports.EventReviewController = EventReviewController;

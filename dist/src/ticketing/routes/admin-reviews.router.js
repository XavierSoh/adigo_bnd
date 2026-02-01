"use strict";
/**
 * Admin Reviews Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_reviews_controller_1 = require("../controllers/admin-reviews.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_role_middleware_1 = require("../../middleware/admin-role.middleware");
const router = (0, express_1.Router)();
// All routes require authentication + admin role
router.use(auth_middleware_1.authMiddleware, admin_role_middleware_1.adminRoleMiddleware);
// Review moderation
router.get('/', admin_reviews_controller_1.AdminReviewsController.getAllReviews);
router.get('/flagged', admin_reviews_controller_1.AdminReviewsController.getFlaggedReviews);
router.get('/stats', admin_reviews_controller_1.AdminReviewsController.getReviewStats);
router.post('/:id/flag', admin_reviews_controller_1.AdminReviewsController.flagReview);
router.post('/:id/unflag', admin_reviews_controller_1.AdminReviewsController.unflagReview);
router.delete('/:id', admin_reviews_controller_1.AdminReviewsController.deleteReview);
exports.default = router;

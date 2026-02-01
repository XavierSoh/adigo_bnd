/**
 * Admin Reviews Routes
 */

import { Router } from 'express';
import { AdminReviewsController } from '../controllers/admin-reviews.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminRoleMiddleware } from '../../middleware/admin-role.middleware';

const router = Router();

// All routes require authentication + admin role
router.use(authMiddleware, adminRoleMiddleware);

// Review moderation
router.get('/', AdminReviewsController.getAllReviews);
router.get('/flagged', AdminReviewsController.getFlaggedReviews);
router.get('/stats', AdminReviewsController.getReviewStats);
router.post('/:id/flag', AdminReviewsController.flagReview);
router.post('/:id/unflag', AdminReviewsController.unflagReview);
router.delete('/:id', AdminReviewsController.deleteReview);

export default router;

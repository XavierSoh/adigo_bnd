/**
 * Admin Analytics Routes
 */

import { Router } from 'express';
import { AdminAnalyticsController } from '../controllers/admin-analytics.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminRoleMiddleware } from '../../middleware/admin-role.middleware';

const router = Router();

// All routes require authentication + admin role
router.use(authMiddleware, adminRoleMiddleware);

// Analytics endpoints
router.get('/dashboard', AdminAnalyticsController.getDashboard);
router.get('/sales-trends', AdminAnalyticsController.getSalesTrends);
router.get('/top-organizers', AdminAnalyticsController.getTopOrganizers);
router.get('/top-events', AdminAnalyticsController.getTopEvents);
router.get('/revenue-breakdown', AdminAnalyticsController.getRevenueBreakdown);

export default router;

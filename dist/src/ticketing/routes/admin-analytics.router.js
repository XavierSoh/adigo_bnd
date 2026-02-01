"use strict";
/**
 * Admin Analytics Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_analytics_controller_1 = require("../controllers/admin-analytics.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_role_middleware_1 = require("../../middleware/admin-role.middleware");
const router = (0, express_1.Router)();
// All routes require authentication + admin role
router.use(auth_middleware_1.authMiddleware, admin_role_middleware_1.adminRoleMiddleware);
// Analytics endpoints
router.get('/dashboard', admin_analytics_controller_1.AdminAnalyticsController.getDashboard);
router.get('/sales-trends', admin_analytics_controller_1.AdminAnalyticsController.getSalesTrends);
router.get('/top-organizers', admin_analytics_controller_1.AdminAnalyticsController.getTopOrganizers);
router.get('/top-events', admin_analytics_controller_1.AdminAnalyticsController.getTopEvents);
router.get('/revenue-breakdown', admin_analytics_controller_1.AdminAnalyticsController.getRevenueBreakdown);
exports.default = router;

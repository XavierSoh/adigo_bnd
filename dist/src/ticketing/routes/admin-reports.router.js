"use strict";
/**
 * Admin Reports Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_reports_controller_1 = require("../controllers/admin-reports.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_role_middleware_1 = require("../../middleware/admin-role.middleware");
const router = (0, express_1.Router)();
// All routes require authentication + admin role
router.use(auth_middleware_1.authMiddleware, admin_role_middleware_1.adminRoleMiddleware);
// Export endpoints
router.get('/users/export', admin_reports_controller_1.AdminReportsController.exportUsers);
router.get('/events/export', admin_reports_controller_1.AdminReportsController.exportEvents);
router.get('/tickets/export', admin_reports_controller_1.AdminReportsController.exportTickets);
router.get('/transactions/export', admin_reports_controller_1.AdminReportsController.exportTransactions);
// Revenue report
router.get('/revenue', admin_reports_controller_1.AdminReportsController.getRevenueReport);
exports.default = router;

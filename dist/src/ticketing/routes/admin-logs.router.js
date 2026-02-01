"use strict";
/**
 * Admin Logs Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_logs_controller_1 = require("../controllers/admin-logs.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_role_middleware_1 = require("../../middleware/admin-role.middleware");
const router = (0, express_1.Router)();
// All routes require authentication + admin role
router.use(auth_middleware_1.authMiddleware, admin_role_middleware_1.adminRoleMiddleware);
// Logs and audit
router.get('/activity', admin_logs_controller_1.AdminLogsController.getActivityLogs);
router.get('/login', admin_logs_controller_1.AdminLogsController.getLoginLogs);
router.get('/audit/:entityType/:entityId', admin_logs_controller_1.AdminLogsController.getAuditTrail);
exports.default = router;

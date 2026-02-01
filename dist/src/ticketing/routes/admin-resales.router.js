"use strict";
/**
 * Admin Resales Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_resales_controller_1 = require("../controllers/admin-resales.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_role_middleware_1 = require("../../middleware/admin-role.middleware");
const router = (0, express_1.Router)();
// All routes require authentication + admin role
router.use(auth_middleware_1.authMiddleware, admin_role_middleware_1.adminRoleMiddleware);
// Resale moderation
router.get('/', admin_resales_controller_1.AdminResalesController.getAllResales);
router.get('/stats', admin_resales_controller_1.AdminResalesController.getResaleStats);
router.post('/:id/approve', admin_resales_controller_1.AdminResalesController.approveResale);
router.post('/:id/reject', admin_resales_controller_1.AdminResalesController.rejectResale);
router.delete('/:id', admin_resales_controller_1.AdminResalesController.deleteResale);
exports.default = router;

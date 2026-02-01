"use strict";
/**
 * Admin Settings Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_settings_controller_1 = require("../controllers/admin-settings.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_role_middleware_1 = require("../../middleware/admin-role.middleware");
const router = (0, express_1.Router)();
// All routes require authentication + super_admin role
router.use(auth_middleware_1.authMiddleware, admin_role_middleware_1.superAdminRoleMiddleware);
// Settings management
router.get('/', admin_settings_controller_1.AdminSettingsController.getSettings);
router.put('/:key', admin_settings_controller_1.AdminSettingsController.updateSetting);
router.get('/pricing', admin_settings_controller_1.AdminSettingsController.getPricing);
router.put('/pricing', admin_settings_controller_1.AdminSettingsController.updatePricing);
exports.default = router;

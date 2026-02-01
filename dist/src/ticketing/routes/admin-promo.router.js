"use strict";
/**
 * Admin Promo Codes Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_promo_controller_1 = require("../controllers/admin-promo.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_role_middleware_1 = require("../../middleware/admin-role.middleware");
const router = (0, express_1.Router)();
// All routes require authentication + admin role
router.use(auth_middleware_1.authMiddleware, admin_role_middleware_1.adminRoleMiddleware);
// Promo code management
router.post('/', admin_promo_controller_1.AdminPromoController.createPromoCode);
router.get('/', admin_promo_controller_1.AdminPromoController.getAllPromoCodes);
router.get('/stats', admin_promo_controller_1.AdminPromoController.getPromoStats);
router.put('/:id', admin_promo_controller_1.AdminPromoController.updatePromoCode);
router.delete('/:id', admin_promo_controller_1.AdminPromoController.deletePromoCode);
exports.default = router;

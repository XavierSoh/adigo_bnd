"use strict";
/**
 * Admin Users Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_users_controller_1 = require("../controllers/admin-users.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_role_middleware_1 = require("../../middleware/admin-role.middleware");
const router = (0, express_1.Router)();
// All routes require authentication + admin role
router.use(auth_middleware_1.authMiddleware, admin_role_middleware_1.adminRoleMiddleware);
// User management
router.get('/', admin_users_controller_1.AdminUsersController.getAllUsers);
router.get('/search', admin_users_controller_1.AdminUsersController.searchUsers);
router.get('/:id', admin_users_controller_1.AdminUsersController.getUserById);
router.patch('/:id/status', admin_users_controller_1.AdminUsersController.updateUserStatus);
// User details
router.get('/:id/transactions', admin_users_controller_1.AdminUsersController.getUserTransactions);
router.get('/:id/tickets', admin_users_controller_1.AdminUsersController.getUserTickets);
router.get('/:id/wallet', admin_users_controller_1.AdminUsersController.getUserWallet);
exports.default = router;

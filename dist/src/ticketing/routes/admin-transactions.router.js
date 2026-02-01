"use strict";
/**
 * Admin Transactions Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_transactions_controller_1 = require("../controllers/admin-transactions.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const admin_role_middleware_1 = require("../../middleware/admin-role.middleware");
const router = (0, express_1.Router)();
// All routes require authentication + admin role
router.use(auth_middleware_1.authMiddleware, admin_role_middleware_1.adminRoleMiddleware);
// Transaction endpoints
router.get('/wallet', admin_transactions_controller_1.AdminTransactionsController.getWalletTransactions);
router.get('/tickets', admin_transactions_controller_1.AdminTransactionsController.getTicketTransactions);
router.get('/premium', admin_transactions_controller_1.AdminTransactionsController.getPremiumTransactions);
router.get('/:id', admin_transactions_controller_1.AdminTransactionsController.getTransactionById);
router.post('/:id/refund', admin_transactions_controller_1.AdminTransactionsController.processRefund);
exports.default = router;

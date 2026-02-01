/**
 * Admin Transactions Routes
 */

import { Router } from 'express';
import { AdminTransactionsController } from '../controllers/admin-transactions.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminRoleMiddleware } from '../../middleware/admin-role.middleware';

const router = Router();

// All routes require authentication + admin role
router.use(authMiddleware, adminRoleMiddleware);

// Transaction endpoints
router.get('/wallet', AdminTransactionsController.getWalletTransactions);
router.get('/tickets', AdminTransactionsController.getTicketTransactions);
router.get('/premium', AdminTransactionsController.getPremiumTransactions);
router.get('/:id', AdminTransactionsController.getTransactionById);
router.post('/:id/refund', AdminTransactionsController.processRefund);

export default router;

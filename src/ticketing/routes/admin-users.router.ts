/**
 * Admin Users Routes
 */

import { Router } from 'express';
import { AdminUsersController } from '../controllers/admin-users.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminRoleMiddleware } from '../../middleware/admin-role.middleware';

const router = Router();

// All routes require authentication + admin role
router.use(authMiddleware, adminRoleMiddleware);

// User management
router.get('/', AdminUsersController.getAllUsers);
router.get('/search', AdminUsersController.searchUsers);
router.get('/:id', AdminUsersController.getUserById);
router.patch('/:id/status', AdminUsersController.updateUserStatus);

// User details
router.get('/:id/transactions', AdminUsersController.getUserTransactions);
router.get('/:id/tickets', AdminUsersController.getUserTickets);
router.get('/:id/wallet', AdminUsersController.getUserWallet);

export default router;

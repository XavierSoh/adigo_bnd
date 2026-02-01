/**
 * Admin Reports Routes
 */

import { Router } from 'express';
import { AdminReportsController } from '../controllers/admin-reports.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminRoleMiddleware } from '../../middleware/admin-role.middleware';

const router = Router();

// All routes require authentication + admin role
router.use(authMiddleware, adminRoleMiddleware);

// Export endpoints
router.get('/users/export', AdminReportsController.exportUsers);
router.get('/events/export', AdminReportsController.exportEvents);
router.get('/tickets/export', AdminReportsController.exportTickets);
router.get('/transactions/export', AdminReportsController.exportTransactions);

// Revenue report
router.get('/revenue', AdminReportsController.getRevenueReport);

export default router;

/**
 * Organizer Dashboard Routes
 */

import { Router } from 'express';
import { OrganizerDashboardController } from '../controllers/organizer-dashboard.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication
// TODO: Add organizer ownership check middleware

router.get('/:id/stats', authMiddleware, OrganizerDashboardController.getStats);
router.get('/:id/sales', authMiddleware, OrganizerDashboardController.getSales);
router.get('/:id/validated-tickets', authMiddleware, OrganizerDashboardController.getValidatedTickets);
router.get('/:id/revenue', authMiddleware, OrganizerDashboardController.getRevenue);

export default router;

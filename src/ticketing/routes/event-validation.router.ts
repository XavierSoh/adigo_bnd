/**
 * Event Validation Routes (Admin)
 */

import { Router } from 'express';
import { EventValidationController } from '../controllers/event-validation.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminRoleMiddleware } from '../../middleware/admin-role.middleware';

const router = Router();

// All routes require authentication + admin role
router.use(authMiddleware, adminRoleMiddleware);

// Events validation
router.get('/events/pending', EventValidationController.getPendingEvents);
router.post('/events/:id/approve', EventValidationController.approveEvent);
router.post('/events/:id/reject', EventValidationController.rejectEvent);
router.get('/events/stats', EventValidationController.getEventsStats);

// Organizers verification
router.get('/organizers/pending', EventValidationController.getPendingOrganizers);
router.post('/organizers/:id/verify', EventValidationController.verifyOrganizer);

export default router;

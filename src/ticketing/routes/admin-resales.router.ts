/**
 * Admin Resales Routes
 */

import { Router } from 'express';
import { AdminResalesController } from '../controllers/admin-resales.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminRoleMiddleware } from '../../middleware/admin-role.middleware';

const router = Router();

// All routes require authentication + admin role
router.use(authMiddleware, adminRoleMiddleware);

// Resale moderation
router.get('/', AdminResalesController.getAllResales);
router.get('/stats', AdminResalesController.getResaleStats);
router.post('/:id/approve', AdminResalesController.approveResale);
router.post('/:id/reject', AdminResalesController.rejectResale);
router.delete('/:id', AdminResalesController.deleteResale);

export default router;

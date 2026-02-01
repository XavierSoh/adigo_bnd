/**
 * Admin Promo Codes Routes
 */

import { Router } from 'express';
import { AdminPromoController } from '../controllers/admin-promo.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminRoleMiddleware } from '../../middleware/admin-role.middleware';

const router = Router();

// All routes require authentication + admin role
router.use(authMiddleware, adminRoleMiddleware);

// Promo code management
router.post('/', AdminPromoController.createPromoCode);
router.get('/', AdminPromoController.getAllPromoCodes);
router.get('/stats', AdminPromoController.getPromoStats);
router.put('/:id', AdminPromoController.updatePromoCode);
router.delete('/:id', AdminPromoController.deletePromoCode);

export default router;

/**
 * Admin Settings Routes
 */

import { Router } from 'express';
import { AdminSettingsController } from '../controllers/admin-settings.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { superAdminRoleMiddleware } from '../../middleware/admin-role.middleware';

const router = Router();

// All routes require authentication + super_admin role
router.use(authMiddleware, superAdminRoleMiddleware);

// Settings management
router.get('/', AdminSettingsController.getSettings);
router.put('/:key', AdminSettingsController.updateSetting);
router.get('/pricing', AdminSettingsController.getPricing);
router.put('/pricing', AdminSettingsController.updatePricing);

export default router;

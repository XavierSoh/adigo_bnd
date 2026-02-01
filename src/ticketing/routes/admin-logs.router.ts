/**
 * Admin Logs Routes
 */

import { Router } from 'express';
import { AdminLogsController } from '../controllers/admin-logs.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { adminRoleMiddleware } from '../../middleware/admin-role.middleware';

const router = Router();

// All routes require authentication + admin role
router.use(authMiddleware, adminRoleMiddleware);

// Logs and audit
router.get('/activity', AdminLogsController.getActivityLogs);
router.get('/login', AdminLogsController.getLoginLogs);
router.get('/audit/:entityType/:entityId', AdminLogsController.getAuditTrail);

export default router;

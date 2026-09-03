/**
 * Admin Logs Controller
 *
 * Audit trail and activity logs
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
// Migrated to Prisma's native model API — logic lives in
// AdminLogsRepository (prisma.activity_log.*), see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 3).
import { AdminLogsRepository } from '../repositories/admin-logs.repository';

export class AdminLogsController {

    /**
     * Get activity logs
     * GET /v1/api/ticketing/admin/logs/activity
     */
    static async getActivityLogs(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { limit = 100, offset = 0, action_type, user_id } = req.query;

            const logs = await AdminLogsRepository.getActivityLogs(
                parseInt(limit as string),
                parseInt(offset as string),
                action_type as string | undefined,
                user_id ? parseInt(user_id as string) : undefined
            );

            res.status(200).json({
                status: true,
                message: I18n.t('logs_retrieved', lang),
                body: { logs, total: logs.length },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getActivityLogs:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get login logs
     * GET /v1/api/ticketing/admin/logs/login
     */
    static async getLoginLogs(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { limit = 100, offset = 0 } = req.query;

            const logs = await AdminLogsRepository.getLoginLogs(
                parseInt(limit as string),
                parseInt(offset as string)
            );

            res.status(200).json({
                status: true,
                message: I18n.t('login_logs_retrieved', lang),
                body: { logs, total: logs.length },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getLoginLogs:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get audit trail for an entity
     * GET /v1/api/ticketing/admin/logs/audit/:entityType/:entityId
     */
    static async getAuditTrail(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { entityType, entityId } = req.params as { entityType: string; entityId: string };

            const logs = await AdminLogsRepository.getAuditTrail(entityType, parseInt(entityId));

            res.status(200).json({
                status: true,
                message: I18n.t('audit_trail_retrieved', lang),
                body: { logs, total: logs.length },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getAuditTrail:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}

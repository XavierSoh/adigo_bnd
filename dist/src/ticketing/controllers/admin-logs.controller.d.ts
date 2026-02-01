/**
 * Admin Logs Controller
 *
 * Audit trail and activity logs
 */
import { Request, Response } from 'express';
export declare class AdminLogsController {
    /**
     * Get activity logs
     * GET /v1/api/ticketing/admin/logs/activity
     */
    static getActivityLogs(req: Request, res: Response): Promise<void>;
    /**
     * Get login logs
     * GET /v1/api/ticketing/admin/logs/login
     */
    static getLoginLogs(req: Request, res: Response): Promise<void>;
    /**
     * Get audit trail for an entity
     * GET /v1/api/ticketing/admin/logs/audit/:entityType/:entityId
     */
    static getAuditTrail(req: Request, res: Response): Promise<void>;
}

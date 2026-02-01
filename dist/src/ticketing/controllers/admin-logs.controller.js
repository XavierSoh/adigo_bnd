"use strict";
/**
 * Admin Logs Controller
 *
 * Audit trail and activity logs
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminLogsController = void 0;
const i18n_1 = require("../../utils/i18n");
const pgdb_1 = __importDefault(require("../../config/pgdb"));
class AdminLogsController {
    /**
     * Get activity logs
     * GET /v1/api/ticketing/admin/logs/activity
     */
    static async getActivityLogs(req, res) {
        try {
            const lang = req.lang || 'en';
            const { limit = 100, offset = 0, action_type, user_id } = req.query;
            let query = `
                SELECT
                    al.*,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'email', c.email,
                        'role', c.role
                    ) AS user
                FROM activity_log al
                LEFT JOIN customer c ON al.user_id = c.id
                WHERE 1=1
            `;
            const params = [];
            if (action_type) {
                params.push(action_type);
                query += ` AND al.action_type = $${params.length}`;
            }
            if (user_id) {
                params.push(user_id);
                query += ` AND al.user_id = $${params.length}`;
            }
            query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit), parseInt(offset));
            const logs = await pgdb_1.default.any(query, params);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('logs_retrieved', lang),
                body: { logs, total: logs.length },
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getActivityLogs:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Get login logs
     * GET /v1/api/ticketing/admin/logs/login
     */
    static async getLoginLogs(req, res) {
        try {
            const lang = req.lang || 'en';
            const { limit = 100, offset = 0 } = req.query;
            const logs = await pgdb_1.default.any(`
                SELECT
                    al.*,
                    json_build_object(
                        'id', c.id,
                        'email', c.email,
                        'role', c.role
                    ) AS user
                FROM activity_log al
                LEFT JOIN customer c ON al.user_id = c.id
                WHERE al.action_type IN ('login', 'logout', 'failed_login')
                ORDER BY al.created_at DESC
                LIMIT $1 OFFSET $2
            `, [parseInt(limit), parseInt(offset)]);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('login_logs_retrieved', lang),
                body: { logs, total: logs.length },
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getLoginLogs:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Get audit trail for an entity
     * GET /v1/api/ticketing/admin/logs/audit/:entityType/:entityId
     */
    static async getAuditTrail(req, res) {
        try {
            const lang = req.lang || 'en';
            const { entityType, entityId } = req.params;
            const logs = await pgdb_1.default.any(`
                SELECT
                    al.*,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'role', c.role
                    ) AS user
                FROM activity_log al
                LEFT JOIN customer c ON al.user_id = c.id
                WHERE al.entity_type = $1 AND al.entity_id = $2
                ORDER BY al.created_at DESC
            `, [entityType, parseInt(entityId)]);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('audit_trail_retrieved', lang),
                body: { logs, total: logs.length },
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getAuditTrail:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
exports.AdminLogsController = AdminLogsController;

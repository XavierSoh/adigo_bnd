/**
 * Admin Users Controller
 *
 * Manages users from admin perspective
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
import pgpDb from '../../config/pgdb';

export class AdminUsersController {

    /**
     * Get all users
     * GET /v1/api/ticketing/admin/users
     */
    static async getAllUsers(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { limit = 50, offset = 0, include_deleted = 'false' } = req.query;

            const limitNum = parseInt(limit as string);
            const offsetNum = parseInt(offset as string);

            let query = `
                SELECT
                    c.id,
                    c.first_name,
                    c.last_name,
                    c.email,
                    c.phone,
                    c.role,
                    c.is_active,
                    c.is_deleted,
                    c.created_at,
                    c.updated_at,
                    COALESCE(w.balance, 0)::int AS wallet_balance,
                    COUNT(DISTINCT et.id)::int AS total_tickets_purchased
                FROM customer c
                LEFT JOIN wallet w ON c.id = w.customer_id
                LEFT JOIN event_ticket et ON c.id = et.customer_id AND et.is_deleted = FALSE
            `;

            if (include_deleted !== 'true') {
                query += ` WHERE c.is_deleted = FALSE`;
            }

            query += `
                GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone, c.role, c.is_active, c.is_deleted, c.created_at, c.updated_at, w.balance
                ORDER BY c.created_at DESC
                LIMIT $1 OFFSET $2
            `;

            const users = await pgpDb.any(query, [limitNum, offsetNum]);

            // Get total count
            let countQuery = `SELECT COUNT(*)::int AS total FROM customer`;
            if (include_deleted !== 'true') {
                countQuery += ` WHERE is_deleted = FALSE`;
            }

            const { total } = await pgpDb.one(countQuery);

            res.status(200).json({
                status: true,
                message: I18n.t('users_retrieved', lang),
                body: {
                    users,
                    pagination: {
                        total,
                        limit: limitNum,
                        offset: offsetNum,
                        has_more: offsetNum + limitNum < total
                    }
                },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getAllUsers:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Search users
     * GET /v1/api/ticketing/admin/users/search
     */
    static async searchUsers(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { q, role, is_active } = req.query;

            if (!q || typeof q !== 'string') {
                res.status(400).json({
                    status: false,
                    message: 'Search query required',
                    code: 400
                });
                return;
            }

            let query = `
                SELECT
                    c.id,
                    c.first_name,
                    c.last_name,
                    c.email,
                    c.phone,
                    c.role,
                    c.is_active,
                    c.created_at,
                    COALESCE(w.balance, 0)::int AS wallet_balance
                FROM customer c
                LEFT JOIN wallet w ON c.id = w.customer_id
                WHERE c.is_deleted = FALSE
                AND (
                    c.first_name ILIKE $1
                    OR c.last_name ILIKE $1
                    OR c.email ILIKE $1
                    OR c.phone ILIKE $1
                )
            `;

            const params: any[] = [`%${q}%`];

            if (role) {
                query += ` AND c.role = $${params.length + 1}`;
                params.push(role);
            }

            if (is_active !== undefined) {
                query += ` AND c.is_active = $${params.length + 1}`;
                params.push(is_active === 'true');
            }

            query += ` ORDER BY c.created_at DESC LIMIT 50`;

            const users = await pgpDb.any(query, params);

            res.status(200).json({
                status: true,
                message: I18n.t('search_results', lang),
                body: { users, total: users.length },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in searchUsers:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get user by ID
     * GET /v1/api/ticketing/admin/users/:id
     */
    static async getUserById(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const userId = parseInt((req.params as { id: string }).id);

            const user = await pgpDb.oneOrNone(`
                SELECT
                    c.*,
                    COALESCE(w.balance, 0)::int AS wallet_balance,
                    COUNT(DISTINCT et.id)::int AS total_tickets_purchased,
                    COUNT(DISTINCT eo.id)::int AS organizer_profiles
                FROM customer c
                LEFT JOIN wallet w ON c.id = w.customer_id
                LEFT JOIN event_ticket et ON c.id = et.customer_id AND et.is_deleted = FALSE
                LEFT JOIN event_organizer eo ON c.id = eo.customer_id AND eo.is_deleted = FALSE
                WHERE c.id = $1
                GROUP BY c.id, w.balance
            `, [userId]);

            if (!user) {
                res.status(404).json({
                    status: false,
                    message: I18n.t('user_not_found', lang),
                    code: 404
                });
                return;
            }

            res.status(200).json({
                status: true,
                message: I18n.t('user_found', lang),
                body: user,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getUserById:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Update user status (activate/deactivate)
     * PATCH /v1/api/ticketing/admin/users/:id/status
     */
    static async updateUserStatus(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const userId = parseInt((req.params as { id: string }).id);
            const { is_active, reason } = req.body;

            if (is_active === undefined) {
                res.status(400).json({
                    status: false,
                    message: 'is_active field required',
                    code: 400
                });
                return;
            }

            const updatedUser = await pgpDb.one(`
                UPDATE customer
                SET is_active = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `, [userId, is_active]);

            res.status(200).json({
                status: true,
                message: is_active
                    ? I18n.t('user_activated', lang)
                    : I18n.t('user_deactivated', lang),
                body: updatedUser,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in updateUserStatus:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get user transactions
     * GET /v1/api/ticketing/admin/users/:id/transactions
     */
    static async getUserTransactions(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const userId = parseInt((req.params as { id: string }).id);

            const transactions = await pgpDb.any(`
                SELECT
                    wt.*,
                    c.first_name,
                    c.last_name,
                    c.email
                FROM wallet_transaction wt
                JOIN customer c ON wt.customer_id = c.id
                WHERE wt.customer_id = $1
                ORDER BY wt.created_at DESC
            `, [userId]);

            res.status(200).json({
                status: true,
                message: I18n.t('transactions_retrieved', lang),
                body: { transactions, total: transactions.length },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getUserTransactions:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get user tickets
     * GET /v1/api/ticketing/admin/users/:id/tickets
     */
    static async getUserTickets(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const userId = parseInt((req.params as { id: string }).id);

            const tickets = await pgpDb.any(`
                SELECT
                    et.*,
                    json_build_object(
                        'id', e.id,
                        'title', e.title,
                        'event_code', e.event_code,
                        'event_date', e.event_date
                    ) AS event,
                    json_build_object(
                        'id', ett.id,
                        'name', ett.name
                    ) AS ticket_type
                FROM event_ticket et
                JOIN event e ON et.event_id = e.id
                LEFT JOIN event_ticket_type ett ON et.ticket_type_id = ett.id
                WHERE et.customer_id = $1
                AND et.is_deleted = FALSE
                ORDER BY et.created_at DESC
            `, [userId]);

            res.status(200).json({
                status: true,
                message: I18n.t('tickets_retrieved', lang),
                body: { tickets, total: tickets.length },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getUserTickets:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get user wallet details
     * GET /v1/api/ticketing/admin/users/:id/wallet
     */
    static async getUserWallet(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const userId = parseInt((req.params as { id: string }).id);

            const wallet = await pgpDb.oneOrNone(`
                SELECT
                    w.*,
                    COUNT(wt.id)::int AS transaction_count,
                    COALESCE(SUM(wt.amount) FILTER (WHERE wt.type = 'credit'), 0)::int AS total_credits,
                    COALESCE(SUM(wt.amount) FILTER (WHERE wt.type = 'debit'), 0)::int AS total_debits
                FROM wallet w
                LEFT JOIN wallet_transaction wt ON w.customer_id = wt.customer_id
                WHERE w.customer_id = $1
                GROUP BY w.id, w.customer_id, w.balance, w.created_at, w.updated_at
            `, [userId]);

            if (!wallet) {
                res.status(404).json({
                    status: false,
                    message: I18n.t('wallet_not_found', lang),
                    code: 404
                });
                return;
            }

            res.status(200).json({
                status: true,
                message: I18n.t('wallet_retrieved', lang),
                body: wallet,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getUserWallet:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}

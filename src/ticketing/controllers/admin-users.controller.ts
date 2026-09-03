/**
 * Admin Users Controller
 *
 * Manages users from admin perspective
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
// Migrated to Prisma's native model API — logic lives in
// AdminUsersRepository (prisma.customer.*), see BOOKING_MODULE_NOTES.md
// ("Full Prisma relational-API migration", tier 3).
import { AdminUsersRepository } from '../repositories/admin-users.repository';

export class AdminUsersController {

    /**
     * Get all users
     * GET /v1/api/ticketing/admin/users
     */
    static async getAllUsers(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const {
                limit = 50,
                offset = 0,
                include_deleted = 'false',
                role,
                is_active,
                all_customers = 'false',
            } = req.query;

            const limitNum = parseInt(limit as string);
            const offsetNum = parseInt(offset as string);

            const { users, total } = await AdminUsersRepository.findAll({
                limit: limitNum,
                offset: offsetNum,
                includeDeleted: include_deleted === 'true',
                role: role && typeof role === 'string' ? role : undefined,
                isActive: (is_active === 'true' || is_active === 'false') ? is_active === 'true' : undefined,
                allCustomers: all_customers === 'true',
            });

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

            const users = await AdminUsersRepository.search(
                q,
                role && typeof role === 'string' ? role : undefined,
                is_active !== undefined ? is_active === 'true' : undefined
            );

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

            const user = await AdminUsersRepository.findById(userId);

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
            const { is_active } = req.body;

            if (is_active === undefined) {
                res.status(400).json({
                    status: false,
                    message: 'is_active field required',
                    code: 400
                });
                return;
            }

            const updatedUser = await AdminUsersRepository.updateStatus(userId, is_active);

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

            const transactions = await AdminUsersRepository.getTransactions(userId);

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

            const tickets = await AdminUsersRepository.getTickets(userId);

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

            const wallet = await AdminUsersRepository.getWallet(userId);

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

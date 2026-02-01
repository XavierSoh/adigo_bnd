"use strict";
/**
 * Admin Transactions Controller
 *
 * Manage all transactions (wallet, tickets, premium services)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminTransactionsController = void 0;
const i18n_1 = require("../../utils/i18n");
const pgdb_1 = __importDefault(require("../../config/pgdb"));
class AdminTransactionsController {
    /**
     * Get all wallet transactions
     * GET /v1/api/ticketing/admin/transactions/wallet
     */
    static async getWalletTransactions(req, res) {
        try {
            const lang = req.lang || 'en';
            const { limit = 50, offset = 0, type, status } = req.query;
            let query = `
                SELECT
                    wt.*,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'email', c.email
                    ) AS customer
                FROM wallet_transaction wt
                JOIN customer c ON wt.customer_id = c.id
                WHERE 1=1
            `;
            const params = [];
            if (type) {
                params.push(type);
                query += ` AND wt.type = $${params.length}`;
            }
            if (status) {
                params.push(status);
                query += ` AND wt.status = $${params.length}`;
            }
            query += ` ORDER BY wt.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit), parseInt(offset));
            const transactions = await pgdb_1.default.any(query, params);
            // Get total count
            let countQuery = `SELECT COUNT(*)::int AS total FROM wallet_transaction WHERE 1=1`;
            const countParams = [];
            if (type) {
                countParams.push(type);
                countQuery += ` AND type = $${countParams.length}`;
            }
            if (status) {
                countParams.push(status);
                countQuery += ` AND status = $${countParams.length}`;
            }
            const { total } = await pgdb_1.default.one(countQuery, countParams);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('transactions_retrieved', lang),
                body: {
                    transactions,
                    pagination: {
                        total,
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        has_more: parseInt(offset) + parseInt(limit) < total
                    }
                },
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getWalletTransactions:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Get all ticket purchases
     * GET /v1/api/ticketing/admin/transactions/tickets
     */
    static async getTicketTransactions(req, res) {
        try {
            const lang = req.lang || 'en';
            const { limit = 50, offset = 0, status } = req.query;
            let query = `
                SELECT
                    et.*,
                    json_build_object(
                        'id', e.id,
                        'title', e.title,
                        'code', e.code
                    ) AS event,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'email', c.email
                    ) AS customer
                FROM event_ticket et
                JOIN event e ON et.event_id = e.id
                JOIN customer c ON et.customer_id = c.id
                WHERE 1=1
            `;
            const params = [];
            if (status) {
                params.push(status);
                query += ` AND et.status = $${params.length}`;
            }
            query += ` ORDER BY et.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit), parseInt(offset));
            const transactions = await pgdb_1.default.any(query, params);
            // Get total count
            let countQuery = `SELECT COUNT(*)::int AS total FROM event_ticket WHERE 1=1`;
            const countParams = [];
            if (status) {
                countParams.push(status);
                countQuery += ` AND status = $${countParams.length}`;
            }
            const { total } = await pgdb_1.default.one(countQuery, countParams);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('transactions_retrieved', lang),
                body: {
                    transactions,
                    pagination: {
                        total,
                        limit: parseInt(limit),
                        offset: parseInt(offset),
                        has_more: parseInt(offset) + parseInt(limit) < total
                    }
                },
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getTicketTransactions:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Get premium services payments
     * GET /v1/api/ticketing/admin/transactions/premium
     */
    static async getPremiumTransactions(req, res) {
        try {
            const lang = req.lang || 'en';
            const premiumTransactions = await pgdb_1.default.any(`
                SELECT
                    e.id,
                    e.code,
                    e.title,
                    e.has_premium_design,
                    e.premium_design_amount,
                    e.boost_visibility,
                    e.boost_amount,
                    e.field_service,
                    e.field_service_amount,
                    e.created_at,
                    json_build_object(
                        'id', eo.id,
                        'name', eo.name,
                        'email', eo.email
                    ) AS organizer
                FROM event e
                JOIN event_organizer eo ON e.organizer_id = eo.id
                WHERE (
                    e.has_premium_design = TRUE
                    OR e.boost_visibility = TRUE
                    OR e.field_service = TRUE
                )
                ORDER BY e.created_at DESC
            `);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('premium_transactions_retrieved', lang),
                body: { transactions: premiumTransactions, total: premiumTransactions.length },
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getPremiumTransactions:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Get transaction by ID
     * GET /v1/api/ticketing/admin/transactions/:id
     */
    static async getTransactionById(req, res) {
        try {
            const lang = req.lang || 'en';
            const transactionId = parseInt(req.params.id);
            const transaction = await pgdb_1.default.oneOrNone(`
                SELECT
                    wt.*,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'email', c.email,
                        'phone', c.phone
                    ) AS customer
                FROM wallet_transaction wt
                JOIN customer c ON wt.customer_id = c.id
                WHERE wt.id = $1
            `, [transactionId]);
            if (!transaction) {
                res.status(404).json({
                    status: false,
                    message: i18n_1.I18n.t('transaction_not_found', lang),
                    code: 404
                });
                return;
            }
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('transaction_retrieved', lang),
                body: transaction,
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getTransactionById:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Process manual refund
     * POST /v1/api/ticketing/admin/transactions/:id/refund
     */
    static async processRefund(req, res) {
        try {
            const lang = req.lang || 'en';
            const transactionId = parseInt(req.params.id);
            const { reason } = req.body;
            const adminId = req.userId;
            if (!reason) {
                res.status(400).json({
                    status: false,
                    message: 'Refund reason required',
                    code: 400
                });
                return;
            }
            // Get original transaction
            const transaction = await pgdb_1.default.oneOrNone(`
                SELECT * FROM wallet_transaction WHERE id = $1
            `, [transactionId]);
            if (!transaction) {
                res.status(404).json({
                    status: false,
                    message: i18n_1.I18n.t('transaction_not_found', lang),
                    code: 404
                });
                return;
            }
            if (transaction.type !== 'debit') {
                res.status(400).json({
                    status: false,
                    message: 'Can only refund debit transactions',
                    code: 400
                });
                return;
            }
            // Create refund transaction
            const refund = await pgdb_1.default.one(`
                INSERT INTO wallet_transaction (customer_id, amount, type, status, description, created_at)
                VALUES ($1, $2, 'credit', 'paid', $3, CURRENT_TIMESTAMP)
                RETURNING *
            `, [
                transaction.customer_id,
                transaction.amount,
                `Refund for transaction #${transactionId} - ${reason}`
            ]);
            // Update wallet balance
            await pgdb_1.default.none(`
                UPDATE wallet
                SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP
                WHERE customer_id = $2
            `, [transaction.amount, transaction.customer_id]);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('refund_processed', lang),
                body: refund,
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in processRefund:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
exports.AdminTransactionsController = AdminTransactionsController;

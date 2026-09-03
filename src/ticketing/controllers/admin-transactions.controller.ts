/**
 * Admin Transactions Controller
 *
 * Manage all transactions (wallet, tickets, premium services)
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
// Migrated to Prisma's native model API — logic lives in
// AdminTransactionsRepository, see BOOKING_MODULE_NOTES.md ("Full Prisma
// relational-API migration", tier 3).
import { AdminTransactionsRepository } from '../repositories/admin-transactions.repository';
import { WalletRepository } from "../../repository/wallet.repository";

export class AdminTransactionsController {

    /**
     * Get all wallet transactions
     * GET /v1/api/ticketing/admin/transactions/wallet
     */
    static async getWalletTransactions(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { limit = 50, offset = 0, type } = req.query;

            const { transactions, total } = await AdminTransactionsRepository.getWalletTransactions(
                parseInt(limit as string),
                parseInt(offset as string),
                type as string | undefined
            );

            res.status(200).json({
                status: true,
                message: I18n.t('transactions_retrieved', lang),
                body: {
                    transactions,
                    pagination: {
                        total,
                        limit: parseInt(limit as string),
                        offset: parseInt(offset as string),
                        has_more: parseInt(offset as string) + parseInt(limit as string) < total
                    }
                },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getWalletTransactions:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get all ticket purchases
     * GET /v1/api/ticketing/admin/transactions/tickets
     */
    static async getTicketTransactions(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { limit = 50, offset = 0, status } = req.query;

            const { transactions, total } = await AdminTransactionsRepository.getTicketTransactions(
                parseInt(limit as string),
                parseInt(offset as string),
                status as string | undefined
            );

            res.status(200).json({
                status: true,
                message: I18n.t('transactions_retrieved', lang),
                body: {
                    transactions,
                    pagination: {
                        total,
                        limit: parseInt(limit as string),
                        offset: parseInt(offset as string),
                        has_more: parseInt(offset as string) + parseInt(limit as string) < total
                    }
                },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getTicketTransactions:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get premium services payments
     * GET /v1/api/ticketing/admin/transactions/premium
     */
    static async getPremiumTransactions(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            const premiumTransactions = await AdminTransactionsRepository.getPremiumTransactions();

            res.status(200).json({
                status: true,
                message: I18n.t('premium_transactions_retrieved', lang),
                body: { transactions: premiumTransactions, total: premiumTransactions.length },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getPremiumTransactions:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get transaction by ID
     * GET /v1/api/ticketing/admin/transactions/:id
     */
    static async getTransactionById(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const transactionId = parseInt((req.params as { id: string }).id);

            const transaction = await AdminTransactionsRepository.findTransactionById(transactionId);

            if (!transaction) {
                res.status(404).json({
                    status: false,
                    message: I18n.t('transaction_not_found', lang),
                    code: 404
                });
                return;
            }

            res.status(200).json({
                status: true,
                message: I18n.t('transaction_retrieved', lang),
                body: transaction,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getTransactionById:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Process manual refund
     * POST /v1/api/ticketing/admin/transactions/:id/refund
     */
    static async processRefund(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const transactionId = parseInt((req.params as { id: string }).id);
            const { reason } = req.body;

            if (!reason) {
                res.status(400).json({
                    status: false,
                    message: 'Refund reason required',
                    code: 400
                });
                return;
            }

            // Get the original ticket purchase (see getTransactionById —
            // this screen works off event_ticket, not wallet_transaction).
            const ticket = await AdminTransactionsRepository.findTicketForRefund(transactionId);

            if (!ticket) {
                res.status(404).json({
                    status: false,
                    message: I18n.t('transaction_not_found', lang),
                    code: 404
                });
                return;
            }

            if (ticket.payment_status !== 'paid' && ticket.payment_status !== 'confirmed') {
                res.status(400).json({
                    status: false,
                    message: 'Can only refund a paid ticket',
                    code: 400
                });
                return;
            }

            // Refund goes to the wallet regardless of the original payment
            // method (cash/mobile money can't be auto-reversed) — same
            // deliberate rule booking cancellations follow, see
            // WalletRepository.recordRefund and BOOKING_MODULE_NOTES.md.
            const refundTx = await WalletRepository.recordRefund(
                ticket.customer_id,
                ticket.total_price,
                `Refund for ticket ${ticket.reference} - ${reason}`
            );

            await AdminTransactionsRepository.markRefunded(transactionId);

            res.status(200).json({
                status: true,
                message: I18n.t('refund_processed', lang),
                body: refundTx,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in processRefund:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}

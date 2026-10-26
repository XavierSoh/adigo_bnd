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
import { TicketRefundService } from "../services/ticket-refund.service";
import { TicketingNotifier } from "../services/ticketing-notifier.service";

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
            const { limit = 50, offset = 0, status, payment_status, payment_method, event_id, search } = req.query as Record<string, string | undefined>;

            const { transactions, total } = await AdminTransactionsRepository.getTicketTransactions(
                parseInt(limit as string),
                parseInt(offset as string),
                {
                    status: status || undefined,
                    payment_status: payment_status || undefined,
                    payment_method: payment_method || undefined,
                    event_id: event_id ? parseInt(event_id) : undefined,
                    search: search?.trim() || undefined,
                }
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
            const { reason, amount } = req.body ?? {};

            if (!reason) {
                res.status(400).json({
                    status: false,
                    message: 'Refund reason required',
                    code: 400
                });
                return;
            }

            // Toujours sur le portefeuille, en une transaction (billet,
            // portefeuille, places libérées) et protégé contre le double
            // remboursement — voir TicketRefundService. `amount` facultatif
            // (défaut : totalité).
            const refund = await TicketRefundService.refund(transactionId, {
                amount: amount === undefined || amount === null || amount === '' ? undefined : Number(amount),
                reason: String(reason),
            });
            if (refund.ok === false) {
                res.status(refund.code).json({ status: false, message: refund.message, code: refund.code });
                return;
            }
            void TicketingNotifier.ticketRefunded(transactionId, refund.amount, String(reason));

            res.status(200).json({
                status: true,
                message: I18n.t('refund_processed', lang),
                body: refund,
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

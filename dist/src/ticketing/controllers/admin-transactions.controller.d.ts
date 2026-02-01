/**
 * Admin Transactions Controller
 *
 * Manage all transactions (wallet, tickets, premium services)
 */
import { Request, Response } from 'express';
export declare class AdminTransactionsController {
    /**
     * Get all wallet transactions
     * GET /v1/api/ticketing/admin/transactions/wallet
     */
    static getWalletTransactions(req: Request, res: Response): Promise<void>;
    /**
     * Get all ticket purchases
     * GET /v1/api/ticketing/admin/transactions/tickets
     */
    static getTicketTransactions(req: Request, res: Response): Promise<void>;
    /**
     * Get premium services payments
     * GET /v1/api/ticketing/admin/transactions/premium
     */
    static getPremiumTransactions(req: Request, res: Response): Promise<void>;
    /**
     * Get transaction by ID
     * GET /v1/api/ticketing/admin/transactions/:id
     */
    static getTransactionById(req: Request, res: Response): Promise<void>;
    /**
     * Process manual refund
     * POST /v1/api/ticketing/admin/transactions/:id/refund
     */
    static processRefund(req: Request, res: Response): Promise<void>;
}

import { Request, Response } from "express";
import { WalletRepository } from "../repository/wallet.repository";
import { TopUpRequest } from "../models/wallet_transaction.model";
import { I18n } from "../utils/i18n";

export class WalletController {
    // Get wallet balance
    static async getBalance(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt((req.params as { customerId: string }).customerId);

            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            // A customer token can only read its own wallet; a staff token
            // (req.userRole set) may read any customer's balance — needed
            // for the desktop counter-booking screen to show/validate a
            // client's wallet balance when staff pick "Portefeuille Adigo"
            // as the payment method.
            if (!req.userRole && req.userId !== customerId) {
                res.status(403).json({
                    status: false,
                    message: "You can only access your own wallet",
                    code: 403
                });
                return;
            }

            const result = await WalletRepository.getBalance(customerId);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Top up wallet
    static async topUp(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt((req.params as { customerId: string }).customerId);
            const topUpData: TopUpRequest = req.body;

            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            // Same staff-token exception as getBalance: a customer can only
            // top up its own wallet, but staff need this to record a cash
            // deposit a client hands over at the counter — that's exactly
            // what this cash/manual-only endpoint is for (see the check
            // below).
            if (!req.userRole && req.userId !== customerId) {
                res.status(403).json({
                    status: false,
                    message: "You can only top up your own wallet",
                    code: 403
                });
                return;
            }

            // Orange Money now has a real, verified top-up path — see
            // POST /v1/api/payments/orange-money/wallet-topup. This endpoint
            // credits the wallet purely on the client's word (amount/reference
            // come straight from the body, unverified), so it must stay
            // restricted to methods that don't move real money through us
            // (cash collected in person, or an admin adjustment).
            if (topUpData.payment_method === 'orangeMoney' || topUpData.payment_method === 'mtn') {
                res.status(400).json({
                    status: false,
                    message: "Use POST /v1/api/payments/orange-money/wallet-topup for Orange Money — this endpoint only accepts cash/manual top-ups.",
                    code: 400
                });
                return;
            }

            if (!topUpData.amount || topUpData.amount <= 0) {
                res.status(400).json({
                    status: false,
                    message: "Invalid amount. Amount must be greater than 0",
                    code: 400
                });
                return;
            }

            if (!topUpData.payment_method) {
                res.status(400).json({
                    status: false,
                    message: "Payment method is required",
                    code: 400
                });
                return;
            }

            const result = await WalletRepository.topUp(
                customerId,
                topUpData.amount,
                topUpData.payment_method,
                topUpData.payment_reference
            );

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get transaction history
    static async getTransactions(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt((req.params as { customerId: string }).customerId);
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            // Same staff-token exception as getBalance — lets the desktop
            // wallet-history screen show any client's transactions.
            if (!req.userRole && req.userId !== customerId) {
                res.status(403).json({
                    status: false,
                    message: "You can only access your own wallet",
                    code: 403
                });
                return;
            }

            const result = await WalletRepository.getTransactions(customerId, limit, offset);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}

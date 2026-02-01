import { Request, Response } from "express";
import { WalletRepository } from "../repository/wallet.repository";
import { TopUpRequest } from "../models/wallet_transaction.model";
import { I18n } from "../utils/i18n";

export class WalletController {
    // Get wallet balance
    static async getBalance(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt(req.params.customerId);

            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
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
            const customerId = parseInt(req.params.customerId);
            const topUpData: TopUpRequest = req.body;

            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
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
            const customerId = parseInt(req.params.customerId);
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

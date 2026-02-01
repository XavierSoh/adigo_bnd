"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletController = void 0;
const wallet_repository_1 = require("../repository/wallet.repository");
const i18n_1 = require("../utils/i18n");
class WalletController {
    // Get wallet balance
    static async getBalance(req, res) {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt(req.params.customerId);
            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await wallet_repository_1.WalletRepository.getBalance(customerId);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Top up wallet
    static async topUp(req, res) {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt(req.params.customerId);
            const topUpData = req.body;
            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
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
            const result = await wallet_repository_1.WalletRepository.topUp(customerId, topUpData.amount, topUpData.payment_method, topUpData.payment_reference);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get transaction history
    static async getTransactions(req, res) {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt(req.params.customerId);
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await wallet_repository_1.WalletRepository.getTransactions(customerId, limit, offset);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
exports.WalletController = WalletController;

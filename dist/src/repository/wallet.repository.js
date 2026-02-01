"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletRepository = void 0;
const pgdb_1 = __importDefault(require("../config/pgdb"));
class WalletRepository {
    // Get wallet balance
    static async getBalance(customerId) {
        try {
            const query = `
                SELECT wallet_balance
                FROM customer
                WHERE id = $1 AND is_deleted = FALSE
            `;
            const result = await pgdb_1.default.oneOrNone(query, [customerId]);
            if (!result) {
                return {
                    status: false,
                    message: "Customer not found",
                    code: 404
                };
            }
            return {
                status: true,
                message: "Wallet balance retrieved successfully",
                body: { wallet_balance: result.wallet_balance || 0 },
                code: 200
            };
        }
        catch (error) {
            console.error("❌ Error getting wallet balance:", error);
            return {
                status: false,
                message: "Error retrieving wallet balance",
                code: 500
            };
        }
    }
    // Top up wallet
    static async topUp(customerId, amount, paymentMethod, paymentReference) {
        try {
            return await pgdb_1.default.tx(async (t) => {
                // Get current balance
                const customer = await t.one(`SELECT wallet_balance FROM customer WHERE id = $1 AND is_deleted = FALSE`, [customerId]);
                const currentBalance = customer.wallet_balance || 0;
                const newBalance = currentBalance + amount;
                // Update wallet balance
                await t.none(`UPDATE customer SET wallet_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [newBalance, customerId]);
                // Record transaction
                const transaction = await t.one(`INSERT INTO wallet_transaction (
                        customer_id, amount, transaction_type, payment_method,
                        payment_reference, description, balance_before, balance_after
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [
                    customerId,
                    amount,
                    'top_up',
                    paymentMethod,
                    paymentReference,
                    `Wallet top-up via ${paymentMethod}`,
                    currentBalance,
                    newBalance
                ]);
                return {
                    status: true,
                    message: "Wallet topped up successfully",
                    body: {
                        transaction,
                        new_balance: newBalance
                    },
                    code: 200
                };
            });
        }
        catch (error) {
            console.error("❌ Error topping up wallet:", error);
            return {
                status: false,
                message: "Error processing wallet top-up",
                code: 500
            };
        }
    }
    // Get transaction history
    static async getTransactions(customerId, limit = 50, offset = 0) {
        try {
            const transactions = await pgdb_1.default.manyOrNone(`SELECT * FROM wallet_transaction
                 WHERE customer_id = $1
                 ORDER BY created_at DESC
                 LIMIT $2 OFFSET $3`, [customerId, limit, offset]);
            const count = await pgdb_1.default.one(`SELECT COUNT(*) as total FROM wallet_transaction WHERE customer_id = $1`, [customerId]);
            return {
                status: true,
                message: "Transactions retrieved successfully",
                body: {
                    transactions,
                    total: parseInt(count.total),
                    limit,
                    offset
                },
                code: 200
            };
        }
        catch (error) {
            console.error("❌ Error getting transactions:", error);
            return {
                status: false,
                message: "Error retrieving transactions",
                code: 500
            };
        }
    }
    // Record payment transaction (called when booking with wallet)
    static async recordPayment(customerId, amount, description) {
        try {
            return await pgdb_1.default.tx(async (t) => {
                // Get current balance
                const customer = await t.one(`SELECT wallet_balance FROM customer WHERE id = $1 AND is_deleted = FALSE`, [customerId]);
                const currentBalance = customer.wallet_balance || 0;
                if (currentBalance < amount) {
                    throw new Error("Insufficient balance");
                }
                const newBalance = currentBalance - amount;
                // Update wallet balance
                await t.none(`UPDATE customer SET wallet_balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [newBalance, customerId]);
                // Record transaction
                const transaction = await t.one(`INSERT INTO wallet_transaction (
                        customer_id, amount, transaction_type, description,
                        balance_before, balance_after
                    ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [
                    customerId,
                    amount,
                    'payment',
                    description,
                    currentBalance,
                    newBalance
                ]);
                return {
                    status: true,
                    message: "Payment recorded successfully",
                    body: {
                        transaction,
                        new_balance: newBalance
                    },
                    code: 200
                };
            });
        }
        catch (error) {
            console.error("❌ Error recording payment:", error);
            return {
                status: false,
                message: error.message || "Error recording payment",
                code: 500
            };
        }
    }
}
exports.WalletRepository = WalletRepository;

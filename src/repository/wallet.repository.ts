
// Fully migrated to Prisma's native model API (prisma.customer.*,
// prisma.wallet_transaction.*), including the 3 real multi-statement
// transactions via prisma.$transaction(async (tx) => {...}) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 2).
import { Prisma } from "@prisma/client";
import prismaDb from "../config/prismaClient";
import { WalletTransaction } from "../models/wallet_transaction.model";

export class WalletRepository {
    // Get wallet balance
    static async getBalance(customerId: number): Promise<any> {
        try {
            const result = await prismaDb.customer.findFirst({
                where: { id: customerId, is_deleted: false },
                select: { wallet_balance: true },
            });

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
        } catch (error) {
            console.error("❌ Error getting wallet balance:", error);
            return {
                status: false,
                message: "Error retrieving wallet balance",
                code: 500
            };
        }
    }

    // Top up wallet
    static async topUp(
        customerId: number,
        amount: number,
        paymentMethod: string,
        paymentReference?: string
    ): Promise<any> {
        try {
            return await prismaDb.$transaction(async (tx) => {
                // Get current balance. Original used `pgOne` here, which
                // THROWS on 0 rows (customer missing or is_deleted=TRUE) —
                // that throw is what makes this whole method return a
                // generic 500 ("Error processing wallet top-up") rather
                // than a clean 404 on a bad customer id. Reproduced
                // exactly: findFirst + an explicit throw on null, not a
                // clean 404 return (a "fix" here would be a real behavior
                // change, not a faithful conversion).
                const customer = await tx.customer.findFirst({
                    where: { id: customerId, is_deleted: false },
                    select: { wallet_balance: true },
                });
                if (!customer) {
                    throw new Error('Customer not found');
                }

                const currentBalance = customer.wallet_balance || 0;
                const newBalance = currentBalance + amount;

                // Update wallet balance. A literal assignment (not
                // `{increment}`) — matches the original exactly, since the
                // NULL-safety here already happened above via `|| 0` in JS,
                // not via SQL COALESCE.
                await tx.customer.update({
                    where: { id: customerId },
                    data: { wallet_balance: newBalance, updated_at: new Date() },
                });

                // Record transaction
                const transaction = await tx.wallet_transaction.create({
                    data: {
                        customer_id: customerId,
                        amount,
                        transaction_type: 'top_up',
                        payment_method: paymentMethod,
                        payment_reference: paymentReference,
                        description: `Wallet top-up via ${paymentMethod}`,
                        balance_before: currentBalance,
                        balance_after: newBalance,
                    } satisfies Prisma.wallet_transactionUncheckedCreateInput,
                });

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
        } catch (error) {
            console.error("❌ Error topping up wallet:", error);
            return {
                status: false,
                message: "Error processing wallet top-up",
                code: 500
            };
        }
    }

    // Get transaction history
    static async getTransactions(
        customerId: number,
        limit: number = 50,
        offset: number = 0
    ): Promise<any> {
        try {
            const [transactions, total] = await Promise.all([
                prismaDb.wallet_transaction.findMany({
                    where: { customer_id: customerId },
                    orderBy: { created_at: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                // Native `.count()` returns a plain `number` directly —
                // no more `parseInt(count.total)` needed (COUNT(*) via raw
                // SQL came back as a numeric string).
                prismaDb.wallet_transaction.count({ where: { customer_id: customerId } }),
            ]);

            return {
                status: true,
                message: "Transactions retrieved successfully",
                body: {
                    transactions,
                    total,
                    limit,
                    offset
                },
                code: 200
            };
        } catch (error) {
            console.error("❌ Error getting transactions:", error);
            return {
                status: false,
                message: "Error retrieving transactions",
                code: 500
            };
        }
    }

    // Record payment transaction (called when booking with wallet)
    static async recordPayment(
        customerId: number,
        amount: number,
        description: string
    ): Promise<any> {
        try {
            return await prismaDb.$transaction(async (tx) => {
                // Get current balance
                const customer = await tx.customer.findFirst({
                    where: { id: customerId, is_deleted: false },
                    select: { wallet_balance: true },
                });
                if (!customer) {
                    throw new Error('Customer not found');
                }

                const currentBalance = customer.wallet_balance || 0;

                if (currentBalance < amount) {
                    throw new Error("Insufficient balance");
                }

                const newBalance = currentBalance - amount;

                // Update wallet balance
                await tx.customer.update({
                    where: { id: customerId },
                    data: { wallet_balance: newBalance, updated_at: new Date() },
                });

                // Record transaction
                const transaction = await tx.wallet_transaction.create({
                    data: {
                        customer_id: customerId,
                        amount,
                        transaction_type: 'payment',
                        description,
                        balance_before: currentBalance,
                        balance_after: newBalance,
                    } satisfies Prisma.wallet_transactionUncheckedCreateInput,
                });

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
        } catch (error: any) {
            console.error("❌ Error recording payment:", error);
            return {
                status: false,
                message: error.message || "Error recording payment",
                code: 500
            };
        }
    }

    // Record a refund transaction (called when a wallet-paid booking is
    // cancelled) — credits the wallet back and logs it distinctly from a
    // top-up so the history shows it was money returning, not added.
    static async recordRefund(
        customerId: number,
        amount: number,
        description: string
    ): Promise<any> {
        try {
            return await prismaDb.$transaction(async (tx) => {
                const customer = await tx.customer.findFirst({
                    where: { id: customerId, is_deleted: false },
                    select: { wallet_balance: true },
                });
                if (!customer) {
                    throw new Error('Customer not found');
                }

                const currentBalance = customer.wallet_balance || 0;
                const newBalance = currentBalance + amount;

                await tx.customer.update({
                    where: { id: customerId },
                    data: { wallet_balance: newBalance, updated_at: new Date() },
                });

                const transaction = await tx.wallet_transaction.create({
                    data: {
                        customer_id: customerId,
                        amount,
                        transaction_type: 'refund',
                        description,
                        balance_before: currentBalance,
                        balance_after: newBalance,
                    } satisfies Prisma.wallet_transactionUncheckedCreateInput,
                });

                return {
                    status: true,
                    message: "Refund recorded successfully",
                    body: {
                        transaction,
                        new_balance: newBalance
                    },
                    code: 200
                };
            });
        } catch (error: any) {
            console.error("❌ Error recording refund:", error);
            return {
                status: false,
                message: error.message || "Error recording refund",
                code: 500
            };
        }
    }
}

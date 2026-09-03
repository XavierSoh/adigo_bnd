// Migrated to Prisma's native model API (prisma.payment_transaction.*) —
// see BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
import prismaDb from "../config/prismaClient";
import { Prisma } from "@prisma/client";
import { PaymentTransactionCreateDto } from "../models/payment-transaction.model";
import ResponseModel from "../models/response.model";

export interface PaymentTransactionListFilters {
    status?: string;
    purpose?: string;
    provider?: string;
    customerId?: number;
    limit?: number;
    offset?: number;
}

export class PaymentTransactionRepository {
    static async create(dto: PaymentTransactionCreateDto): Promise<ResponseModel> {
        try {
            const result = await prismaDb.payment_transaction.create({
                data: {
                    customer_id: dto.customer_id,
                    provider: dto.provider,
                    purpose: dto.purpose,
                    purpose_ref_id: dto.purpose_ref_id ?? null,
                    order_id: dto.order_id,
                    subscriber_msisdn: dto.subscriber_msisdn,
                    amount: dto.amount,
                    description: dto.description ?? null,
                    metadata: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
                    status: 'initiated',
                },
            });
            return { status: true, message: "Transaction créée", body: result, code: 201 };
        } catch (error: any) {
            console.error("❌ Error creating payment transaction:", error);
            return { status: false, message: error.message || "Erreur création transaction", code: 500 };
        }
    }

    static async setPayToken(id: number, payToken: string): Promise<ResponseModel> {
        try {
            const result = await prismaDb.payment_transaction.updateMany({
                where: { id },
                data: { pay_token: payToken, status: 'pending', updated_at: new Date() },
            });
            if (result.count === 0) return { status: false, message: "Transaction non trouvée", code: 404 };
            const updated = await prismaDb.payment_transaction.findUnique({ where: { id } });
            return { status: true, message: "OK", body: updated, code: 200 };
        } catch (error: any) {
            return { status: false, message: error.message || "Erreur mise à jour transaction", code: 500 };
        }
    }

    static async findByPayToken(payToken: string): Promise<ResponseModel> {
        try {
            const result = await prismaDb.payment_transaction.findFirst({ where: { pay_token: payToken } });
            if (!result) return { status: false, message: "Transaction non trouvée", code: 404 };
            return { status: true, message: "OK", body: result, code: 200 };
        } catch (error: any) {
            return { status: false, message: error.message || "Erreur recherche transaction", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.payment_transaction.findUnique({ where: { id } });
            if (!result) return { status: false, message: "Transaction non trouvée", code: 404 };
            return { status: true, message: "OK", body: result, code: 200 };
        } catch (error: any) {
            return { status: false, message: error.message || "Erreur recherche transaction", code: 500 };
        }
    }

    /**
     * Admin/reporting: every incoming Orange Money transaction (all
     * purposes — wallet_topup, booking, ticket_purchase, and any future
     * VTC purpose) with the paying customer's details joined in, newest
     * first. Purely a read of what PaymentService.initiate/checkStatus
     * already recorded — no call to Orange Money's API here.
     */
    static async findAll(filters: PaymentTransactionListFilters = {}): Promise<ResponseModel> {
        try {
            const { status, purpose, provider, customerId } = filters;
            const limit = Math.min(filters.limit ?? 50, 200);
            const offset = filters.offset ?? 0;

            const where: Prisma.payment_transactionWhereInput = {};
            if (status) where.status = status;
            if (purpose) where.purpose = purpose;
            if (provider) where.provider = provider;
            if (customerId) where.customer_id = customerId;

            // AMBIGUOUS CASE, flagged not guessed: the original LEFT JOINs
            // customer and flattens 4 of its columns onto each row
            // (customer_first_name, ...). Reconstructed the exact same flat
            // shape below instead of nesting a `customer` object, to keep
            // this endpoint's response contract unchanged.
            const [rows, total] = await Promise.all([
                prismaDb.payment_transaction.findMany({
                    where,
                    include: { customer: { select: { first_name: true, last_name: true, email: true, phone: true } } },
                    orderBy: { created_at: 'desc' },
                    take: limit,
                    skip: offset,
                }),
                prismaDb.payment_transaction.count({ where }),
            ]);
            const transactions = rows.map(({ customer, ...pt }) => ({
                ...pt,
                customer_first_name: customer?.first_name ?? null,
                customer_last_name: customer?.last_name ?? null,
                customer_email: customer?.email ?? null,
                customer_phone: customer?.phone ?? null,
            }));

            return {
                status: true,
                message: "Transactions récupérées",
                body: { transactions, total, limit, offset },
                code: 200,
            };
        } catch (error: any) {
            return { status: false, message: error.message || "Erreur récupération des transactions", code: 500 };
        }
    }

    /** Records the latest known status from Orange Money, without settling anything. */
    static async updateStatus(
        id: number,
        status: string,
        providerTxnId?: string,
        errorMessage?: string
    ): Promise<ResponseModel> {
        try {
            const data: Prisma.payment_transactionUncheckedUpdateInput = { status, updated_at: new Date() };
            if (providerTxnId !== undefined) data.provider_txn_id = providerTxnId;
            if (errorMessage !== undefined) data.error_message = errorMessage;

            const result = await prismaDb.payment_transaction.updateMany({ where: { id }, data });
            if (result.count === 0) return { status: false, message: "Transaction non trouvée", code: 404 };
            const updated = await prismaDb.payment_transaction.findUnique({ where: { id } });
            return { status: true, message: "OK", body: updated, code: 200 };
        } catch (error: any) {
            return { status: false, message: error.message || "Erreur mise à jour statut", code: 500 };
        }
    }

    /**
     * Atomically claims a transaction for settlement (crediting the wallet,
     * confirming a ticket/booking...). Returns the row only if this call is
     * the one that flips settled false -> true, so a settlement handler
     * never runs twice for the same transaction even if both a status poll
     * and the async webhook see the same success at nearly the same time.
     * (`updateMany`'s WHERE still applies atomically in a single UPDATE
     * statement — the exactly-once guarantee is unchanged from the raw-SQL
     * version; only the follow-up read of the row is a separate round trip.)
     */
    static async claimForSettlement(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.payment_transaction.updateMany({
                where: { id, settled: false },
                data: { settled: true, settled_at: new Date(), updated_at: new Date() },
            });
            if (result.count === 0) return { status: false, message: "Déjà réglée ou introuvable", code: 409 };
            const claimed = await prismaDb.payment_transaction.findUnique({ where: { id } });
            return { status: true, message: "Réclamée pour règlement", body: claimed, code: 200 };
        } catch (error: any) {
            return { status: false, message: error.message || "Erreur réclamation transaction", code: 500 };
        }
    }
}

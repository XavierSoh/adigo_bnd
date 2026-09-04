/**
 * Provider-agnostic mobile money payment orchestrator.
 *
 * Wires together: PaymentTransactionRepository (our ledger), a
 * PaymentProvider from payment-provider.registry.ts (the actual mobile
 * money API client — Orange Money today, MTN MoMo once it's configured),
 * and the settlement registry (crediting a wallet, confirming a
 * ticket/booking...).
 *
 * Callers (wallet, ticketing, booking controllers) never talk to a
 * provider client directly — they go through initiate()/checkStatus()
 * here (optionally naming a `provider`, defaulting to 'orange_money') so
 * the ledger and idempotent settlement stay consistent across every rail.
 */

import { PaymentTransactionRepository } from "../../repository/payment-transaction.repository";
import { PaymentPurpose, PaymentTransaction } from "../../models/payment-transaction.model";
import { getPaymentProvider, PaymentProviderName } from "./payment-provider.registry";
import { runSettlement } from "./payment-settlement.registry";
import { AdminNotificationService, AdminLabel } from "../adminNotification.service";
import ResponseModel from "../../models/response.model";

export interface InitiatePaymentParams {
    customerId: number;
    /** Defaults to 'orange_money' — the only rail that existed before providers were pluggable. */
    provider?: PaymentProviderName;
    purpose: PaymentPurpose;
    purposeRefId?: number | null;
    subscriberMsisdn: string;
    amount: number;
    description: string;
    metadata?: Record<string, any>;
}

// Orange Money's own API rejects OrderId over 20 characters (confirmed via
// a live 422: "The OrderId field must be at most 20 characters long." -
// the previous ADG-<purpose>-<timestamp>-<random> format ran ~30 chars and
// silently failed every real Orange Money payment). No separators needed
// to stay unique within that budget: <=3 char purpose + base36 timestamp
// (~8 chars today) + 3 char random comfortably fits under 20.
function generateOrderId(purpose: PaymentPurpose): string {
    const shortPurpose = purpose.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `${shortPurpose}${timestamp}${random}`.slice(0, 20);
}

export class PaymentService {
    /**
     * Creates the ledger row, then drives Orange Money through
     * init -> pay. Returns as soon as Orange Money acknowledges the
     * request (status usually PENDING) — the customer still has to
     * confirm on their own phone. Use checkStatus()/the webhook to learn
     * the final outcome.
     */
    static async initiate(params: InitiatePaymentParams): Promise<ResponseModel> {
        if (!Number.isFinite(params.amount) || params.amount <= 0) {
            return { status: false, message: "Montant invalide", code: 400 };
        }
        if (!params.subscriberMsisdn) {
            return { status: false, message: "Numéro de téléphone (mobile money) du client requis", code: 400 };
        }

        const provider = params.provider ?? 'orange_money';

        const createResult = await PaymentTransactionRepository.create({
            customer_id: params.customerId,
            provider,
            purpose: params.purpose,
            purpose_ref_id: params.purposeRefId ?? null,
            order_id: generateOrderId(params.purpose),
            subscriber_msisdn: params.subscriberMsisdn,
            amount: params.amount,
            description: params.description,
            metadata: params.metadata,
        });

        if (!createResult.status) return createResult;
        const transaction = createResult.body as PaymentTransaction;

        try {
            const providerClient = getPaymentProvider(provider);
            const payToken = await providerClient.initPayment();
            await PaymentTransactionRepository.setPayToken(transaction.id, payToken);

            const payResult = await providerClient.executePayment({
                payToken,
                subscriberMsisdn: params.subscriberMsisdn,
                amount: params.amount,
                orderId: transaction.order_id,
                description: params.description,
            });

            await PaymentTransactionRepository.updateStatus(transaction.id, payResult.status, payResult.txnId);

            return {
                status: true,
                message: payResult.message || "Paiement initié — confirmez sur votre téléphone",
                body: {
                    transactionId: transaction.id,
                    payToken,
                    status: payResult.status,
                },
                code: 200,
            };
        } catch (error: any) {
            const message = error?.message || "Erreur du fournisseur de paiement";
            await PaymentTransactionRepository.updateStatus(transaction.id, 'failed', undefined, message);
            return { status: false, message, code: 502 };
        }
    }

    /**
     * Re-checks a transaction's status directly against Orange Money
     * (never trust a client- or webhook-supplied status), updates the
     * ledger, and — exactly once — runs settlement on success.
     */
    static async checkStatus(payToken: string): Promise<ResponseModel> {
        const findResult = await PaymentTransactionRepository.findByPayToken(payToken);
        if (!findResult.status) return findResult;
        const transaction = findResult.body as PaymentTransaction;

        if (transaction.settled) {
            return { status: true, message: "Déjà réglée", body: transaction, code: 200 };
        }

        let providerStatus: string;
        try {
            const providerClient = getPaymentProvider(transaction.provider);
            const result = await providerClient.getPaymentStatus(payToken);
            providerStatus = result.status;
            await PaymentTransactionRepository.updateStatus(transaction.id, providerStatus, result.txnId);
        } catch (error: any) {
            return { status: false, message: error?.message || "Erreur du fournisseur de paiement", code: 502 };
        }

        if (providerStatus === 'SUCCESSFULL') {
            const claim = await PaymentTransactionRepository.claimForSettlement(transaction.id);
            if (claim.status) {
                const settledTransaction = claim.body as PaymentTransaction;
                await runSettlement(settledTransaction);
                // One place for every Orange-Money-confirmed payment
                // (booking, ticket purchase, wallet top-up...) instead of a
                // duplicate hook in each settlement handler.
                AdminNotificationService.notify({
                    customerId: settledTransaction.customer_id,
                    heading: { fr: "Paiement Orange Money confirmé", en: "Orange Money payment confirmed" },
                    lines: [
                        [AdminLabel.purpose, settledTransaction.purpose],
                        [AdminLabel.amount, `${settledTransaction.amount} XAF`],
                        [AdminLabel.customerId, String(settledTransaction.customer_id)],
                        [AdminLabel.reference, settledTransaction.order_id],
                    ],
                });
                return { status: true, message: "Paiement confirmé", body: settledTransaction, code: 200 };
            }
            // Someone else (webhook or a concurrent poll) already claimed it — not an error.
        }

        const refreshed = await PaymentTransactionRepository.findById(transaction.id);
        return refreshed.status
            ? { status: true, message: `Statut : ${providerStatus}`, body: refreshed.body, code: 200 }
            : refreshed;
    }
}

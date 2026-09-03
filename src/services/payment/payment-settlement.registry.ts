/**
 * Settlement handler registry.
 *
 * The payment engine (payment.service.ts) doesn't know how to credit a
 * wallet or confirm a ticket purchase — each module that can be paid for
 * via Orange Money registers its own handler here, keyed by `purpose`.
 * Modules stay decoupled from the payment engine and from each other.
 *
 * Handlers are registered at process startup by importing the
 * settlement-handlers/*.ts files once for their side effect (see app.ts).
 */

import { PaymentPurpose, PaymentTransaction } from "../../models/payment-transaction.model";

type SettlementHandler = (transaction: PaymentTransaction) => Promise<void>;

const handlers: Partial<Record<PaymentPurpose, SettlementHandler>> = {};

export function registerSettlementHandler(purpose: PaymentPurpose, handler: SettlementHandler): void {
    handlers[purpose] = handler;
}

/**
 * Runs the handler for a transaction's purpose. Callers must have already
 * atomically claimed the transaction (PaymentTransactionRepository.claimForSettlement)
 * before calling this, so a handler never runs twice for the same payment.
 */
export async function runSettlement(transaction: PaymentTransaction): Promise<void> {
    const handler = handlers[transaction.purpose];
    if (!handler) {
        console.error(
            `⚠️  No settlement handler registered for purpose "${transaction.purpose}" ` +
            `(transaction ${transaction.id}) — payment confirmed by Orange Money but nothing was credited/confirmed downstream.`
        );
        return;
    }
    await handler(transaction);
}

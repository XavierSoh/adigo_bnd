/**
 * Payment provider registry.
 *
 * Mirrors payment-settlement.registry.ts, but on the other side of the
 * payment engine: instead of "what do I credit once a payment succeeds"
 * (settlement, keyed by `purpose`), this is "which mobile money API do I
 * actually call" (transport, keyed by `provider`). PaymentService talks to
 * whichever provider a transaction asks for through this registry instead
 * of importing a concrete client — that's what lets a second rail (MTN
 * MoMo) sit next to Orange Money without PaymentService or its callers
 * changing.
 *
 * Providers self-register at process startup by importing
 * providers/*.ts once for their side effect (see app.ts), same convention
 * as the settlement handlers.
 */

export type PaymentProviderName = 'orange_money' | 'mtn_momo';

export interface PaymentProviderPayResult {
    payToken: string;
    status: string;
    txnId?: string;
    message?: string;
}

export interface PaymentProviderStatusResult {
    payToken: string;
    status: string;
    txnId?: string;
}

/**
 * Shape every mobile money rail must implement. OrangeMoneyService's
 * static methods already match this structurally — it's registered as-is,
 * no wrapper needed.
 */
export interface PaymentProvider {
    initPayment(): Promise<string>;
    executePayment(params: {
        payToken: string;
        subscriberMsisdn: string;
        amount: number;
        orderId: string;
        description: string;
    }): Promise<PaymentProviderPayResult>;
    getPaymentStatus(payToken: string): Promise<PaymentProviderStatusResult>;
}

const providers: Partial<Record<PaymentProviderName, PaymentProvider>> = {};

export function registerPaymentProvider(name: PaymentProviderName, provider: PaymentProvider): void {
    providers[name] = provider;
}

/** Throws if the provider isn't registered (shouldn't happen — providers/index.ts registers all of them at startup). */
export function getPaymentProvider(name: PaymentProviderName): PaymentProvider {
    const provider = providers[name];
    if (!provider) {
        throw new Error(`Provider de paiement "${name}" non enregistré.`);
    }
    return provider;
}

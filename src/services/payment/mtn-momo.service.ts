/**
 * MTN Mobile Money client — STUB.
 *
 * No MTN MoMo credentials/API access exist yet (confirmed with the user).
 * This exists purely so `mtn_momo` is a real, selectable provider end to
 * end (DB constraint, registry, desktop admin display) without pretending
 * a working integration exists. Every call fails clearly and immediately —
 * callers get a normal caught error (PaymentService.initiate() already
 * marks the ledger row 'failed' with the message below), not a silent
 * simulation like the mobile app's old client-side MTNMoMoService mock.
 *
 * To make this real once credentials exist: implement initPayment /
 * executePayment / getPaymentStatus against the MTN Collections API
 * (Request to Pay), following the same shape as orange-money.service.ts
 * (same PaymentProvider interface, same OAuth-then-call structure) — no
 * change needed in PaymentService or payment-provider.registry.ts, only
 * the provider.register call in providers/mtn-momo.provider.ts stays,
 * pointing at this now-real implementation.
 */

export class MTNMoMoApiError extends Error {
    constructor(message = "MTN Mobile Money n'est pas encore configuré côté serveur.") {
        super(message);
        this.name = 'MTNMoMoApiError';
    }
}

export class MTNMoMoService {
    static async initPayment(): Promise<string> {
        throw new MTNMoMoApiError();
    }

    static async executePayment(_params: {
        payToken: string;
        subscriberMsisdn: string;
        amount: number;
        orderId: string;
        description: string;
    }): Promise<{ payToken: string; status: string; txnId?: string; message?: string }> {
        throw new MTNMoMoApiError();
    }

    static async getPaymentStatus(
        _payToken: string
    ): Promise<{ payToken: string; status: string; txnId?: string }> {
        throw new MTNMoMoApiError();
    }
}

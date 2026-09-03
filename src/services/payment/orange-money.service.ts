/**
 * Orange Money API client (Merchant Payment / "mp" flow).
 *
 * Reference: spec/Guide_Utilisateur_OMAPI___Production.pdf,
 * spec/MODOP OM API.pdf.
 *
 * Flow implemented here:
 *   1. getAccessToken()      POST /token                          (cached, ~1h)
 *   2. initPayment()         POST /omcoreapis/1.0.2/mp/init        -> payToken
 *   3. executePayment()      POST /omcoreapis/1.0.2/mp/pay         -> PENDING
 *      (Orange pushes a confirmation prompt to the customer's own phone;
 *      they approve with their own PIN — we never collect or see it)
 *   4. getPaymentStatus()    GET  /omcoreapis/1.0.2/mp/paymentstatus/:payToken
 *      -> INITIATED | PENDING | SUCCESSFULL | FAILED | EXPIRED
 *
 * CASHIN (merchant float deposit) is not implemented — it's a different use
 * case (crediting the merchant's own account), not customer payment.
 */

import fetch from 'node-fetch';
import { getOrangeMoneyConfig } from '../../config/orange_money.config';

export type OrangeMoneyPaymentStatus =
    | 'INITIATED'
    | 'PENDING'
    | 'SUCCESSFULL'
    | 'FAILED'
    | 'EXPIRED';

export interface OrangeMoneyPayResult {
    payToken: string;
    status: string;
    txnId?: string;
    message?: string;
    raw: any;
}

export interface OrangeMoneyStatusResult {
    payToken: string;
    status: string;
    txnId?: string;
    amount?: number;
    raw: any;
}

interface CachedToken {
    accessToken: string;
    expiresAt: number; // epoch ms
}

let cachedToken: CachedToken | null = null;

export class OrangeMoneyApiError extends Error {
    readonly httpStatus?: number;
    readonly body?: any;

    constructor(message: string, httpStatus?: number, body?: any) {
        super(message);
        this.name = 'OrangeMoneyApiError';
        this.httpStatus = httpStatus;
        this.body = body;
    }
}

function basicAuthHeader(username: string, password: string): string {
    return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}

async function parseJsonSafely(response: import('node-fetch').Response): Promise<any> {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        return { raw: text };
    }
}

export class OrangeMoneyService {
    /** Fetches (and caches) an OAuth2 access token via client_credentials. */
    static async getAccessToken(): Promise<string> {
        const now = Date.now();
        if (cachedToken && cachedToken.expiresAt > now + 30_000) {
            return cachedToken.accessToken;
        }

        const config = getOrangeMoneyConfig();
        const response = await fetch(`${config.baseUrl}/token`, {
            method: 'POST',
            headers: {
                Authorization: basicAuthHeader(config.consumerKey, config.consumerSecret),
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
        });

        const data = await parseJsonSafely(response);
        if (!response.ok || !data.access_token) {
            throw new OrangeMoneyApiError(
                `Échec de génération du token Orange Money (${response.status})`,
                response.status,
                data
            );
        }

        cachedToken = {
            accessToken: data.access_token,
            expiresAt: now + (Number(data.expires_in) || 3600) * 1000,
        };
        return cachedToken.accessToken;
    }

    private static async authHeaders(): Promise<Record<string, string>> {
        const config = getOrangeMoneyConfig();
        const accessToken = await this.getAccessToken();
        return {
            Authorization: `Bearer ${accessToken}`,
            // Per spec, X-AUTH-TOKEN is the raw base64(username:password) —
            // unlike Authorization, it does NOT get a "Basic " prefix.
            'X-AUTH-TOKEN': Buffer.from(`${config.apiUsername}:${config.apiPassword}`).toString('base64'),
            'Content-Type': 'application/json',
        };
    }

    /** Step 1: initialize a merchant payment, returns a payToken. */
    static async initPayment(): Promise<string> {
        const config = getOrangeMoneyConfig();
        const headers = await this.authHeaders();
        const response = await fetch(`${config.baseUrl}/omcoreapis/1.0.2/mp/init`, {
            method: 'POST',
            headers,
        });
        const data = await parseJsonSafely(response);
        const payToken = data?.data?.payToken;
        if (!response.ok || !payToken) {
            throw new OrangeMoneyApiError(
                data?.message || `Échec d'initialisation du paiement Orange Money (${response.status})`,
                response.status,
                data
            );
        }
        return payToken;
    }

    /**
     * Step 2: execute the payment. `subscriberMsisdn` is the paying
     * customer's own OM number — the only customer-supplied value here.
     * channelUserMsisdn/pin are always the merchant's own credentials from
     * config, never taken from a request body.
     */
    static async executePayment(params: {
        payToken: string;
        subscriberMsisdn: string;
        amount: number;
        orderId: string;
        description: string;
    }): Promise<OrangeMoneyPayResult> {
        const config = getOrangeMoneyConfig();
        const headers = await this.authHeaders();

        const response = await fetch(`${config.baseUrl}/omcoreapis/1.0.2/mp/pay`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                subscriberMsisdn: params.subscriberMsisdn,
                channelUserMsisdn: config.merchantMsisdn,
                amount: String(Math.round(params.amount)),
                description: params.description.slice(0, 100),
                orderId: params.orderId,
                pin: config.merchantPin,
                payToken: params.payToken,
                notifUrl: config.notifUrl || '',
            }),
        });

        const data = await parseJsonSafely(response);
        if (!response.ok) {
            throw new OrangeMoneyApiError(
                data?.message || `Échec du paiement Orange Money (${response.status})`,
                response.status,
                data
            );
        }

        return {
            payToken: params.payToken,
            status: data?.data?.status || 'PENDING',
            txnId: data?.data?.txnid,
            message: data?.data?.inittxnmessage || data?.message,
            raw: data,
        };
    }

    /** Step 3: poll the payment status. */
    static async getPaymentStatus(payToken: string): Promise<OrangeMoneyStatusResult> {
        const config = getOrangeMoneyConfig();
        const headers = await this.authHeaders();

        const response = await fetch(
            `${config.baseUrl}/omcoreapis/1.0.2/mp/paymentstatus/${encodeURIComponent(payToken)}`,
            { method: 'GET', headers }
        );

        const data = await parseJsonSafely(response);
        if (!response.ok) {
            throw new OrangeMoneyApiError(
                data?.message || `Échec de vérification du statut Orange Money (${response.status})`,
                response.status,
                data
            );
        }

        return {
            payToken,
            status: data?.data?.status || 'PENDING',
            txnId: data?.data?.txnid,
            amount: data?.data?.amount,
            raw: data,
        };
    }

    /** Resends the confirmation push to the customer's phone, if needed. */
    static async sendPush(payToken: string): Promise<void> {
        const config = getOrangeMoneyConfig();
        const headers = await this.authHeaders();
        const response = await fetch(
            `${config.baseUrl}/omcoreapis/1.0.2/mp/push/${encodeURIComponent(payToken)}`,
            { method: 'GET', headers }
        );
        if (!response.ok) {
            const data = await parseJsonSafely(response);
            throw new OrangeMoneyApiError(
                data?.message || `Échec de l'envoi du push Orange Money (${response.status})`,
                response.status,
                data
            );
        }
    }
}

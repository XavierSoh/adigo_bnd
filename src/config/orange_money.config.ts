/**
 * Orange Money (OMAPI) configuration.
 *
 * Two distinct credential pairs are required (see spec/Guide_Utilisateur_OMAPI___Production.pdf):
 *  - consumerKey/consumerSecret : OAuth2 client credentials, used as Basic Auth
 *    against POST /token to obtain an access_token (Bearer).
 *  - apiUsername/apiPassword    : combined into the X-AUTH-TOKEN header
 *    (base64(apiUsername:apiPassword)) required on every business endpoint.
 *  - merchantMsisdn/merchantPin : the MERCHANT's own Orange Money channel
 *    account — NOT the paying customer's. The customer only ever supplies
 *    their own phone number (subscriberMsisdn); they confirm the payment on
 *    their own device with their own PIN, which this backend never sees.
 *
 * Same base URL serves both sandbox and production — which one you hit
 * depends entirely on which set of keys (Clefs du Bac à sable vs Clefs de
 * Production) these env vars hold.
 *
 * Resolved lazily (not at import time) so the server can start without
 * Orange Money configured — only the payment endpoints that actually need
 * it will fail, with a clear message, until it's set up.
 */

export interface OrangeMoneyConfig {
    baseUrl: string;
    consumerKey: string;
    consumerSecret: string;
    apiUsername: string;
    apiPassword: string;
    merchantMsisdn: string;
    merchantPin: string;
    notifUrl?: string;
}

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Orange Money non configuré : la variable d'environnement ${name} est manquante. ` +
            `Voir .env.example pour la liste complète des variables ORANGE_MONEY_*.`
        );
    }
    return value;
}

export function getOrangeMoneyConfig(): OrangeMoneyConfig {
    return {
        baseUrl: process.env.ORANGE_MONEY_BASE_URL || 'https://api-s1.orange.cm',
        consumerKey: required('ORANGE_MONEY_CONSUMER_KEY'),
        consumerSecret: required('ORANGE_MONEY_CONSUMER_SECRET'),
        apiUsername: required('ORANGE_MONEY_API_USERNAME'),
        apiPassword: required('ORANGE_MONEY_API_PASSWORD'),
        merchantMsisdn: required('ORANGE_MONEY_MERCHANT_MSISDN'),
        merchantPin: required('ORANGE_MONEY_MERCHANT_PIN'),
        notifUrl: process.env.ORANGE_MONEY_NOTIF_URL,
    };
}

/** True if Orange Money looks configured, without throwing — for status/health checks. */
export function isOrangeMoneyConfigured(): boolean {
    try {
        getOrangeMoneyConfig();
        return true;
    } catch {
        return false;
    }
}

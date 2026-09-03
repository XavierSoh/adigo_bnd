/**
 * OrangeMoneyService — HTTP client for the Orange Money merchant payment
 * flow. node-fetch is mocked; nothing here talks to the real Orange API.
 */

jest.mock('node-fetch');

const ORANGE_MONEY_ENV = {
    ORANGE_MONEY_BASE_URL: 'https://om.test',
    ORANGE_MONEY_CONSUMER_KEY: 'consumer-key',
    ORANGE_MONEY_CONSUMER_SECRET: 'consumer-secret',
    ORANGE_MONEY_API_USERNAME: 'api-user',
    ORANGE_MONEY_API_PASSWORD: 'api-pass',
    ORANGE_MONEY_MERCHANT_MSISDN: '691000000',
    ORANGE_MONEY_MERCHANT_PIN: '1234',
};

function fakeResponse(ok: boolean, status: number, body: any) {
    return {
        ok,
        status,
        text: async () => JSON.stringify(body),
    };
}

describe('OrangeMoneyService', () => {
    // Each test gets a fresh module instance so the in-memory token cache
    // (module-level state) never leaks between tests.
    let OrangeMoneyService: typeof import('../../src/services/payment/orange-money.service').OrangeMoneyService;
    let OrangeMoneyApiError: typeof import('../../src/services/payment/orange-money.service').OrangeMoneyApiError;
    let mockedFetch: jest.Mock;

    beforeEach(() => {
        jest.resetModules();
        Object.assign(process.env, ORANGE_MONEY_ENV);

        mockedFetch = require('node-fetch') as unknown as jest.Mock;
        const loaded = require('../../src/services/payment/orange-money.service');
        OrangeMoneyService = loaded.OrangeMoneyService;
        OrangeMoneyApiError = loaded.OrangeMoneyApiError;
    });

    it('caches the access token and only calls /token once for repeated requests', async () => {
        mockedFetch.mockResolvedValue(
            fakeResponse(true, 200, { access_token: 'tok-1', expires_in: 3600, token_type: 'Bearer' })
        );

        const first = await OrangeMoneyService.getAccessToken();
        const second = await OrangeMoneyService.getAccessToken();

        expect(first).toBe('tok-1');
        expect(second).toBe('tok-1');
        expect(mockedFetch).toHaveBeenCalledTimes(1);
        expect(mockedFetch).toHaveBeenCalledWith(
            'https://om.test/token',
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('throws OrangeMoneyApiError when the token endpoint fails', async () => {
        mockedFetch.mockResolvedValue(fakeResponse(false, 401, { message: 'invalid client' }));

        await expect(OrangeMoneyService.getAccessToken()).rejects.toBeInstanceOf(OrangeMoneyApiError);
    });

    it('initPayment returns the payToken from a successful mp/init call', async () => {
        mockedFetch
            .mockResolvedValueOnce(fakeResponse(true, 200, { access_token: 'tok-1', expires_in: 3600 }))
            .mockResolvedValueOnce(
                fakeResponse(true, 200, {
                    message: 'Merchant payment request successfully initiated',
                    data: { payToken: 'MP12345' },
                })
            );

        const payToken = await OrangeMoneyService.initPayment();

        expect(payToken).toBe('MP12345');
        const initCall = mockedFetch.mock.calls[1];
        expect(initCall[0]).toBe('https://om.test/omcoreapis/1.0.2/mp/init');
        expect(initCall[1].headers['X-AUTH-TOKEN']).toBe(
            Buffer.from('api-user:api-pass').toString('base64')
        );
    });

    it('executePayment sends the merchant\'s own msisdn/pin, never the customer\'s', async () => {
        mockedFetch
            .mockResolvedValueOnce(fakeResponse(true, 200, { access_token: 'tok-1', expires_in: 3600 }))
            .mockResolvedValueOnce(
                fakeResponse(true, 200, {
                    data: { status: 'PENDING', txnid: 'MP250505.1707.A1', inittxnmessage: 'Confirmez sur votre téléphone' },
                })
            );

        const result = await OrangeMoneyService.executePayment({
            payToken: 'MP12345',
            subscriberMsisdn: '677000000',
            amount: 1500,
            orderId: 'ADG-TEST-1',
            description: 'Test payment',
        });

        expect(result.status).toBe('PENDING');
        expect(result.txnId).toBe('MP250505.1707.A1');

        const payCall = mockedFetch.mock.calls[1];
        const sentBody = JSON.parse(payCall[1].body);
        expect(sentBody.subscriberMsisdn).toBe('677000000'); // the customer
        expect(sentBody.channelUserMsisdn).toBe('691000000'); // the merchant, from config
        expect(sentBody.pin).toBe('1234'); // the merchant's pin, from config — never customer-supplied
        expect(sentBody.amount).toBe('1500');
    });

    it('getPaymentStatus parses the status payload', async () => {
        mockedFetch
            .mockResolvedValueOnce(fakeResponse(true, 200, { access_token: 'tok-1', expires_in: 3600 }))
            .mockResolvedValueOnce(
                fakeResponse(true, 200, { data: { status: 'SUCCESSFULL', txnid: 'MP1', amount: 1500 } })
            );

        const result = await OrangeMoneyService.getPaymentStatus('MP12345');

        expect(result.status).toBe('SUCCESSFULL');
        expect(result.amount).toBe(1500);
    });
});

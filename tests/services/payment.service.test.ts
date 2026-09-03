/**
 * PaymentService — the orchestrator shared by wallet top-up, ticket
 * purchase and booking payment. OrangeMoneyService and the DB are mocked;
 * this only verifies the orchestration logic itself (ledger writes,
 * exactly-once settlement).
 */

jest.mock('../../src/services/payment/orange-money.service');
jest.mock('../../src/config/pgdb');

import pgpDb from '../../src/config/pgdb';
import { OrangeMoneyService } from '../../src/services/payment/orange-money.service';
import { PaymentService } from '../../src/services/payment/payment.service';
import { registerSettlementHandler } from '../../src/services/payment/payment-settlement.registry';

const mockedOne = pgpDb.one as jest.Mock;
const mockedOneOrNone = pgpDb.oneOrNone as jest.Mock;
const mockedInitPayment = OrangeMoneyService.initPayment as jest.Mock;
const mockedExecutePayment = OrangeMoneyService.executePayment as jest.Mock;
const mockedGetPaymentStatus = OrangeMoneyService.getPaymentStatus as jest.Mock;

describe('PaymentService.initiate', () => {
    it('creates the ledger row, gets a payToken, executes the payment, and reports PENDING', async () => {
        mockedOne.mockResolvedValueOnce({
            id: 1,
            purpose: 'wallet_topup',
            order_id: 'ADG-WALLET-1',
            customer_id: 10,
        });
        mockedOneOrNone
            .mockResolvedValueOnce({ id: 1, pay_token: 'MP123' }) // setPayToken
            .mockResolvedValueOnce({ id: 1, status: 'pending' }); // updateStatus
        mockedInitPayment.mockResolvedValueOnce('MP123');
        mockedExecutePayment.mockResolvedValueOnce({
            payToken: 'MP123',
            status: 'PENDING',
            txnId: 'TXN1',
            message: 'Confirmez sur votre téléphone',
        });

        const result = await PaymentService.initiate({
            customerId: 10,
            purpose: 'wallet_topup',
            subscriberMsisdn: '677000000',
            amount: 2000,
            description: 'Rechargement',
        });

        expect(result.status).toBe(true);
        expect((result.body as any).payToken).toBe('MP123');
        expect((result.body as any).status).toBe('PENDING');
        expect(mockedInitPayment).toHaveBeenCalledTimes(1);
        expect(mockedExecutePayment).toHaveBeenCalledWith(
            expect.objectContaining({ payToken: 'MP123', subscriberMsisdn: '677000000', amount: 2000 })
        );
    });

    it('rejects a non-positive amount before ever calling Orange Money', async () => {
        const result = await PaymentService.initiate({
            customerId: 10,
            purpose: 'wallet_topup',
            subscriberMsisdn: '677000000',
            amount: 0,
            description: 'Rechargement',
        });

        expect(result.status).toBe(false);
        expect(result.code).toBe(400);
        expect(mockedInitPayment).not.toHaveBeenCalled();
    });
});

describe('PaymentService.checkStatus', () => {
    it('settles exactly once when Orange Money reports SUCCESSFULL', async () => {
        const transaction = {
            id: 5,
            pay_token: 'MP555',
            purpose: 'wallet_topup',
            customer_id: 10,
            amount: 3000,
            settled: false,
        };

        // findByPayToken
        mockedOneOrNone.mockResolvedValueOnce(transaction);
        mockedGetPaymentStatus.mockResolvedValueOnce({ payToken: 'MP555', status: 'SUCCESSFULL', txnId: 'TXN9' });
        // updateStatus
        mockedOneOrNone.mockResolvedValueOnce({ ...transaction, status: 'successful' });
        // claimForSettlement succeeds (flips settled false -> true)
        mockedOneOrNone.mockResolvedValueOnce({ ...transaction, status: 'successful', settled: true });

        let settleCount = 0;
        registerSettlementHandler('wallet_topup', async () => {
            settleCount += 1;
        });

        const result = await PaymentService.checkStatus('MP555');

        expect(result.status).toBe(true);
        expect(settleCount).toBe(1);
    });

    it('does not run settlement again for an already-settled transaction', async () => {
        mockedOneOrNone.mockResolvedValueOnce({
            id: 6,
            pay_token: 'MP666',
            purpose: 'wallet_topup',
            settled: true,
        });

        let settleCount = 0;
        registerSettlementHandler('wallet_topup', async () => {
            settleCount += 1;
        });

        const result = await PaymentService.checkStatus('MP666');

        expect(result.status).toBe(true);
        expect(settleCount).toBe(0);
        expect(mockedGetPaymentStatus).not.toHaveBeenCalled();
    });
});

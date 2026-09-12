/**
 * PaymentService — the orchestrator shared by wallet top-up, ticket
 * purchase and booking payment. PaymentTransactionRepository and
 * OrangeMoneyService are both mocked; this only verifies the orchestration
 * logic itself (ledger writes, exactly-once settlement) — never a real DB
 * or a real Orange Money call.
 *
 * Rewritten 2026-09-12: this whole file failed to even load — it (and
 * `tests/setup.ts`, shared by every suite in this project) still mocked
 * `src/config/pgdb`, the pg-promise client PaymentTransactionRepository
 * was migrated off of onto Prisma a while ago (see that repository's own
 * "Full Prisma relational-API migration" comment) and which no longer
 * exists on disk at all. Found live auditing "l'API orange et les
 * paiements des bookings" — every Jest suite in the backend (11 of them,
 * not just this one) had been silently failing to run at all as a result.
 */

jest.mock('../../src/repository/payment-transaction.repository');
jest.mock('../../src/services/payment/orange-money.service');

import { PaymentTransactionRepository } from '../../src/repository/payment-transaction.repository';
import { OrangeMoneyService } from '../../src/services/payment/orange-money.service';
import { PaymentService } from '../../src/services/payment/payment.service';
import { registerSettlementHandler } from '../../src/services/payment/payment-settlement.registry';
// Side-effect import: registers the (now-mocked) OrangeMoneyService as the
// 'orange_money' provider — PaymentService resolves providers through this
// registry, never by importing OrangeMoneyService directly (see
// payment-provider.registry.ts).
import '../../src/services/payment/providers/orange-money.provider';

const mockedCreate = PaymentTransactionRepository.create as jest.Mock;
const mockedSetPayToken = PaymentTransactionRepository.setPayToken as jest.Mock;
const mockedUpdateStatus = PaymentTransactionRepository.updateStatus as jest.Mock;
const mockedFindByPayToken = PaymentTransactionRepository.findByPayToken as jest.Mock;
const mockedFindById = PaymentTransactionRepository.findById as jest.Mock;
const mockedClaimForSettlement = PaymentTransactionRepository.claimForSettlement as jest.Mock;
const mockedInitPayment = OrangeMoneyService.initPayment as jest.Mock;
const mockedExecutePayment = OrangeMoneyService.executePayment as jest.Mock;
const mockedGetPaymentStatus = OrangeMoneyService.getPaymentStatus as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('PaymentService.initiate', () => {
    it('creates the ledger row, gets a payToken, executes the payment, and reports PENDING', async () => {
        mockedCreate.mockResolvedValueOnce({
            status: true,
            body: { id: 1, purpose: 'wallet_topup', order_id: 'ADG-WALLET-1', customer_id: 10 },
            code: 201,
        });
        mockedSetPayToken.mockResolvedValueOnce({ status: true, body: { id: 1, pay_token: 'MP123' }, code: 200 });
        mockedInitPayment.mockResolvedValueOnce('MP123');
        mockedExecutePayment.mockResolvedValueOnce({
            payToken: 'MP123',
            status: 'PENDING',
            txnId: 'TXN1',
            message: 'Confirmez sur votre téléphone',
        });
        mockedUpdateStatus.mockResolvedValueOnce({ status: true, body: { id: 1, status: 'pending' }, code: 200 });

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
        expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('rejects a missing subscriber phone number before ever calling Orange Money', async () => {
        const result = await PaymentService.initiate({
            customerId: 10,
            purpose: 'wallet_topup',
            subscriberMsisdn: '',
            amount: 2000,
            description: 'Rechargement',
        });

        expect(result.status).toBe(false);
        expect(result.code).toBe(400);
        expect(mockedInitPayment).not.toHaveBeenCalled();
    });

    it('marks the transaction failed and surfaces a translated message when Orange Money rejects the charge', async () => {
        mockedCreate.mockResolvedValueOnce({
            status: true,
            body: { id: 2, purpose: 'wallet_topup', order_id: 'ADG-2', customer_id: 10 },
            code: 201,
        });
        // Orange Money's own raw, code-prefixed error format — see
        // PaymentService's ORANGE_MONEY_ERROR_MESSAGES doc comment.
        mockedInitPayment.mockRejectedValueOnce(
            new Error('60019 ::  Le solde du compte du payeur est insuffisant')
        );
        mockedUpdateStatus.mockResolvedValueOnce({ status: true, body: {}, code: 200 });

        const result = await PaymentService.initiate({
            customerId: 10,
            purpose: 'wallet_topup',
            subscriberMsisdn: '677000000',
            amount: 2000,
            description: 'Rechargement',
        });

        expect(result.status).toBe(false);
        expect(result.code).toBe(502);
        // The raw provider message is stored in the ledger for admin/debugging...
        expect(mockedUpdateStatus).toHaveBeenCalledWith(2, 'failed', undefined, expect.stringContaining('60019'));
    });
});

describe('PaymentService.checkStatus', () => {
    it('settles exactly once when Orange Money reports SUCCESSFULL', async () => {
        const transaction = {
            id: 5,
            pay_token: 'MP555',
            provider: 'orange_money',
            purpose: 'wallet_topup',
            customer_id: 10,
            amount: 3000,
            settled: false,
        };

        mockedFindByPayToken.mockResolvedValueOnce({ status: true, body: transaction, code: 200 });
        mockedGetPaymentStatus.mockResolvedValueOnce({ payToken: 'MP555', status: 'SUCCESSFULL', txnId: 'TXN9' });
        mockedUpdateStatus.mockResolvedValueOnce({ status: true, body: { ...transaction, status: 'successful' }, code: 200 });
        mockedClaimForSettlement.mockResolvedValueOnce({
            status: true,
            body: { ...transaction, status: 'successful', settled: true },
            code: 200,
        });

        let settleCount = 0;
        registerSettlementHandler('wallet_topup', async () => {
            settleCount += 1;
        });

        const result = await PaymentService.checkStatus('MP555');

        expect(result.status).toBe(true);
        expect(settleCount).toBe(1);
        expect(mockedClaimForSettlement).toHaveBeenCalledWith(5);
    });

    it('does not run settlement again for an already-settled transaction', async () => {
        mockedFindByPayToken.mockResolvedValueOnce({
            status: true,
            body: { id: 6, pay_token: 'MP666', purpose: 'wallet_topup', settled: true },
            code: 200,
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

    it('does not settle while Orange Money still reports PENDING', async () => {
        const transaction = { id: 7, pay_token: 'MP777', provider: 'orange_money', purpose: 'wallet_topup', settled: false };
        mockedFindByPayToken.mockResolvedValueOnce({ status: true, body: transaction, code: 200 });
        mockedGetPaymentStatus.mockResolvedValueOnce({ payToken: 'MP777', status: 'PENDING' });
        mockedUpdateStatus.mockResolvedValueOnce({ status: true, body: { ...transaction, status: 'pending' }, code: 200 });
        mockedFindById.mockResolvedValueOnce({ status: true, body: { ...transaction, status: 'pending' }, code: 200 });

        let settleCount = 0;
        registerSettlementHandler('wallet_topup', async () => {
            settleCount += 1;
        });

        const result = await PaymentService.checkStatus('MP777');

        expect(result.status).toBe(true);
        expect(settleCount).toBe(0);
        expect(mockedClaimForSettlement).not.toHaveBeenCalled();
    });

    it('surfaces a provider error without touching the ledger status', async () => {
        const transaction = { id: 8, pay_token: 'MP888', provider: 'orange_money', purpose: 'wallet_topup', settled: false };
        mockedFindByPayToken.mockResolvedValueOnce({ status: true, body: transaction, code: 200 });
        mockedGetPaymentStatus.mockRejectedValueOnce(new Error('Network timeout'));

        const result = await PaymentService.checkStatus('MP888');

        expect(result.status).toBe(false);
        expect(result.code).toBe(502);
        expect(mockedUpdateStatus).not.toHaveBeenCalled();
        expect(mockedClaimForSettlement).not.toHaveBeenCalled();
    });
});

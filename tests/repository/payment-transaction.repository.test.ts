/**
 * Rewritten 2026-09-12: this file used to mock `pgpDb.one`/`oneOrNone` and
 * assert exact raw-SQL query strings — leftover from before
 * PaymentTransactionRepository was migrated to Prisma's native model API
 * (see that repository's own "Full Prisma relational-API migration"
 * comment). It no longer even compiled (`src/config/pgdb` doesn't exist on
 * disk any more). Found live auditing "l'API orange et les paiements des
 * bookings" — rewritten to mock `prismaClient`'s `payment_transaction`
 * delegate instead, exercising the same behavioral guarantees (exactly-once
 * settlement claim, correct insert payload) against the real Prisma-based
 * implementation.
 */

jest.mock('../../src/config/prismaClient', () => ({
    __esModule: true,
    default: {
        payment_transaction: {
            create: jest.fn(),
            updateMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
    },
}));

import prismaDb from '../../src/config/prismaClient';
import { PaymentTransactionRepository } from '../../src/repository/payment-transaction.repository';

const mockedCreate = prismaDb.payment_transaction.create as jest.Mock;
const mockedUpdateMany = prismaDb.payment_transaction.updateMany as jest.Mock;
const mockedFindUnique = prismaDb.payment_transaction.findUnique as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('PaymentTransactionRepository.claimForSettlement', () => {
    it('returns the row when it successfully flips settled false -> true', async () => {
        mockedUpdateMany.mockResolvedValueOnce({ count: 1 });
        mockedFindUnique.mockResolvedValueOnce({ id: 1, settled: true, purpose: 'wallet_topup' });

        const result = await PaymentTransactionRepository.claimForSettlement(1);

        expect(result.status).toBe(true);
        expect(result.code).toBe(200);
        expect((result.body as any).id).toBe(1);
        // The atomicity guarantee lives in this WHERE clause: only a row
        // that is still settled:false can be matched and flipped.
        expect(mockedUpdateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 1, settled: false } })
        );
    });

    it('fails to claim (409) when already settled — the guarded UPDATE matches nothing', async () => {
        // A concurrent settlement already flipped the row, so the guarded
        // updateMany (WHERE settled: false) affects zero rows.
        mockedUpdateMany.mockResolvedValueOnce({ count: 0 });

        const result = await PaymentTransactionRepository.claimForSettlement(1);

        expect(result.status).toBe(false);
        expect(result.code).toBe(409);
        expect(mockedFindUnique).not.toHaveBeenCalled();
    });

    it('two concurrent claims for the same transaction never both succeed', async () => {
        // Simulates two settlement attempts racing on the same row: the DB
        // guarantees only one updateMany(... WHERE settled: false) can
        // match, however close together the two calls land.
        mockedUpdateMany
            .mockResolvedValueOnce({ count: 1 })
            .mockResolvedValueOnce({ count: 0 });
        mockedFindUnique.mockResolvedValueOnce({ id: 42, settled: true });

        const [first, second] = await Promise.all([
            PaymentTransactionRepository.claimForSettlement(42),
            PaymentTransactionRepository.claimForSettlement(42),
        ]);

        const successes = [first, second].filter((r) => r.status);
        expect(successes).toHaveLength(1);
    });
});

describe('PaymentTransactionRepository.create', () => {
    it('inserts with status "initiated", JSON-serializes metadata, and defaults purpose_ref_id/description to null', async () => {
        mockedCreate.mockResolvedValueOnce({ id: 7, status: 'initiated' });

        const result = await PaymentTransactionRepository.create({
            customer_id: 10,
            provider: 'orange_money',
            purpose: 'ticket_purchase',
            purpose_ref_id: 99,
            order_id: 'ADG-TEST-1',
            subscriber_msisdn: '677000000',
            amount: 5000,
            description: 'Billet',
            metadata: { eventId: 3 },
        });

        expect(result.status).toBe(true);
        expect(result.code).toBe(201);
        expect(mockedCreate).toHaveBeenCalledWith({
            data: {
                customer_id: 10,
                provider: 'orange_money',
                purpose: 'ticket_purchase',
                purpose_ref_id: 99,
                order_id: 'ADG-TEST-1',
                subscriber_msisdn: '677000000',
                amount: 5000,
                description: 'Billet',
                metadata: JSON.stringify({ eventId: 3 }),
                status: 'initiated',
            },
        });
    });

    it('defaults purpose_ref_id to null and omits metadata when not provided', async () => {
        mockedCreate.mockResolvedValueOnce({ id: 8, status: 'initiated' });

        await PaymentTransactionRepository.create({
            customer_id: 11,
            provider: 'orange_money',
            purpose: 'wallet_topup',
            order_id: 'ADG-TEST-2',
            subscriber_msisdn: '677000001',
            amount: 2000,
        });

        expect(mockedCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                purpose_ref_id: null,
                description: null,
                metadata: undefined,
                status: 'initiated',
            }),
        });
    });
});

describe('PaymentTransactionRepository.updateStatus', () => {
    it("normalizes Orange Money's SUCCESSFULL (double L) to the DB's successful vocabulary", async () => {
        mockedUpdateMany.mockResolvedValueOnce({ count: 1 });
        mockedFindUnique.mockResolvedValueOnce({ id: 3, status: 'successful' });

        const result = await PaymentTransactionRepository.updateStatus(3, 'SUCCESSFULL', 'TXN-1');

        expect(result.status).toBe(true);
        expect(mockedUpdateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 3 },
                data: expect.objectContaining({ status: 'successful', provider_txn_id: 'TXN-1' }),
            })
        );
    });

    it('returns 404 without throwing when no row matches the id', async () => {
        mockedUpdateMany.mockResolvedValueOnce({ count: 0 });

        const result = await PaymentTransactionRepository.updateStatus(999, 'FAILED');

        expect(result.status).toBe(false);
        expect(result.code).toBe(404);
    });
});

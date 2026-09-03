import pgpDb from '../../src/config/pgdb';
import { PaymentTransactionRepository } from '../../src/repository/payment-transaction.repository';

const mockedOneOrNone = pgpDb.oneOrNone as jest.Mock;
const mockedOne = pgpDb.one as jest.Mock;

describe('PaymentTransactionRepository.claimForSettlement', () => {
    it('returns the row when it successfully flips settled false -> true', async () => {
        mockedOneOrNone.mockResolvedValueOnce({ id: 1, settled: true, purpose: 'wallet_topup' });

        const result = await PaymentTransactionRepository.claimForSettlement(1);

        expect(result.status).toBe(true);
        expect(result.code).toBe(200);
        expect((result.body as any).id).toBe(1);
    });

    it('fails to claim (409) when already settled — the UPDATE ... WHERE settled = FALSE matches nothing', async () => {
        // A concurrent settlement already flipped the row, so the guarded
        // UPDATE affects zero rows and pg-promise's oneOrNone resolves null.
        mockedOneOrNone.mockResolvedValueOnce(null);

        const result = await PaymentTransactionRepository.claimForSettlement(1);

        expect(result.status).toBe(false);
        expect(result.code).toBe(409);
    });

    it('two concurrent claims for the same transaction never both succeed', async () => {
        // Simulates two settlement attempts racing on the same row: the DB
        // guarantees only one UPDATE ... WHERE settled = FALSE can match.
        mockedOneOrNone
            .mockResolvedValueOnce({ id: 42, settled: true })
            .mockResolvedValueOnce(null);

        const [first, second] = await Promise.all([
            PaymentTransactionRepository.claimForSettlement(42),
            PaymentTransactionRepository.claimForSettlement(42),
        ]);

        const successes = [first, second].filter((r) => r.status);
        expect(successes).toHaveLength(1);
    });
});

describe('PaymentTransactionRepository.create', () => {
    it('inserts with status "initiated" and serializes metadata to JSON', async () => {
        mockedOne.mockResolvedValueOnce({ id: 7, status: 'initiated' });

        const result = await PaymentTransactionRepository.create({
            customer_id: 10,
            purpose: 'ticket_purchase',
            purpose_ref_id: 99,
            order_id: 'ADG-TEST-1',
            subscriber_msisdn: '677000000',
            amount: 5000,
            description: 'Billet',
            metadata: { eventId: 3 },
        });

        expect(result.status).toBe(true);
        const [query, params] = mockedOne.mock.calls[0];
        expect(query).toContain('INSERT INTO payment_transaction');
        expect(query).toContain("'initiated'");
        expect(params).toEqual([
            10,
            'ticket_purchase',
            99,
            'ADG-TEST-1',
            '677000000',
            5000,
            'Billet',
            JSON.stringify({ eventId: 3 }),
        ]);
    });
});

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
        booking: {
            findMany: jest.fn(),
        },
        event_ticket: {
            findMany: jest.fn(),
        },
    },
}));

jest.mock('../../src/services/socket.service', () => ({
    SocketService: {
        broadcastListChanged: jest.fn(),
    },
}));

import prismaDb from '../../src/config/prismaClient';
import { SocketService } from '../../src/services/socket.service';
import { PaymentTransactionRepository } from '../../src/repository/payment-transaction.repository';

const mockedCreate = prismaDb.payment_transaction.create as jest.Mock;
const mockedUpdateMany = prismaDb.payment_transaction.updateMany as jest.Mock;
const mockedFindUnique = prismaDb.payment_transaction.findUnique as jest.Mock;
const mockedFindMany = prismaDb.payment_transaction.findMany as jest.Mock;
const mockedCount = prismaDb.payment_transaction.count as jest.Mock;
const mockedBookingFindMany = prismaDb.booking.findMany as jest.Mock;
const mockedEventTicketFindMany = prismaDb.event_ticket.findMany as jest.Mock;
const mockedBroadcast = SocketService.broadcastListChanged as jest.Mock;

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
        // Point 1: the desktop Paiements screen only refetches on this event.
        expect(mockedBroadcast).toHaveBeenCalledWith('dashboard', 'payment_transaction_created');
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

/**
 * Point 7 (UX_FUNCTIONAL_REVAMP_PLAN_2026-09.md): agency filter + the
 * "Agence / Organisateur" context column. purpose_ref_id has no FK (it
 * points at a booking id or a ticket id depending on `purpose`), so both
 * the agency filter and the context label are resolved via separate
 * lookups rather than a Prisma relation filter/include — this is exactly
 * the logic under test here.
 */
describe('PaymentTransactionRepository.findAll', () => {
    it('with no agencyId, does not touch booking/event_ticket at all', async () => {
        mockedFindMany.mockResolvedValueOnce([]);
        mockedCount.mockResolvedValueOnce(0);

        await PaymentTransactionRepository.findAll({});

        expect(mockedBookingFindMany).not.toHaveBeenCalled();
        const [findManyArgs] = mockedFindMany.mock.calls[0];
        expect(findManyArgs.where.purpose).toBeUndefined();
    });

    it('agencyId with no matching bookings short-circuits to an empty page, no payment_transaction query at all', async () => {
        mockedBookingFindMany.mockResolvedValueOnce([]);

        const result = await PaymentTransactionRepository.findAll({ agencyId: 5 });

        expect((result.body as any).transactions).toEqual([]);
        expect((result.body as any).total).toBe(0);
        expect(mockedFindMany).not.toHaveBeenCalled();
    });

    it('agencyId forces purpose=booking and filters purpose_ref_id to that agency\'s booking ids', async () => {
        mockedBookingFindMany.mockResolvedValueOnce([{ id: 10 }, { id: 11 }]);
        mockedFindMany.mockResolvedValueOnce([]);
        mockedCount.mockResolvedValueOnce(0);

        await PaymentTransactionRepository.findAll({ agencyId: 5 });

        const [findManyArgs] = mockedFindMany.mock.calls[0];
        expect(findManyArgs.where.purpose).toBe('booking');
        expect(findManyArgs.where.purpose_ref_id).toEqual({ in: [10, 11] });
    });

    it('resolves context_label from the booking\'s agency for purpose=booking rows', async () => {
        mockedFindMany.mockResolvedValueOnce([
            { id: 1, purpose: 'booking', purpose_ref_id: 77, customer: null },
        ]);
        mockedCount.mockResolvedValueOnce(1);
        mockedBookingFindMany.mockResolvedValueOnce([
            { id: 77, generated_trip: { trip: { agency: { name: 'Agence Douala' } } } },
        ]);

        const result = await PaymentTransactionRepository.findAll({});

        const [row] = (result.body as any).transactions;
        expect(row.context_label).toBe('Agence Douala');
    });

    it('resolves context_label from the event\'s organizer for purpose=ticket_purchase rows', async () => {
        mockedFindMany.mockResolvedValueOnce([
            { id: 2, purpose: 'ticket_purchase', purpose_ref_id: 55, customer: null },
        ]);
        mockedCount.mockResolvedValueOnce(1);
        mockedEventTicketFindMany.mockResolvedValueOnce([
            { id: 55, event: { event_organizer: { name: 'Yaoundé Events' } } },
        ]);

        const result = await PaymentTransactionRepository.findAll({});

        const [row] = (result.body as any).transactions;
        expect(row.context_label).toBe('Yaoundé Events');
    });

    it('leaves context_label null for wallet_topup rows — no agency/organizer concept applies', async () => {
        mockedFindMany.mockResolvedValueOnce([
            { id: 3, purpose: 'wallet_topup', purpose_ref_id: null, customer: null },
        ]);
        mockedCount.mockResolvedValueOnce(1);

        const result = await PaymentTransactionRepository.findAll({});

        const [row] = (result.body as any).transactions;
        expect(row.context_label).toBeNull();
        expect(mockedBookingFindMany).not.toHaveBeenCalled();
        expect(mockedEventTicketFindMany).not.toHaveBeenCalled();
    });
});

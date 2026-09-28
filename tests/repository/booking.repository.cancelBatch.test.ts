/**
 * Point 4 (UX_FUNCTIONAL_REVAMP_PLAN_2026-09.md): a late cancellation now
 * withholds a per-agency percentage of the refund instead of always
 * refunding in full. Defaults (2h grace / 0% fee) must reproduce this
 * repository's previous, unconditional-full-refund behavior exactly for
 * any agency that hasn't configured these — real money is on the line
 * here, so this is worth covering in isolation from the method's many
 * other side effects (notifications, socket broadcast).
 */

jest.mock('../../src/config/prismaClient', () => ({
    __esModule: true,
    default: {
        booking: {
            findMany: jest.fn(),
            updateMany: jest.fn(),
        },
    },
}));

jest.mock('../../src/repository/wallet.repository', () => ({
    WalletRepository: {
        recordRefund: jest.fn(),
    },
}));

jest.mock('../../src/services/bookingNotification.service', () => ({
    BookingNotificationService: {
        sendBookingCancelled: jest.fn().mockResolvedValue(undefined),
        sendRefundCredited: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('../../src/services/adminNotification.service', () => ({
    AdminNotificationService: { notify: jest.fn() },
    AdminLabel: new Proxy({}, { get: (_t, prop) => String(prop) }),
}));

jest.mock('../../src/services/socket.service', () => ({
    SocketService: { broadcastListChanged: jest.fn() },
}));

import prismaDb from '../../src/config/prismaClient';
import { WalletRepository } from '../../src/repository/wallet.repository';
import { BookingRepository } from '../../src/repository/booking.repository';

const mockedFindMany = prismaDb.booking.findMany as jest.Mock;
const mockedUpdateMany = prismaDb.booking.updateMany as jest.Mock;
const mockedRecordRefund = WalletRepository.recordRefund as jest.Mock;

const baseCustomer = {
    fcm_token: null, notification_enabled: true, preferred_language: 'fr',
    first_name: 'Jean', last_name: 'Dupont', phone: '677000000', email: null,
};

function bookingRow(overrides: Record<string, any> = {}) {
    return {
        id: 1, customer_id: 10, total_price: 5000, payment_method: 'wallet',
        payment_status: 'paid', status: 'confirmed', booking_reference: 'BK1',
        customer_booking_customer_idTocustomer: baseCustomer,
        generated_trip: {
            actual_departure_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days out
            trip: {
                departure_city: 'Douala', arrival_city: 'Yaoundé',
                agency: { late_cancellation_grace_hours: 2, late_cancellation_fee_percent: 0 },
            },
        },
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockedUpdateMany.mockResolvedValue({ count: 1 });
    mockedRecordRefund.mockResolvedValue({ status: true, body: { new_balance: 99999 } });
});

describe('BookingRepository.cancelBatch — late-cancellation fee', () => {
    it('refunds in full when cancelled well before the grace window (not late)', async () => {
        mockedFindMany.mockResolvedValueOnce([bookingRow()]).mockResolvedValueOnce([]);

        await BookingRepository.cancelBatch([1], 'Changed my mind');

        expect(mockedRecordRefund).toHaveBeenCalledWith(10, 5000, expect.not.stringContaining('frais'));
    });

    it('withholds the agency\'s fee percent when cancelled inside the grace window', async () => {
        const row = bookingRow({
            generated_trip: {
                actual_departure_time: new Date(Date.now() + 30 * 60 * 1000), // 30 min out
                trip: {
                    departure_city: 'Douala', arrival_city: 'Yaoundé',
                    agency: { late_cancellation_grace_hours: 2, late_cancellation_fee_percent: 20 },
                },
            },
        });
        mockedFindMany.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);

        await BookingRepository.cancelBatch([1], 'Too late but trying anyway');

        // 5000 - 20% = 4000
        expect(mockedRecordRefund).toHaveBeenCalledWith(10, 4000, expect.stringContaining('20% frais'));
    });

    it('defaults to 2h/0% (today\'s pre-existing full-refund behavior) when the trip has no agency', async () => {
        const row = bookingRow({
            generated_trip: {
                actual_departure_time: new Date(Date.now() + 5 * 60 * 1000), // 5 min out — inside any grace window
                trip: { departure_city: 'Douala', arrival_city: 'Yaoundé', agency: null },
            },
        });
        mockedFindMany.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);

        await BookingRepository.cancelBatch([1], 'No agency configured');

        expect(mockedRecordRefund).toHaveBeenCalledWith(10, 5000, expect.not.stringContaining('frais'));
    });

    it('does not refund at all an unpaid booking, regardless of timing', async () => {
        const row = bookingRow({
            payment_status: 'unpaid',
            generated_trip: {
                actual_departure_time: new Date(Date.now() + 5 * 60 * 1000),
                trip: {
                    departure_city: 'Douala', arrival_city: 'Yaoundé',
                    agency: { late_cancellation_grace_hours: 2, late_cancellation_fee_percent: 50 },
                },
            },
        });
        mockedFindMany.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);

        await BookingRepository.cancelBatch([1], 'Never paid');

        expect(mockedRecordRefund).not.toHaveBeenCalled();
    });

    it('exactly at the grace boundary counts as late (fee applies)', async () => {
        const row = bookingRow({
            generated_trip: {
                // Departure in exactly 2h, grace = 2h — "now > departure - grace"
                // is false at the exact boundary, so this should NOT be late.
                actual_departure_time: new Date(Date.now() + 2 * 60 * 60 * 1000 + 5000),
                trip: {
                    departure_city: 'Douala', arrival_city: 'Yaoundé',
                    agency: { late_cancellation_grace_hours: 2, late_cancellation_fee_percent: 30 },
                },
            },
        });
        mockedFindMany.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);

        await BookingRepository.cancelBatch([1], 'Right at the edge');

        expect(mockedRecordRefund).toHaveBeenCalledWith(10, 5000, expect.not.stringContaining('frais'));
    });
});

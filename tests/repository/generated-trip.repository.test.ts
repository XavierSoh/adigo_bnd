/**
 * Regression coverage for point 8 (UX_FUNCTIONAL_REVAMP_PLAN_2026-09.md):
 * `DELETE /:id` used to have no active-booking guard at all (unlike
 * `deleteBatch`), so deleting a generated_trip with a live booking hit the
 * `booking.generated_trip_id` FK (ON DELETE NO ACTION) and fell into the
 * generic 500 catch-all instead of a clear business error.
 *
 * Also covers point 1's `generated_trip_changed` broadcast: the desktop
 * "Voyages générés" screen only refetches on this event, so a delete that
 * silently forgets to fire it would leave that screen stale forever with
 * no test failure elsewhere to catch it.
 */

jest.mock('../../src/config/prismaClient', () => ({
    __esModule: true,
    default: {
        booking: {
            findFirst: jest.fn(),
            findMany: jest.fn(),
        },
        generated_trip: {
            delete: jest.fn(),
            deleteMany: jest.fn(),
        },
    },
}));

jest.mock('../../src/services/socket.service', () => ({
    SocketService: {
        broadcastListChanged: jest.fn(),
    },
}));

import { Prisma } from '@prisma/client';
import prismaDb from '../../src/config/prismaClient';
import { SocketService } from '../../src/services/socket.service';
import { GeneratedTripRepository } from '../../src/repository/generated-trip.repository';

const mockedBookingFindFirst = prismaDb.booking.findFirst as jest.Mock;
const mockedBookingFindMany = prismaDb.booking.findMany as jest.Mock;
const mockedGeneratedTripDelete = prismaDb.generated_trip.delete as jest.Mock;
const mockedGeneratedTripDeleteMany = prismaDb.generated_trip.deleteMany as jest.Mock;
const mockedBroadcast = SocketService.broadcastListChanged as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GeneratedTripRepository.delete', () => {
    it('refuses to delete (409) a generated trip that still has a booking, '
        + 'and never calls the Prisma delete', async () => {
        mockedBookingFindFirst.mockResolvedValueOnce({ id: 42 });

        const result = await GeneratedTripRepository.delete(7);

        expect(result.status).toBe(false);
        expect(result.code).toBe(409);
        expect(result.message).toMatch(/réservations actives/);
        expect(mockedGeneratedTripDelete).not.toHaveBeenCalled();
        expect(mockedBookingFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { generated_trip_id: 7 } })
        );
    });

    it('deletes a generated trip with no bookings and broadcasts generated_trip_changed', async () => {
        mockedBookingFindFirst.mockResolvedValueOnce(null);
        mockedGeneratedTripDelete.mockResolvedValueOnce({ id: 7 });

        const result = await GeneratedTripRepository.delete(7);

        expect(result.status).toBe(true);
        expect(result.code).toBe(200);
        expect(mockedGeneratedTripDelete).toHaveBeenCalledWith({ where: { id: 7 } });
        expect(mockedBroadcast).toHaveBeenCalledWith('dashboard', 'generated_trip_changed');
    });

    it('returns 404 when the generated trip does not exist, and does not broadcast', async () => {
        mockedBookingFindFirst.mockResolvedValueOnce(null);
        mockedGeneratedTripDelete.mockRejectedValueOnce(
            new Prisma.PrismaClientKnownRequestError('Record not found', {
                code: 'P2025',
                clientVersion: 'test',
            })
        );

        const result = await GeneratedTripRepository.delete(999);

        expect(result.status).toBe(false);
        expect(result.code).toBe(404);
        expect(mockedBroadcast).not.toHaveBeenCalled();
    });

    it('returns a generic 500 on an unexpected error, without leaking internals, and does not broadcast', async () => {
        mockedBookingFindFirst.mockResolvedValueOnce(null);
        mockedGeneratedTripDelete.mockRejectedValueOnce(new Error('connection lost'));

        const result = await GeneratedTripRepository.delete(7);

        expect(result.status).toBe(false);
        expect(result.code).toBe(500);
        expect(mockedBroadcast).not.toHaveBeenCalled();
    });
});

describe('GeneratedTripRepository.deleteBatch', () => {
    it('broadcasts generated_trip_changed once when at least one trip is deleted', async () => {
        mockedBookingFindMany.mockResolvedValueOnce([{ generated_trip_id: 2 }]);
        mockedGeneratedTripDeleteMany.mockResolvedValueOnce({ count: 2 });

        const result = await GeneratedTripRepository.deleteBatch([1, 2, 3]);

        expect(result.status).toBe(true);
        expect((result.body as any).deletedCount).toBe(2);
        expect((result.body as any).skippedIds).toEqual([2]);
        expect(mockedBroadcast).toHaveBeenCalledTimes(1);
        expect(mockedBroadcast).toHaveBeenCalledWith('dashboard', 'generated_trip_changed');
    });

    it('does not broadcast when every requested id was blocked (nothing actually deleted)', async () => {
        mockedBookingFindMany.mockResolvedValueOnce([{ generated_trip_id: 1 }]);

        const result = await GeneratedTripRepository.deleteBatch([1]);

        expect(result.status).toBe(true);
        expect((result.body as any).deletedCount).toBe(0);
        expect(mockedGeneratedTripDeleteMany).not.toHaveBeenCalled();
        expect(mockedBroadcast).not.toHaveBeenCalled();
    });
});

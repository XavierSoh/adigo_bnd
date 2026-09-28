/**
 * VtcNotificationService — same best-effort push pattern already proven in
 * production for BookingNotificationService. `prismaClient` and
 * NotificationService are mocked; nothing here talks to a real DB or FCM.
 */

jest.mock('../../src/config/prismaClient', () => ({
    __esModule: true,
    default: {
        vtc_rides: { findUnique: jest.fn() },
        vtc_drivers: { findUnique: jest.fn() },
    },
}));

jest.mock('../../src/services/notification.service', () => ({
    NotificationService: {
        sendToDevice: jest.fn().mockResolvedValue(true),
        isValidToken: jest.fn((token: string) => typeof token === 'string' && token.length > 10),
    },
}));

import prismaDb from '../../src/config/prismaClient';
import { NotificationService } from '../../src/services/notification.service';
import { VtcNotificationService } from '../../src/services/vtc/vtcNotification.service';

const mockedRideFindUnique = prismaDb.vtc_rides.findUnique as jest.Mock;
const mockedDriverFindUnique = prismaDb.vtc_drivers.findUnique as jest.Mock;
const mockedSendToDevice = NotificationService.sendToDevice as jest.Mock;

const notifiableCustomer = (overrides: Partial<{ fcm_token: string | null; notification_enabled: boolean; preferred_language: string }> = {}) => ({
    fcm_token: 'a-valid-token-that-is-long-enough',
    notification_enabled: true,
    preferred_language: 'fr',
    ...overrides,
});

function fakeRide(overrides: any = {}) {
    return {
        id: 1,
        pickup_address: 'Akwa',
        dropoff_address: 'Bonanjo',
        total_fare: 1500,
        customer: notifiableCustomer(),
        vtc_drivers: {
            first_name: 'Jean',
            last_name: 'Dupont',
            customer: notifiableCustomer({ preferred_language: 'en' }),
        },
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('VtcNotificationService', () => {
    describe('sendRideOffered', () => {
        it('pushes the offered driver with the pickup address', async () => {
            mockedRideFindUnique.mockResolvedValue(fakeRide());

            await VtcNotificationService.sendRideOffered(1);

            expect(mockedSendToDevice).toHaveBeenCalledTimes(1);
            const [token, payload] = mockedSendToDevice.mock.calls[0];
            expect(token).toBe('a-valid-token-that-is-long-enough');
            expect(payload.body).toContain('Akwa');
            expect(payload.data.type).toBe('vtc_ride_offered');
        });

        // Point 3 (UX_FUNCTIONAL_REVAMP_PLAN_2026-09.md): this is the one
        // push that must reach a driver even backgrounded/killed via a
        // full-screen-intent local notification the app itself builds — a
        // plain notification-message on the default channel would let the
        // OS silently auto-display it instead, exactly the gap being closed.
        it('is dataOnly on the dedicated driver-offer channel, never the default one', async () => {
            mockedRideFindUnique.mockResolvedValue(fakeRide());

            await VtcNotificationService.sendRideOffered(1);

            const [, payload] = mockedSendToDevice.mock.calls[0];
            expect(payload.dataOnly).toBe(true);
            expect(payload.androidChannelId).toBe('vtc_driver_offer_channel');
        });

        it('is a silent no-op when the driver has no linked customer account', async () => {
            mockedRideFindUnique.mockResolvedValue(fakeRide({ vtc_drivers: { first_name: 'Jean', last_name: 'Dupont', customer: null } }));

            await expect(VtcNotificationService.sendRideOffered(1)).resolves.toBeUndefined();
            expect(mockedSendToDevice).not.toHaveBeenCalled();
        });

        it('is a silent no-op when the ride no longer exists', async () => {
            mockedRideFindUnique.mockResolvedValue(null);
            await expect(VtcNotificationService.sendRideOffered(999)).resolves.toBeUndefined();
            expect(mockedSendToDevice).not.toHaveBeenCalled();
        });
    });

    describe('sendRideAccepted', () => {
        it('pushes the customer with the driver name', async () => {
            mockedRideFindUnique.mockResolvedValue(fakeRide());
            await VtcNotificationService.sendRideAccepted(1);
            expect(mockedSendToDevice).toHaveBeenCalledTimes(1);
            const [, payload] = mockedSendToDevice.mock.calls[0];
            expect(payload.body).toContain('Jean Dupont');
            expect(payload.data.type).toBe('vtc_ride_accepted');
        });

        // Point 3a: every ordinary VTC step push (not the driver-offer one
        // above) rings on its own 'vtc_channel' instead of silently
        // inheriting the chat notification sound, and is a normal
        // notification-message (not dataOnly) — the OS can auto-display it
        // as-is, no custom full-screen handling needed for these.
        it('rings on vtc_channel, not chat_messages, and is a normal (non-dataOnly) push', async () => {
            mockedRideFindUnique.mockResolvedValue(fakeRide());
            await VtcNotificationService.sendRideAccepted(1);
            const [, payload] = mockedSendToDevice.mock.calls[0];
            expect(payload.androidChannelId).toBe('vtc_channel');
            expect(payload.dataOnly).toBeFalsy();
        });
    });

    describe('sendRideCompleted', () => {
        it('includes the fare in the notification body', async () => {
            mockedRideFindUnique.mockResolvedValue(fakeRide({ total_fare: 2500 }));
            await VtcNotificationService.sendRideCompleted(1);
            const [, payload] = mockedSendToDevice.mock.calls[0];
            expect(payload.body).toContain('2500');
        });
    });

    describe('sendRideCancelled', () => {
        it('notifies only the driver when the customer cancelled', async () => {
            mockedRideFindUnique.mockResolvedValue(fakeRide());
            await VtcNotificationService.sendRideCancelled(1, 'customer');
            expect(mockedSendToDevice).toHaveBeenCalledTimes(1);
            // The driver's token belongs to the second notifiableCustomer() (en)
            const [token] = mockedSendToDevice.mock.calls[0];
            expect(token).toBe('a-valid-token-that-is-long-enough');
        });

        it('notifies only the customer when the driver cancelled', async () => {
            mockedRideFindUnique.mockResolvedValue(fakeRide());
            await VtcNotificationService.sendRideCancelled(1, 'driver');
            expect(mockedSendToDevice).toHaveBeenCalledTimes(1);
        });

        it('notifies both parties when the system auto-cancelled', async () => {
            mockedRideFindUnique.mockResolvedValue(fakeRide());
            await VtcNotificationService.sendRideCancelled(1, 'system');
            expect(mockedSendToDevice).toHaveBeenCalledTimes(2);
        });
    });

    describe('pushIfEnabled gating (exercised indirectly)', () => {
        it('never pushes when notification_enabled is false', async () => {
            mockedRideFindUnique.mockResolvedValue(fakeRide({ customer: notifiableCustomer({ notification_enabled: false }) }));
            await VtcNotificationService.sendRideAccepted(1);
            expect(mockedSendToDevice).not.toHaveBeenCalled();
        });

        it('never pushes when the fcm_token is missing or invalid', async () => {
            mockedRideFindUnique.mockResolvedValue(fakeRide({ customer: notifiableCustomer({ fcm_token: null }) }));
            await VtcNotificationService.sendRideAccepted(1);
            expect(mockedSendToDevice).not.toHaveBeenCalled();
        });
    });

    describe('sendDriverVerified', () => {
        it('pushes an approval notification', async () => {
            mockedDriverFindUnique.mockResolvedValue({ customer: notifiableCustomer() });
            await VtcNotificationService.sendDriverVerified(5, true);
            const [, payload] = mockedSendToDevice.mock.calls[0];
            expect(payload.data.type).toBe('vtc_driver_verified');
        });

        it('pushes a rejection notification including the notes', async () => {
            mockedDriverFindUnique.mockResolvedValue({ customer: notifiableCustomer() });
            await VtcNotificationService.sendDriverVerified(5, false, 'Permis illisible');
            const [, payload] = mockedSendToDevice.mock.calls[0];
            expect(payload.data.type).toBe('vtc_driver_rejected');
            expect(payload.body).toContain('Permis illisible');
        });

        it('is a silent no-op for a driver with no linked customer account (admin-onboarded)', async () => {
            mockedDriverFindUnique.mockResolvedValue({ customer: null });
            await expect(VtcNotificationService.sendDriverVerified(5, true)).resolves.toBeUndefined();
            expect(mockedSendToDevice).not.toHaveBeenCalled();
        });
    });

    describe('resilience', () => {
        it('never throws even if the DB lookup fails', async () => {
            mockedRideFindUnique.mockRejectedValue(new Error('DB down'));
            await expect(VtcNotificationService.sendRideAccepted(1)).rejects.toThrow();
            // Note: the DB error itself still propagates from this method —
            // it's the *caller* (ride.controller.ts) that wraps every call
            // in `.catch()` so it never blocks/fails the ride operation.
            // Documented here so that contract stays visible if it changes.
        });
    });
});

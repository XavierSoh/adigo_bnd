// Push notifications for the VTC module (ride offered/accepted/arrived/
// started/completed/cancelled, scheduled-ride promotion, driver
// verification result). Built on the exact same NotificationService (FCM)
// + BookingNotificationService pattern already in production for the
// booking module — see bookingNotification.service.ts. Nothing new to
// build there, only wiring: a VTC driver IS a `customer` account
// (vtc_drivers.user_id -> customer.id), so `pushIfEnabled` works
// identically for both riders and drivers.
//
// Every method is best-effort and self-contained: it takes just an id and
// re-fetches whatever it needs (mirrors sendBookingConfirmed), and never
// throws — a missing/invalid FCM token, a disabled notification_enabled
// flag, or a driver with no linked customer account (user_id null, the
// admin-onboarded case) is a silent no-op, never an error surfaced to the
// caller. Sending a push must never block or fail a ride operation.
import prismaDb from '../../config/prismaClient';
import { NotificationService } from '../notification.service';
import { I18n, Language } from '../../utils/i18n';

function customerLang(preferredLanguage: string | null | undefined): Language {
    return preferredLanguage === 'en' || preferredLanguage === 'fr' ? preferredLanguage : 'en';
}

interface NotifiableCustomer {
    fcm_token: string | null;
    notification_enabled: boolean | null;
    preferred_language: string | null;
}

async function pushIfEnabled(customer: NotifiableCustomer | null | undefined, title: string, body: string, data?: Record<string, string>): Promise<void> {
    if (!customer) return;
    if (!customer.notification_enabled) return;
    if (!customer.fcm_token || !NotificationService.isValidToken(customer.fcm_token)) return;
    await NotificationService.sendToDevice(customer.fcm_token, { title, body, data });
}

const notifiableCustomerSelect = {
    fcm_token: true,
    notification_enabled: true,
    preferred_language: true,
} as const;

// Ride + both parties' notifiable fields, in one shot — every method below
// needs some subset of this same join. `rideId` accepts number|string
// because callers pass the ride row's own `.id` straight through, and that
// field is typed `string` in the legacy (pre-Prisma-migration) VtcRide
// interface even though it's a real integer at runtime — same ambiguity
// SocketService.broadcastRideStatusChanged already has to accept.
async function loadRideWithParties(rideId: number | string) {
    return prismaDb.vtc_rides.findUnique({
        where: { id: Number(rideId) },
        select: {
            id: true,
            pickup_address: true,
            dropoff_address: true,
            total_fare: true,
            customer: { select: notifiableCustomerSelect },
            vtc_drivers: {
                select: {
                    first_name: true,
                    last_name: true,
                    customer: { select: notifiableCustomerSelect },
                },
            },
        },
    });
}

export class VtcNotificationService {

    /** New unassigned/offered ride -> push the offered driver. */
    static async sendRideOffered(rideId: number | string): Promise<void> {
        const ride = await loadRideWithParties(rideId);
        if (!ride?.vtc_drivers?.customer) return;
        const lang = customerLang(ride.vtc_drivers.customer.preferred_language);
        await pushIfEnabled(
            ride.vtc_drivers.customer,
            I18n.t('push_vtc_ride_offered_title', lang),
            I18n.t('push_vtc_ride_offered_body', lang, { pickup: ride.pickup_address }),
            { type: 'vtc_ride_offered', ride_id: String(rideId) }
        );
    }

    /** Driver accepted (assignDriver / respondToOffer(accept: true)) -> push the customer. */
    static async sendRideAccepted(rideId: number | string): Promise<void> {
        const ride = await loadRideWithParties(rideId);
        if (!ride) return;
        const lang = customerLang(ride.customer.preferred_language);
        const driverName = ride.vtc_drivers ? `${ride.vtc_drivers.first_name} ${ride.vtc_drivers.last_name}` : 'Le chauffeur';
        await pushIfEnabled(
            ride.customer,
            I18n.t('push_vtc_ride_accepted_title', lang),
            I18n.t('push_vtc_ride_accepted_body', lang, { driver: driverName }),
            { type: 'vtc_ride_accepted', ride_id: String(rideId) }
        );
    }

    static async sendDriverArrived(rideId: number | string): Promise<void> {
        const ride = await loadRideWithParties(rideId);
        if (!ride) return;
        const lang = customerLang(ride.customer.preferred_language);
        const driverName = ride.vtc_drivers ? `${ride.vtc_drivers.first_name} ${ride.vtc_drivers.last_name}` : 'Le chauffeur';
        await pushIfEnabled(
            ride.customer,
            I18n.t('push_vtc_driver_arrived_title', lang),
            I18n.t('push_vtc_driver_arrived_body', lang, { driver: driverName }),
            { type: 'vtc_driver_arrived', ride_id: String(rideId) }
        );
    }

    static async sendRideStarted(rideId: number | string): Promise<void> {
        const ride = await loadRideWithParties(rideId);
        if (!ride) return;
        const lang = customerLang(ride.customer.preferred_language);
        await pushIfEnabled(
            ride.customer,
            I18n.t('push_vtc_ride_started_title', lang),
            I18n.t('push_vtc_ride_started_body', lang, { dropoff: ride.dropoff_address }),
            { type: 'vtc_ride_started', ride_id: String(rideId) }
        );
    }

    static async sendRideCompleted(rideId: number | string): Promise<void> {
        const ride = await loadRideWithParties(rideId);
        if (!ride) return;
        const lang = customerLang(ride.customer.preferred_language);
        await pushIfEnabled(
            ride.customer,
            I18n.t('push_vtc_ride_completed_title', lang),
            I18n.t('push_vtc_ride_completed_body', lang, { fare: Number(ride.total_fare) }),
            { type: 'vtc_ride_completed', ride_id: String(rideId) }
        );
    }

    // Notifies whichever party did NOT trigger the cancellation — a customer
    // who cancels their own ride doesn't need a push about it, but the
    // assigned driver does, and vice versa. `cancelledBy` is whatever the
    // ride row already recorded ('customer' | 'driver' | 'system').
    static async sendRideCancelled(rideId: number | string, cancelledBy: string | null): Promise<void> {
        const ride = await loadRideWithParties(rideId);
        if (!ride) return;

        const reasonKey = cancelledBy === 'driver'
            ? 'par le chauffeur'
            : cancelledBy === 'system'
                ? 'automatique'
                : cancelledBy === 'admin'
                    ? 'par un administrateur'
                    : 'par le client';

        // `role` is included so the mobile app (one push handler shared by
        // both the customer and driver flavors of the app) knows which
        // screen to deep-link to without having to infer it locally — see
        // notification_handler.dart's routing on this same `type`.
        if (cancelledBy !== 'customer') {
            const lang = customerLang(ride.customer.preferred_language);
            await pushIfEnabled(
                ride.customer,
                I18n.t('push_vtc_ride_cancelled_title', lang),
                I18n.t('push_vtc_ride_cancelled_body', lang, { reason: reasonKey }),
                { type: 'vtc_ride_cancelled', ride_id: String(rideId), role: 'customer' }
            );
        }
        if (cancelledBy !== 'driver' && ride.vtc_drivers?.customer) {
            const lang = customerLang(ride.vtc_drivers.customer.preferred_language);
            await pushIfEnabled(
                ride.vtc_drivers.customer,
                I18n.t('push_vtc_ride_cancelled_title', lang),
                I18n.t('push_vtc_ride_cancelled_body', lang, { reason: reasonKey }),
                { type: 'vtc_ride_cancelled', ride_id: String(rideId), role: 'driver' }
            );
        }
    }

    /** A 'scheduled' ride was just promoted to 'requested' — see item 3 (scheduled rides). */
    static async sendScheduledRideUpcoming(rideId: number | string): Promise<void> {
        const ride = await loadRideWithParties(rideId);
        if (!ride) return;
        const lang = customerLang(ride.customer.preferred_language);
        await pushIfEnabled(
            ride.customer,
            I18n.t('push_vtc_scheduled_ride_upcoming_title', lang),
            I18n.t('push_vtc_scheduled_ride_upcoming_body', lang, { pickup: ride.pickup_address }),
            { type: 'vtc_scheduled_ride_upcoming', ride_id: String(rideId) }
        );
    }

    // Driver verification result (approve/reject) — see driver.controller.ts
    // ::verifyDriver. Silent no-op for a driver with no linked customer
    // account (admin-onboarded, `user_id` null): they have no app session
    // to push to in the first place.
    static async sendDriverVerified(driverId: number, approved: boolean, notes?: string | null): Promise<void> {
        const driver = await prismaDb.vtc_drivers.findUnique({
            where: { id: driverId },
            select: { customer: { select: notifiableCustomerSelect } },
        });
        if (!driver?.customer) return;
        const lang = customerLang(driver.customer.preferred_language);
        if (approved) {
            await pushIfEnabled(
                driver.customer,
                I18n.t('push_vtc_driver_verified_title', lang),
                I18n.t('push_vtc_driver_verified_body', lang),
                { type: 'vtc_driver_verified', driver_id: String(driverId) }
            );
        } else {
            await pushIfEnabled(
                driver.customer,
                I18n.t('push_vtc_driver_rejected_title', lang),
                I18n.t('push_vtc_driver_rejected_body', lang, { notes: notes || '' }),
                { type: 'vtc_driver_rejected', driver_id: String(driverId) }
            );
        }
    }
}

// Push notifications for the booking module (booking confirmed/cancelled,
// wallet refund credited, "trip departing soon" reminder). Built on the
// existing NotificationService (FCM) — see BOOKING_MODULE_NOTES.md.
//
// Motifs (notification types) and defaults, as decided with the user:
// - booking_confirmed / booking_cancelled / refund_credited: transactional,
//   fire immediately, gated only by the existing customer.notification_enabled
//   master switch (no dedicated per-type toggle requested).
// - trip_reminder: fires once per booking, `customer.reminder_minutes_before`
//   minutes before actual_departure_time (default 15, user-configurable;
//   0 disables just the reminder while leaving the other three on). See
//   migrations/booking_push_notifications.sql for the two additive columns
//   this relies on (customer.reminder_minutes_before, booking.reminder_sent_at).
//
// Every method is best-effort: a missing/invalid FCM token or a disabled
// notification_enabled flag is a silent no-op, never an error surfaced to
// the caller — sending a push must never block or fail a booking operation.
import prismaDb from '../config/prismaClient';
import { NotificationService } from './notification.service';
import { I18n, Language } from '../utils/i18n';

function customerLang(preferredLanguage: string | null | undefined): Language {
    return preferredLanguage === 'en' || preferredLanguage === 'fr' ? preferredLanguage : 'en';
}

interface NotifiableCustomer {
    fcm_token: string | null;
    notification_enabled: boolean | null;
    preferred_language: string | null;
}

async function pushIfEnabled(customer: NotifiableCustomer, title: string, body: string, data?: Record<string, string>): Promise<void> {
    if (!customer.notification_enabled) return;
    if (!customer.fcm_token || !NotificationService.isValidToken(customer.fcm_token)) return;
    await NotificationService.sendToDevice(customer.fcm_token, { title, body, data });
}

// Selects just what every notification needs off `customer`, so callers
// that already have a full customer row can pass it straight through.
const notifiableCustomerSelect = {
    fcm_token: true,
    notification_enabled: true,
    preferred_language: true,
} as const;

export class BookingNotificationService {

    static async sendBookingConfirmed(bookingId: number): Promise<void> {
        const booking = await prismaDb.booking.findUnique({
            where: { id: bookingId },
            select: {
                booking_reference: true,
                customer_booking_customer_idTocustomer: { select: notifiableCustomerSelect },
                generated_trip: { select: { trip: { select: { departure_city: true, arrival_city: true } } } },
            },
        });
        if (!booking) return;

        const customer = booking.customer_booking_customer_idTocustomer;
        const lang = customerLang(customer.preferred_language);
        const params = {
            reference: booking.booking_reference,
            departure: booking.generated_trip.trip.departure_city,
            arrival: booking.generated_trip.trip.arrival_city,
        };

        await pushIfEnabled(
            customer,
            I18n.t('push_booking_confirmed_title', lang),
            I18n.t('push_booking_confirmed_body', lang, params),
            { type: 'booking_confirmed', booking_id: String(bookingId) }
        );
    }

    // Called once per (already-cancelled) booking, right after cancelBatch's
    // wallet refund attempt — this is why it takes the raw fields instead of
    // re-fetching (cancelBatch already has everything, pre- and post-mutate).
    static async sendBookingCancelled(
        bookingId: number,
        customer: NotifiableCustomer,
        bookingReference: string | null,
        departureCity: string,
        arrivalCity: string
    ): Promise<void> {
        const lang = customerLang(customer.preferred_language);
        await pushIfEnabled(
            customer,
            I18n.t('push_booking_cancelled_title', lang),
            I18n.t('push_booking_cancelled_body', lang, {
                reference: bookingReference || `#${bookingId}`,
                departure: departureCity,
                arrival: arrivalCity,
            }),
            { type: 'booking_cancelled', booking_id: String(bookingId) }
        );
    }

    static async sendRefundCredited(customer: NotifiableCustomer, amount: number, newBalance: number): Promise<void> {
        const lang = customerLang(customer.preferred_language);
        await pushIfEnabled(
            customer,
            I18n.t('push_refund_credited_title', lang),
            I18n.t('push_refund_credited_body', lang, { amount, balance: newBalance }),
            { type: 'refund_credited' }
        );
    }

    // Cron entry point (see tripScheduler.service.ts) — runs every minute,
    // finds every confirmed, not-yet-reminded booking whose trip departs
    // within ITS OWN customer's configured lead time, sends the push, and
    // marks it sent. `reminder_minutes_before` varies per customer, so the
    // DB query casts a wide net (next 3h — comfortably above any sane
    // configured value) and the per-customer threshold is applied in JS.
    static async sendDueTripReminders(): Promise<void> {
        const now = new Date();
        const horizon = new Date(now.getTime() + 3 * 60 * 60 * 1000);

        const candidates = await prismaDb.booking.findMany({
            where: {
                status: 'confirmed',
                is_deleted: false,
                reminder_sent_at: null,
                generated_trip: { actual_departure_time: { gt: now, lte: horizon } },
            },
            select: {
                id: true,
                generated_trip_seat_id: true,
                customer_booking_customer_idTocustomer: {
                    select: { ...notifiableCustomerSelect, reminder_minutes_before: true },
                },
                generated_trip: {
                    select: {
                        actual_departure_time: true,
                        trip: { select: { departure_city: true, arrival_city: true } },
                    },
                },
                generated_trip_seat: { select: { seat: { select: { seat_number: true } } } },
            },
        });

        for (const booking of candidates) {
            const customer = booking.customer_booking_customer_idTocustomer;
            const leadMinutes = customer.reminder_minutes_before ?? 15;
            if (!customer.notification_enabled || leadMinutes <= 0) continue;

            const departure = booking.generated_trip.actual_departure_time!;
            const minutesUntilDeparture = (departure.getTime() - now.getTime()) / 60000;
            if (minutesUntilDeparture > leadMinutes) continue; // not due yet — checked again next tick

            const lang = customerLang(customer.preferred_language);
            await pushIfEnabled(
                customer,
                I18n.t('push_trip_reminder_title', lang),
                I18n.t('push_trip_reminder_body', lang, {
                    departure: booking.generated_trip.trip.departure_city,
                    arrival: booking.generated_trip.trip.arrival_city,
                    minutes: Math.max(0, Math.round(minutesUntilDeparture)),
                    time: departure.toISOString().slice(11, 16),
                    seat: booking.generated_trip_seat.seat.seat_number,
                }),
                { type: 'trip_reminder', booking_id: String(booking.id) }
            );

            // Marked sent regardless of whether the push actually went out
            // (disabled/missing token) — same "attempted, don't retry"
            // semantics as every other best-effort notification here; a
            // customer who re-enables notifications 2 minutes before
            // departure just doesn't get this particular reminder.
            await prismaDb.booking.update({ where: { id: booking.id }, data: { reminder_sent_at: now } });
        }
    }
}

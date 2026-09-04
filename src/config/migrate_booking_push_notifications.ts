import { pgNone } from "../utils/prisma-compat";

/**
 * Adds the two additive columns booking push notifications rely on (see
 * bookingNotification.service.ts / tripScheduler.service.ts):
 *  - customer.reminder_minutes_before: user-configurable lead time (minutes)
 *    for the "trip departing soon" push, default 15.
 *  - booking.reminder_sent_at: anti-duplicate marker so the once-a-minute
 *    reminder cron sends it exactly once per booking.
 *
 * Was previously left as a standalone migrations/booking_push_notifications.sql
 * file with no runner - every other schema change in this codebase is a
 * self-healing migrate_*.ts wired into initDb() (see e.g.
 * migrate_customer_google_id.ts), so without this the two columns would
 * never actually get created on deploy and the code referencing them would
 * throw "column does not exist" at runtime. Wired in here to match.
 */
export const migrateBookingPushNotifications = async () => {
    try {
        console.log('🔄 Starting booking push notifications migration...');
        await pgNone(`ALTER TABLE customer ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER DEFAULT 15`);
        await pgNone(`ALTER TABLE booking ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP`);
        console.log('✅ Ensured customer.reminder_minutes_before and booking.reminder_sent_at columns exist');
    } catch (error) {
        console.error('❌ Error migrating booking push notifications columns:', error);
        throw error;
    }
};

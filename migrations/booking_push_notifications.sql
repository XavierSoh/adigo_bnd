-- Push notifications for the booking module: additive-only schema changes.
-- Every ALTER is guarded so this file is safe to re-run. Nothing existing
-- is touched, renamed, or dropped.
--
-- customer.reminder_minutes_before: lead time (in minutes) for the
-- "trip departing soon" push reminder, user-configurable (default 15,
-- matches the requested "peut-être 15 min avant le voyage"). Reuses the
-- existing customer.notification_enabled as the master on/off switch;
-- setting this to 0 disables only the reminder while leaving booking
-- confirmation/cancellation/refund push notifications on.
--
-- booking.reminder_sent_at: anti-duplicate marker so the reminder cron
-- (runs every minute) sends the "departing soon" push exactly once per
-- booking, not once per cron tick while the booking sits inside the
-- reminder window.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customer' AND column_name='reminder_minutes_before') THEN
        ALTER TABLE customer ADD COLUMN reminder_minutes_before INTEGER DEFAULT 15;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking' AND column_name='reminder_sent_at') THEN
        ALTER TABLE booking ADD COLUMN reminder_sent_at TIMESTAMP;
    END IF;
END $$;

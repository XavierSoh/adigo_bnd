import { pgNone } from "../utils/prisma-compat";

/**
 * Courses programmées — "manquements vs. Uber/Bolt/inDrive" audit,
 * 2026-09-13/14: `vtc_rides.status`'s CHECK constraint (defined inline in
 * create_tables.ts's original CREATE TABLE, which only ever runs once —
 * `IF NOT EXISTS` means editing that literal has zero effect on an
 * already-existing table) didn't know about the new 'scheduled' value,
 * and `cancelled_by`'s didn't know about 'admin' (the new admin-initiated
 * cancellation path — see vtc_repository_impl.dart's cancelRide, adigo2).
 * Found live 2026-09-14 writing the scheduled-rides tests: every INSERT of
 * a 'scheduled' row 500'd with Postgres error 23514.
 *
 * Same "drop and re-add with the fuller list" approach as any other
 * CHECK-constraint widening — Postgres has no `ALTER CONSTRAINT` for this.
 */
export const migrateVtcScheduledStatus = async () => {
    try {
        console.log('🔄 Starting VTC scheduled-status migration...');

        await pgNone(`
            ALTER TABLE vtc_rides DROP CONSTRAINT IF EXISTS vtc_rides_status_check
        `);
        await pgNone(`
            ALTER TABLE vtc_rides ADD CONSTRAINT vtc_rides_status_check CHECK (
                status IN ('scheduled', 'requested', 'offered', 'accepted', 'arrived', 'started', 'completed', 'cancelled')
            )
        `);
        console.log("✅ vtc_rides_status_check now allows 'scheduled'");

        await pgNone(`
            ALTER TABLE vtc_rides DROP CONSTRAINT IF EXISTS vtc_rides_cancelled_by_check
        `);
        await pgNone(`
            ALTER TABLE vtc_rides ADD CONSTRAINT vtc_rides_cancelled_by_check CHECK (
                cancelled_by IN ('customer', 'driver', 'system', 'admin')
            )
        `);
        console.log("✅ vtc_rides_cancelled_by_check now allows 'admin'");

        console.log('✅ VTC scheduled-status migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating vtc_rides status/cancelled_by constraints:', error);
        throw error;
    }
};

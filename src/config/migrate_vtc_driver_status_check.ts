import { pgNone } from "../utils/prisma-compat";

/**
 * `vtc_drivers.status`'s CHECK constraint only ever allowed ('online',
 * 'offline', 'busy', 'suspended') — 'offered' (the driver-side state while
 * a ride offer is pending, see ride.service.ts's offerToDriver/
 * respondToOffer) was added to the app's logic without ever widening this
 * constraint on an already-existing table (same "IF NOT EXISTS is a no-op
 * on an existing table" trap as migrate_vtc_scheduled_status.ts). Found
 * live 2026-09-22: every real ride offer 500'd with Postgres error 23514
 * ("new row for relation vtc_drivers violates check constraint
 * vtc_drivers_status_check") the moment a driver had to be flipped to
 * 'offered' — i.e. on the very first real booking attempt against prod.
 */
export const migrateVtcDriverStatusCheck = async () => {
    try {
        console.log('🔄 Starting VTC driver status-check migration...');

        await pgNone(`
            ALTER TABLE vtc_drivers DROP CONSTRAINT IF EXISTS vtc_drivers_status_check
        `);
        await pgNone(`
            ALTER TABLE vtc_drivers ADD CONSTRAINT vtc_drivers_status_check CHECK (
                status IN ('online', 'offline', 'busy', 'offered', 'suspended')
            )
        `);
        console.log("✅ vtc_drivers_status_check now allows 'offered'");

        console.log('✅ VTC driver status-check migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating vtc_drivers_status_check:', error);
        throw error;
    }
};

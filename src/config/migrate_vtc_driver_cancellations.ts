import { pgNone } from "../utils/prisma-compat";

/**
 * Driver-initiated cancellation tracking — "manquements vs. Uber/Bolt/
 * inDrive" audit, 2026-09-13/14: a driver could always technically cancel
 * an accepted ride (PUT /vtc/rides/:id/cancel, ownership-checked), but
 * nothing counted how often, so admin had no visibility into a driver who
 * cancels constantly. No suspension threshold is enforced automatically —
 * this is purely a visibility counter surfaced on the admin driver detail
 * screen (adigo2). See RideService.cancelRide's increment and
 * driver_detail_screen.dart.
 */
export const migrateVtcDriverCancellations = async () => {
    try {
        console.log('🔄 Starting VTC driver cancellations-count migration...');

        await pgNone(`
            ALTER TABLE vtc_drivers
            ADD COLUMN IF NOT EXISTS cancellations_count INT DEFAULT 0
        `);
        console.log('✅ Added vtc_drivers.cancellations_count');

        console.log('✅ VTC driver cancellations-count migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating vtc_drivers.cancellations_count:', error);
        throw error;
    }
};

import { pgNone } from "../utils/prisma-compat";

/**
 * Adds `vtc_rides.idempotency_key` + a unique (customer_id, idempotency_key)
 * index. Closes a real gap found in the 2026-09-05 VTC audit: `POST
 * /vtc/rides` had no protection against a genuine duplicate submission (a
 * client-side double-tap was fixed separately in adigo_mobile, but a retried
 * network request after a timeout would still create two rides and two
 * wallet debits). See RideService.createRide/findByIdempotencyKey and
 * VTC_MODULE_PLAN.md.
 *
 * Applied at boot (see initFirtsItems.ts) — `ADD COLUMN IF NOT EXISTS` /
 * `CREATE ... IF NOT EXISTS` are both safe to re-run every restart.
 */
export const migrateVtcRideIdempotency = async () => {
    try {
        await pgNone(`
            ALTER TABLE vtc_rides
            ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(64)
        `);

        // Partial index — most rows have no key (rides created before this
        // migration, or a future caller that doesn't send one), and a plain
        // UNIQUE constraint would otherwise reject more than one NULL... it
        // wouldn't (Postgres treats NULLs as distinct in unique indexes),
        // but scoping to `WHERE idempotency_key IS NOT NULL` keeps the
        // index small and makes the intent explicit either way.
        await pgNone(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_vtc_rides_idempotency_key
            ON vtc_rides (customer_id, idempotency_key)
            WHERE idempotency_key IS NOT NULL
        `);

        console.log('✅ vtc_rides.idempotency_key ready');
    } catch (error) {
        console.error('❌ Error migrating vtc_rides idempotency_key:', error);
        throw error;
    }
};

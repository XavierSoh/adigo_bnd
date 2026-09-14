import { pgNone } from "../utils/prisma-compat";

/**
 * Driver verification workflow — real gap flagged live 2026-09-13 during a
 * "what's missing vs. Uber/Bolt/inDrive" audit: self-registration
 * (POST /vtc/drivers/register) let anyone become a driver and go online
 * immediately, with zero human review of the license/insurance/vehicle
 * documents they'd just uploaded. `vtc_drivers.status` (online/offline/
 * busy/suspended) is an *operational* state, not a vetting one — mixing
 * "has an admin approved this driver's documents" into it would conflate
 * two different questions, so this is a separate column entirely.
 *
 * `verification_status` (pending/approved/rejected) is nullable at the SQL
 * level with no default — the one-time backfill below only ever touches a
 * row where it's still NULL, which is true for every driver that existed
 * before this migration ran for the first time and never again after
 * (a real 'pending' self-registration has the literal string 'pending',
 * never NULL, so it's untouched by later restarts — this migration runs on
 * every server boot per initDb()'s convention, and must never re-approve a
 * driver who's still genuinely waiting on review).
 */
export const migrateVtcDriverVerification = async () => {
    try {
        console.log('🔄 Starting VTC driver verification migration...');

        await pgNone(`
            ALTER TABLE vtc_drivers
            ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20),
            ADD COLUMN IF NOT EXISTS verification_notes TEXT,
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP
        `);
        console.log('✅ Added verification_status/verification_notes/verified_at columns');

        // One-time backfill: every driver that existed before this feature
        // was already effectively "trusted" (either seeded test data or
        // created through the admin-only onboarding endpoint) — treat them
        // as already approved rather than retroactively locking real,
        // already-operating drivers out of going online.
        await pgNone(`
            UPDATE vtc_drivers
            SET verification_status = 'approved', verified_at = COALESCE(verified_at, now())
            WHERE verification_status IS NULL
        `);
        console.log(`✅ Backfilled verification_status='approved' for pre-existing drivers`);

        console.log('✅ VTC driver verification migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating vtc_drivers verification columns:', error);
        throw error;
    }
};

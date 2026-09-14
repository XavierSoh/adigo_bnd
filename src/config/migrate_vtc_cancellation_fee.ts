import { pgNone } from "../utils/prisma-compat";

/**
 * Late-cancellation fee — "manquements vs. Uber/Bolt/inDrive" audit,
 * 2026-09-13/14. Policy (confirmed with the user): free within 2 minutes of
 * driver acceptance, 500 FCFA flat fee after that, auto-debited from the
 * customer's Adigo wallet when the balance allows it, otherwise recorded as
 * 'unpaid' — the cancellation itself always succeeds regardless. See
 * RideService.cancelRideWithRefund.
 *
 * `accepted_at` is a new, dedicated timestamp: `updated_at` on vtc_rides is
 * already claimed by offerToDriver's offer-expiry bookkeeping (see that
 * method's own comment) and isn't bumped on every transition, so it can't
 * double as "when did this ride become 'accepted'" without risking the two
 * use cases drifting apart.
 */
export const migrateVtcCancellationFee = async () => {
    try {
        console.log('🔄 Starting VTC cancellation-fee migration...');

        await pgNone(`
            ALTER TABLE vtc_rides
            ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2),
            ADD COLUMN IF NOT EXISTS cancellation_fee_status VARCHAR(20)
        `);
        console.log('✅ Added vtc_rides.accepted_at/cancellation_fee/cancellation_fee_status');

        console.log('✅ VTC cancellation-fee migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating vtc_rides cancellation-fee columns:', error);
        throw error;
    }
};

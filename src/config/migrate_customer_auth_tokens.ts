import { pgNone } from "../utils/prisma-compat";

/**
 * Adds the columns needed for a real, persistent email-verification link
 * and password-reset flow on `customer`. Replaces the previous in-memory
 * `CustomerRepository.resetCodes` stub (never wired to any route, lost on
 * every restart, and broken outright in PM2 cluster mode) — see
 * BOOKING_MODULE_NOTES.md ("Email notifications - account creation /
 * password reset").
 *
 * email_verification_token: random hex string embedded in the welcome
 * email's verify link (GET /customers/verify-email/:token).
 * password_reset_code: short numeric code sent by email, entered back
 * through the app alongside the new password (no reset link/web form -
 * there's no customer-facing web frontend to host one).
 */
export const migrateCustomerAuthTokens = async () => {
    try {
        console.log('🔄 Starting customer auth tokens migration...');

        await pgNone(`
            ALTER TABLE customer
            ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255) UNIQUE,
            ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS password_reset_code VARCHAR(10),
            ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP
        `);
        console.log('✅ Added email_verification_token/expires_at and password_reset_code/expires_at columns');

        console.log('✅ Customer auth tokens migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating customer auth tokens:', error);
        throw error;
    }
};

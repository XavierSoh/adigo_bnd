import { pgNone } from "../utils/prisma-compat";

/**
 * Adds customer.google_id for "Sign in with Google" - see
 * CustomerRepository.loginWithGoogle(). Nullable/unique: most customers
 * never set it (password-based accounts), a customer who links their
 * Google account later gets it backfilled onto their existing row rather
 * than a second account being created.
 */
export const migrateCustomerGoogleId = async () => {
    try {
        console.log('🔄 Starting customer.google_id migration...');
        await pgNone(`ALTER TABLE customer ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE`);
        console.log('✅ Ensured customer.google_id column exists');
    } catch (error) {
        console.error('❌ Error migrating customer.google_id:', error);
        throw error;
    }
};

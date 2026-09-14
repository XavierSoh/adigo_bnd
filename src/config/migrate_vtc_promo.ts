import { pgNone } from "../utils/prisma-compat";

/**
 * VTC promo codes — "manquements vs. Uber/Bolt/inDrive" audit,
 * 2026-09-13/14. `promo_code` already existed (admin CRUD only, built for
 * ticketing) but was never actually consumed anywhere — no
 * validation/redemption route existed for any module. Reused here rather
 * than building a parallel table:
 *  - `applies_to` scopes a code to a module ('all' default keeps every
 *    pre-existing ticketing code working unchanged).
 *  - `promo_code_usage` is new: the existing `uses_count` is only a global
 *    counter, it can't answer "has THIS customer already used this code" —
 *    needed so nobody can redeem the same code twice.
 * See PromoService (src/services/vtc/promo.service.ts).
 */
export const migrateVtcPromo = async () => {
    try {
        console.log('🔄 Starting VTC promo-code migration...');

        await pgNone(`
            ALTER TABLE promo_code
            ADD COLUMN IF NOT EXISTS applies_to VARCHAR(20) DEFAULT 'all'
        `);
        console.log("✅ Added promo_code.applies_to (default 'all')");

        await pgNone(`
            CREATE TABLE IF NOT EXISTS promo_code_usage (
                id SERIAL PRIMARY KEY,
                promo_code_id INT NOT NULL REFERENCES promo_code(id),
                customer_id INT NOT NULL REFERENCES customer(id),
                vtc_ride_id INT,
                used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT idx_promo_code_usage_unique UNIQUE (promo_code_id, customer_id)
            )
        `);
        console.log('✅ Created promo_code_usage table');

        console.log('✅ VTC promo-code migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating VTC promo codes:', error);
        throw error;
    }
};

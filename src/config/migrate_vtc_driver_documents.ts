import { pgNone } from "../utils/prisma-compat";
import { kCustomer } from "../utils/table_names";

/**
 * Re-points vtc_drivers.user_id at `customer` instead of `users`, and adds
 * insurance/registration-document/vehicle-photos/seats columns.
 *
 * WHY the FK swap: a "driver" is a customer account (adigo_mobile) that
 * also has a driver profile attached, not a separate staff account —
 * explicit clarification from the user (2026-09-03), see VTC_MODULE_PLAN.md
 * Phase 2. The original FK to `users` (the staff/admin login table used by
 * adigo2) predates that decision and was never actually exercised — 0 rows
 * existed in vtc_drivers at the time of this migration, so no orphaned-data
 * handling is needed. Same treatment as migrateBookingCreatedBy, which did
 * the identical users->customer swap for booking.created_by earlier.
 */
export const migrateVtcDriverDocuments = async () => {
    try {
        console.log('🔄 Starting VTC driver documents migration...');

        await pgNone(`
            ALTER TABLE vtc_drivers
            DROP CONSTRAINT IF EXISTS vtc_drivers_user_id_fkey
        `);
        console.log('✅ Dropped old vtc_drivers.user_id constraint (users table)');

        await pgNone(`
            ALTER TABLE vtc_drivers
            ADD CONSTRAINT vtc_drivers_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES ${kCustomer}(id)
        `);
        console.log('✅ Added new vtc_drivers.user_id constraint (customer table)');

        await pgNone(`
            ALTER TABLE vtc_drivers
            ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(50),
            ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
            ADD COLUMN IF NOT EXISTS registration_document TEXT,
            ADD COLUMN IF NOT EXISTS vehicle_photos TEXT[],
            ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 4
        `);
        console.log('✅ Added insurance/registration_document/vehicle_photos/seats columns');

        console.log('✅ VTC driver documents migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating vtc_drivers documents:', error);
        throw error;
    }
};

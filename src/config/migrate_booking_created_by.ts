import { pgNone } from "../utils/prisma-compat";
import { kBooking, kCustomer } from "../utils/table_names";

export const migrateBookingCreatedBy = async () => {
    try {
        console.log('🔄 Starting booking created_by migration...');

        // Drop the old constraint referencing users table
        await pgNone(`
            ALTER TABLE ${kBooking}
            DROP CONSTRAINT IF EXISTS booking_created_by_fkey
        `);
        console.log('✅ Dropped old created_by constraint (users table)');

        // Add new constraint referencing customer table
        await pgNone(`
            ALTER TABLE ${kBooking}
            ADD CONSTRAINT booking_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES customer(id)
        `);
        console.log('✅ Added new created_by constraint (customer table)');

        console.log('✅ Booking created_by migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating booking created_by:', error);
        throw error;
    }
};

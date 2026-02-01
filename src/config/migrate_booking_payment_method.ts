import pgpDb from "./pgdb";
import { kBooking } from "../utils/table_names";

export const migrateBookingPaymentMethod = async () => {
    try {
        console.log('🔄 Starting booking payment_method migration...');

        // Drop the old constraint
        await pgpDb.none(`
            ALTER TABLE ${kBooking}
            DROP CONSTRAINT IF EXISTS booking_payment_method_check
        `);
        console.log('✅ Dropped old payment_method constraint');

        // Add new constraint with 'wallet' included
        await pgpDb.none(`
            ALTER TABLE ${kBooking}
            ADD CONSTRAINT booking_payment_method_check
            CHECK (payment_method IN ('orangeMoney', 'mtn', 'cash', 'wallet'))
        `);
        console.log('✅ Added new payment_method constraint with wallet support');

        console.log('✅ Booking payment_method migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating booking payment_method:', error);
        throw error;
    }
};

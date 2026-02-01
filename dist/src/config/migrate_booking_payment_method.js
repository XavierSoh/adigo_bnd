"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateBookingPaymentMethod = void 0;
const pgdb_1 = __importDefault(require("./pgdb"));
const table_names_1 = require("../utils/table_names");
const migrateBookingPaymentMethod = async () => {
    try {
        console.log('🔄 Starting booking payment_method migration...');
        // Drop the old constraint
        await pgdb_1.default.none(`
            ALTER TABLE ${table_names_1.kBooking}
            DROP CONSTRAINT IF EXISTS booking_payment_method_check
        `);
        console.log('✅ Dropped old payment_method constraint');
        // Add new constraint with 'wallet' included
        await pgdb_1.default.none(`
            ALTER TABLE ${table_names_1.kBooking}
            ADD CONSTRAINT booking_payment_method_check
            CHECK (payment_method IN ('orangeMoney', 'mtn', 'cash', 'wallet'))
        `);
        console.log('✅ Added new payment_method constraint with wallet support');
        console.log('✅ Booking payment_method migration completed successfully');
    }
    catch (error) {
        console.error('❌ Error migrating booking payment_method:', error);
        throw error;
    }
};
exports.migrateBookingPaymentMethod = migrateBookingPaymentMethod;

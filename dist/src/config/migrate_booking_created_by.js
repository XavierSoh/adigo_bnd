"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateBookingCreatedBy = void 0;
const pgdb_1 = __importDefault(require("./pgdb"));
const table_names_1 = require("../utils/table_names");
const migrateBookingCreatedBy = async () => {
    try {
        console.log('🔄 Starting booking created_by migration...');
        // Drop the old constraint referencing users table
        await pgdb_1.default.none(`
            ALTER TABLE ${table_names_1.kBooking}
            DROP CONSTRAINT IF EXISTS booking_created_by_fkey
        `);
        console.log('✅ Dropped old created_by constraint (users table)');
        // Add new constraint referencing customer table
        await pgdb_1.default.none(`
            ALTER TABLE ${table_names_1.kBooking}
            ADD CONSTRAINT booking_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES customer(id)
        `);
        console.log('✅ Added new created_by constraint (customer table)');
        console.log('✅ Booking created_by migration completed successfully');
    }
    catch (error) {
        console.error('❌ Error migrating booking created_by:', error);
        throw error;
    }
};
exports.migrateBookingCreatedBy = migrateBookingCreatedBy;

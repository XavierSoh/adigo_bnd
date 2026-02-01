"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateCustomerTable = void 0;
const pgdb_1 = __importDefault(require("./pgdb"));
const table_names_1 = require("../utils/table_names");
const migrateCustomerTable = async () => {
    try {
        console.log('🔄 Starting customer table migration...');
        // Add profile_picture column if it doesn't exist
        await pgdb_1.default.none(`
            ALTER TABLE ${table_names_1.kCustomer}
            ADD COLUMN IF NOT EXISTS profile_picture TEXT
        `);
        console.log('✅ Added profile_picture column');
        // Add wallet_balance column if it doesn't exist
        await pgdb_1.default.none(`
            ALTER TABLE ${table_names_1.kCustomer}
            ADD COLUMN IF NOT EXISTS wallet_balance INT DEFAULT 0
        `);
        console.log('✅ Added wallet_balance column');
        // Add last_login column if it doesn't exist
        await pgdb_1.default.none(`
            ALTER TABLE ${table_names_1.kCustomer}
            ADD COLUMN IF NOT EXISTS last_login TIMESTAMP
        `);
        console.log('✅ Added last_login column');
        // Add fcm_token column for push notifications
        await pgdb_1.default.none(`
            ALTER TABLE ${table_names_1.kCustomer}
            ADD COLUMN IF NOT EXISTS fcm_token TEXT
        `);
        console.log('✅ Added fcm_token column for push notifications');
        console.log('✅ Customer table migration completed successfully');
    }
    catch (error) {
        console.error('❌ Error migrating customer table:', error);
        throw error;
    }
};
exports.migrateCustomerTable = migrateCustomerTable;

import pgpDb from "./pgdb";
import { kCustomer } from "../utils/table_names";

export const migrateCustomerTable = async () => {
    try {
        console.log('🔄 Starting customer table migration...');

        // Add profile_picture column if it doesn't exist
        await pgpDb.none(`
            ALTER TABLE ${kCustomer}
            ADD COLUMN IF NOT EXISTS profile_picture TEXT
        `);
        console.log('✅ Added profile_picture column');

        // Add wallet_balance column if it doesn't exist
        await pgpDb.none(`
            ALTER TABLE ${kCustomer}
            ADD COLUMN IF NOT EXISTS wallet_balance INT DEFAULT 0
        `);
        console.log('✅ Added wallet_balance column');

        // Add last_login column if it doesn't exist
        await pgpDb.none(`
            ALTER TABLE ${kCustomer}
            ADD COLUMN IF NOT EXISTS last_login TIMESTAMP
        `);
        console.log('✅ Added last_login column');

        // Add fcm_token column for push notifications
        await pgpDb.none(`
            ALTER TABLE ${kCustomer}
            ADD COLUMN IF NOT EXISTS fcm_token TEXT
        `);
        console.log('✅ Added fcm_token column for push notifications');

        console.log('✅ Customer table migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating customer table:', error);
        throw error;
    }
};

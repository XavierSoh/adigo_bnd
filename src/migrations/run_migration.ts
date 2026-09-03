import { pgNone } from '../utils/prisma-compat';
import fs from 'fs';
import path from 'path';

async function runMigration() {
    try {
        console.log('🔄 Starting database migration...');

        const migrationPath = path.join(__dirname, 'add_profile_picture_and_wallet.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        console.log('📄 Running migration script...');
        await pgNone(migrationSQL);

        console.log('✅ Migration completed successfully!');
        console.log('\nChanges applied:');
        console.log('  - Added profile_picture column to customer table');
        console.log('  - Added wallet_balance column to customer table');
        console.log('  - Created wallet_transaction table');
        console.log('  - Created indexes for performance');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        // Close database connection
        process.exit(0);
    }
}

// Run the migration
runMigration();

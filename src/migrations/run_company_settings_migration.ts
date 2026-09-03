import { pgNone } from '../utils/prisma-compat';
import fs from 'fs';
import path from 'path';

async function runCompanySettingsMigration() {
    try {
        console.log('🔄 Starting company_settings table migration...');

        const migrationPath = path.join(__dirname, 'create_company_settings.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        console.log('📄 Running migration script...');
        await pgNone(migrationSQL);

        console.log('✅ Migration completed successfully!');
        console.log('\nChanges applied:');
        console.log('  - Created company_settings table');
        console.log('  - Added unique constraint (singleton pattern)');
        console.log('  - Inserted default placeholder data');
        console.log('  - Created update trigger for updated_at column');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        // Close database connection
        process.exit(0);
    }
}

// Run the migration
runCompanySettingsMigration();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pgdb_1 = __importDefault(require("../config/pgdb"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function runCompanySettingsMigration() {
    try {
        console.log('🔄 Starting company_settings table migration...');
        const migrationPath = path_1.default.join(__dirname, 'create_company_settings.sql');
        const migrationSQL = fs_1.default.readFileSync(migrationPath, 'utf-8');
        console.log('📄 Running migration script...');
        await pgdb_1.default.none(migrationSQL);
        console.log('✅ Migration completed successfully!');
        console.log('\nChanges applied:');
        console.log('  - Created company_settings table');
        console.log('  - Added unique constraint (singleton pattern)');
        console.log('  - Inserted default placeholder data');
        console.log('  - Created update trigger for updated_at column');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
    finally {
        // Close database connection
        process.exit(0);
    }
}
// Run the migration
runCompanySettingsMigration();

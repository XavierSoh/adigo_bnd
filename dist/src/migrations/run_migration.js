"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pgdb_1 = __importDefault(require("../config/pgdb"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function runMigration() {
    try {
        console.log('🔄 Starting database migration...');
        const migrationPath = path_1.default.join(__dirname, 'add_profile_picture_and_wallet.sql');
        const migrationSQL = fs_1.default.readFileSync(migrationPath, 'utf-8');
        console.log('📄 Running migration script...');
        await pgdb_1.default.none(migrationSQL);
        console.log('✅ Migration completed successfully!');
        console.log('\nChanges applied:');
        console.log('  - Added profile_picture column to customer table');
        console.log('  - Added wallet_balance column to customer table');
        console.log('  - Created wallet_transaction table');
        console.log('  - Created indexes for performance');
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
runMigration();

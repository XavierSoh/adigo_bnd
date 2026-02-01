"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pgdb_1 = __importDefault(require("../config/pgdb"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * Run Event Module Migrations
 *
 * This script executes SQL migrations to create event-related tables
 * and seed initial data for the ticketing module.
 */
async function runEventMigration() {
    console.log('🚀 Starting Event Module Migration...\n');
    try {
        // Step 1: Create Tables
        console.log('📋 Step 1: Creating event tables...');
        const createTablesSql = fs_1.default.readFileSync(path_1.default.join(__dirname, 'create_event_tables.sql'), 'utf-8');
        await pgdb_1.default.none(createTablesSql);
        console.log('✅ Event tables created successfully\n');
        // Step 2: Seed Categories
        console.log('📋 Step 2: Seeding event categories...');
        const seedCategoriesSql = fs_1.default.readFileSync(path_1.default.join(__dirname, 'seed_event_categories.sql'), 'utf-8');
        await pgdb_1.default.none(seedCategoriesSql);
        console.log('✅ Event categories seeded successfully\n');
        // Step 3: Verify tables exist
        console.log('🔍 Step 3: Verifying tables...');
        const tables = await pgdb_1.default.any(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'event%'
            ORDER BY table_name
        `);
        console.log('📊 Event-related tables:');
        tables.forEach(t => console.log(`   ✓ ${t.table_name}`));
        console.log('');
        // Step 4: Get statistics
        console.log('📊 Step 4: Migration statistics:');
        const categoriesCount = await pgdb_1.default.one('SELECT COUNT(*) as count FROM event_category');
        console.log(`   - Event categories: ${categoriesCount.count}`);
        const organizersCount = await pgdb_1.default.one('SELECT COUNT(*) as count FROM event_organizer');
        console.log(`   - Event organizers: ${organizersCount.count}`);
        const eventsCount = await pgdb_1.default.one('SELECT COUNT(*) as count FROM event');
        console.log(`   - Events: ${eventsCount.count}`);
        console.log('\n✨ Event Module Migration Completed Successfully! ✨\n');
    }
    catch (error) {
        console.error('❌ Migration Failed:', error);
        throw error;
    }
}
// Run migration if executed directly
if (require.main === module) {
    runEventMigration()
        .then(() => {
        console.log('👍 All migrations executed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Migration error:', error);
        process.exit(1);
    });
}
exports.default = runEventMigration;

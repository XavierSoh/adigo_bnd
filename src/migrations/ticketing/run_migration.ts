import pgpDb from "../../config/pgdb";
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
    console.log('🚀 Starting Ticketing Module Migration...\n');

    const migrations = [
        '001_create_tables.sql',
        '002_seed_categories.sql',
        '003_add_admin_tables.sql'
    ];

    for (const file of migrations) {
        const filePath = path.join(__dirname, file);
        console.log(`📄 Running: ${file}`);

        try {
            const sql = fs.readFileSync(filePath, 'utf8');
            await pgpDb.none(sql);
            console.log(`   ✅ Success\n`);
        } catch (error: any) {
            console.error(`   ❌ Error: ${error.message}\n`);
        }
    }

    // Verify tables
    console.log('🔍 Verifying tables...');
    const tables = await pgpDb.any(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'event%' ORDER BY table_name"
    );
    console.log('   Tables created:', tables.map((t: any) => t.table_name).join(', '));

    // Verify categories
    const categories = await pgpDb.one('SELECT COUNT(*) as count FROM event_category');
    console.log(`   Categories seeded: ${categories.count}`);

    console.log('\n✅ Migration completed!');
    process.exit(0);
}

runMigration().catch(e => {
    console.error('💥 Migration failed:', e);
    process.exit(1);
});

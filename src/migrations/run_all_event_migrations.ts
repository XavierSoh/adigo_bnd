import pgpDb from '../config/pgdb';
import fs from 'fs';
import path from 'path';

/**
 * Run All Event Module Migrations (Versioned & Idempotent)
 *
 * This script executes all event-related migrations in order:
 * 1. Migration tracker setup
 * 2. Base event tables (v1.0.0)
 * 3. Marketing columns (v1.1.0)
 * 4. Resale table (v1.2.0)
 * 5. Premium pricing table (v1.3.0)
 * 6. Seed data
 *
 * All migrations are idempotent (safe to run multiple times)
 */

interface MigrationFile {
    name: string;
    version: string;
    description: string;
    filename: string;
    order: number;
}

const migrations: MigrationFile[] = [
    {
        name: 'migration_tracker',
        version: '1.0.0',
        description: 'Create migration tracking system',
        filename: 'migration_tracker.sql',
        order: 1
    },
    {
        name: 'create_event_tables',
        version: '1.0.0',
        description: 'Create base event tables',
        filename: 'create_event_tables.sql',
        order: 2
    },
    {
        name: 'add_marketing_columns',
        version: '1.1.0',
        description: 'Add marketing and premium service columns',
        filename: 'add_marketing_columns.sql',
        order: 3
    },
    {
        name: 'create_resale_table',
        version: '1.2.0',
        description: 'Create ticket resale marketplace table',
        filename: 'create_resale_table.sql',
        order: 4
    },
    {
        name: 'create_premium_pricing_table',
        version: '1.3.0',
        description: 'Create premium service pricing configuration',
        filename: 'create_premium_pricing_table.sql',
        order: 5
    },
    {
        name: 'seed_event_categories',
        version: '1.0.0',
        description: 'Seed event categories',
        filename: 'seed_event_categories.sql',
        order: 6
    }
];

async function runAllEventMigrations() {
    console.log('🚀 Starting Event Module Migrations (Versioned)\n');
    console.log('═'.repeat(60));

    const startTime = Date.now();
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
        // Sort migrations by order
        const sortedMigrations = migrations.sort((a, b) => a.order - b.order);

        for (const migration of sortedMigrations) {
            const migrationStartTime = Date.now();

            try {
                console.log(`\n📋 [${migration.order}/${migrations.length}] ${migration.name} (v${migration.version})`);
                console.log(`   Description: ${migration.description}`);

                // Read SQL file
                const sqlPath = path.join(__dirname, migration.filename);
                if (!fs.existsSync(sqlPath)) {
                    console.log(`   ⚠️  File not found: ${migration.filename}, skipping...`);
                    skippedCount++;
                    continue;
                }

                const sql = fs.readFileSync(sqlPath, 'utf-8');

                // Execute migration
                await pgpDb.none(sql);

                const executionTime = Date.now() - migrationStartTime;
                console.log(`   ✅ Completed in ${executionTime}ms`);
                successCount++;

            } catch (error: any) {
                const executionTime = Date.now() - migrationStartTime;
                console.error(`   ❌ Failed after ${executionTime}ms`);
                console.error(`   Error: ${error.message}`);
                errorCount++;

                // Continue with other migrations (don't stop on error)
                // Some errors might be expected (e.g., "already exists")
                if (error.message.includes('already exists') ||
                    error.message.includes('duplicate key')) {
                    console.log(`   ℹ️  This is likely safe to ignore (idempotent migration)`);
                    skippedCount++;
                }
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ⏭️  Skipped: ${skippedCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   ⏱️  Total Time: ${Date.now() - startTime}ms`);

        // Verify tables exist
        console.log('\n🔍 Verifying Event Tables:');
        const tables = await pgpDb.any(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'event%'
            ORDER BY table_name
        `);

        console.log(`   Found ${tables.length} event-related tables:`);
        tables.forEach(t => console.log(`      ✓ ${t.table_name}`));

        // Get statistics
        console.log('\n📈 Database Statistics:');

        try {
            const categoriesCount = await pgpDb.one(
                'SELECT COUNT(*) as count FROM event_category WHERE is_deleted = FALSE'
            );
            console.log(`   - Event categories: ${categoriesCount.count}`);
        } catch (e) {
            console.log(`   - Event categories: Table not ready`);
        }

        try {
            const pricingCount = await pgpDb.one(
                'SELECT COUNT(*) as count FROM event_premium_service_pricing WHERE is_deleted = FALSE'
            );
            console.log(`   - Premium pricing rules: ${pricingCount.count}`);
        } catch (e) {
            console.log(`   - Premium pricing rules: Table not ready`);
        }

        try {
            const migrationsApplied = await pgpDb.any(
                'SELECT migration_name, version, applied_at FROM migration_tracker ORDER BY applied_at'
            );
            console.log(`\n📝 Applied Migrations (${migrationsApplied.length}):`);
            migrationsApplied.forEach(m => {
                const date = new Date(m.applied_at).toLocaleString();
                console.log(`      ${m.version} - ${m.migration_name} (${date})`);
            });
        } catch (e) {
            console.log('\n   ℹ️  Migration tracker not yet available');
        }

        console.log('\n✨ Event Module Migrations Completed! ✨\n');

        if (errorCount > 0) {
            console.log('⚠️  Some migrations had errors. Please review the logs above.');
            console.log('   If errors are "already exists", migrations are working correctly.\n');
        }

    } catch (error) {
        console.error('\n💥 Fatal Migration Error:', error);
        throw error;
    }
}

// Run migration if executed directly
if (require.main === module) {
    runAllEventMigrations()
        .then(() => {
            console.log('👍 Migration script finished');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration script error:', error);
            process.exit(1);
        });
}

export default runAllEventMigrations;

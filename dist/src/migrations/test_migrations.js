"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pgdb_1 = __importDefault(require("../config/pgdb"));
const results = [];
async function runTest(testName, testFn) {
    try {
        console.log(`\n🧪 Testing: ${testName}...`);
        const result = await testFn();
        results.push({
            test: testName,
            passed: result.passed,
            message: result.message,
            details: result.details
        });
        if (result.passed) {
            console.log(`   ✅ PASSED: ${result.message}`);
        }
        else {
            console.log(`   ❌ FAILED: ${result.message}`);
        }
        if (result.details) {
            console.log(`   📊 Details:`, result.details);
        }
    }
    catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        results.push({
            test: testName,
            passed: false,
            message: `Exception: ${error.message}`
        });
    }
}
async function testMigrations() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ADIGO EVENT TICKETING - MIGRATION TEST SUITE              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    // Test 1: Migration Tracker Table
    await runTest('Migration Tracker Table Exists', async () => {
        const exists = await pgdb_1.default.oneOrNone(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'migration_tracker'
            ) as exists
        `);
        return {
            passed: exists.exists,
            message: exists.exists
                ? 'migration_tracker table exists'
                : 'migration_tracker table not found'
        };
    });
    // Test 2: Event Tables
    await runTest('All Event Tables Created', async () => {
        const expectedTables = [
            'event_category',
            'event_organizer',
            'event',
            'event_ticket_type',
            'event_ticket_purchase',
            'event_favorite',
            'event_review',
            'event_ticket_resale',
            'event_premium_service_pricing'
        ];
        const tables = await pgdb_1.default.any(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name LIKE 'event%'
            AND table_schema = 'public'
        `);
        const tableNames = tables.map(t => t.table_name);
        const missingTables = expectedTables.filter(t => !tableNames.includes(t));
        return {
            passed: missingTables.length === 0,
            message: missingTables.length === 0
                ? `All ${expectedTables.length} tables created`
                : `Missing tables: ${missingTables.join(', ')}`,
            details: {
                expected: expectedTables.length,
                found: tableNames.length,
                tables: tableNames
            }
        };
    });
    // Test 3: Event Categories Seeded
    await runTest('Event Categories Seeded', async () => {
        const count = await pgdb_1.default.one(`
            SELECT COUNT(*) as count FROM event_category
            WHERE is_deleted = FALSE
        `);
        return {
            passed: count.count >= 20,
            message: count.count >= 20
                ? `${count.count} categories seeded`
                : `Only ${count.count} categories found (expected 20)`,
            details: { count: count.count }
        };
    });
    // Test 4: Premium Pricing Seeded
    await runTest('Premium Pricing Rules Seeded', async () => {
        const count = await pgdb_1.default.one(`
            SELECT COUNT(*) as count FROM event_premium_service_pricing
            WHERE is_deleted = FALSE
        `);
        const breakdown = await pgdb_1.default.any(`
            SELECT service_type, COUNT(*) as count
            FROM event_premium_service_pricing
            WHERE is_deleted = FALSE
            GROUP BY service_type
            ORDER BY service_type
        `);
        return {
            passed: count.count >= 16,
            message: count.count >= 16
                ? `${count.count} pricing rules seeded`
                : `Only ${count.count} rules found (expected 16)`,
            details: {
                total: count.count,
                breakdown: breakdown
            }
        };
    });
    // Test 5: Design Pricing for Different Capacities
    await runTest('Design Pricing for Different Capacities', async () => {
        const testCases = [
            { capacity: 150, expectedTier: 'small', expectedPrice: 15000 },
            { capacity: 500, expectedTier: 'medium', expectedPrice: 25000 },
            { capacity: 3000, expectedTier: 'large', expectedPrice: 40000 },
            { capacity: 10000, expectedTier: 'xlarge', expectedPrice: 60000 }
        ];
        const results = [];
        let allPassed = true;
        for (const testCase of testCases) {
            const pricing = await pgdb_1.default.oneOrNone(`
                SELECT service_subtype, base_price
                FROM event_premium_service_pricing
                WHERE service_type = 'design'
                AND is_active = TRUE
                AND (
                    (min_capacity IS NULL OR $1 >= min_capacity)
                    AND (max_capacity IS NULL OR $1 <= max_capacity)
                )
                ORDER BY min_capacity DESC
                LIMIT 1
            `, [testCase.capacity]);
            const passed = pricing &&
                pricing.service_subtype === testCase.expectedTier &&
                pricing.base_price === testCase.expectedPrice;
            if (!passed)
                allPassed = false;
            results.push({
                capacity: testCase.capacity,
                expected: `${testCase.expectedTier} (${testCase.expectedPrice} FCFA)`,
                actual: pricing
                    ? `${pricing.service_subtype} (${pricing.base_price} FCFA)`
                    : 'Not found',
                passed
            });
        }
        return {
            passed: allPassed,
            message: allPassed
                ? 'All design pricing tiers working correctly'
                : 'Some design pricing tiers failed',
            details: results
        };
    });
    // Test 6: Boost Pricing
    await runTest('Visibility Boost Pricing', async () => {
        const boostTypes = [
            { type: 'boost_homepage', duration: 7, expected: 5000 },
            { type: 'boost_homepage', duration: 14, expected: 8000 },
            { type: 'boost_homepage', duration: 30, expected: 15000 },
            { type: 'boost_category', duration: 7, expected: 3000 },
            { type: 'boost_category', duration: 14, expected: 6000 },
            { type: 'boost_category', duration: 30, expected: 12000 }
        ];
        let allPassed = true;
        const results = [];
        for (const boost of boostTypes) {
            const pricing = await pgdb_1.default.oneOrNone(`
                SELECT base_price
                FROM event_premium_service_pricing
                WHERE service_type = $1
                AND duration_days = $2
                AND is_active = TRUE
            `, [boost.type, boost.duration]);
            const passed = pricing && pricing.base_price === boost.expected;
            if (!passed)
                allPassed = false;
            results.push({
                type: boost.type,
                duration: `${boost.duration} days`,
                expected: `${boost.expected} FCFA`,
                actual: pricing ? `${pricing.base_price} FCFA` : 'Not found',
                passed
            });
        }
        return {
            passed: allPassed,
            message: allPassed
                ? 'All boost pricing tiers correct'
                : 'Some boost pricing failed',
            details: results
        };
    });
    // Test 7: Database Functions
    await runTest('Database Functions Created', async () => {
        const expectedFunctions = [
            'generate_event_code',
            'generate_ticket_reference',
            'generate_resale_code',
            'update_updated_at_column',
            'update_event_stats_after_purchase',
            'update_event_rating_after_review',
            'calculate_resale_commission',
            'migration_exists',
            'record_migration'
        ];
        const functions = await pgdb_1.default.any(`
            SELECT routine_name
            FROM information_schema.routines
            WHERE routine_type = 'FUNCTION'
            AND routine_schema = 'public'
            AND routine_name IN (${expectedFunctions.map((_, i) => `$${i + 1}`).join(', ')})
        `, expectedFunctions);
        const foundFunctions = functions.map(f => f.routine_name);
        const missingFunctions = expectedFunctions.filter(f => !foundFunctions.includes(f));
        return {
            passed: missingFunctions.length === 0,
            message: missingFunctions.length === 0
                ? `All ${expectedFunctions.length} functions created`
                : `Missing functions: ${missingFunctions.join(', ')}`,
            details: {
                expected: expectedFunctions.length,
                found: foundFunctions.length,
                functions: foundFunctions
            }
        };
    });
    // Test 8: Event Table Columns
    await runTest('Event Table Marketing Columns', async () => {
        const expectedColumns = [
            'marketing_poster_basic',
            'marketing_poster_premium',
            'marketing_poster_amount',
            'marketing_ads_enabled',
            'marketing_ads_budget',
            'marketing_ads_platform',
            'sms_notifications_enabled',
            'sms_count',
            'sms_cost_total',
            'featured_placement_type',
            'featured_placement_amount',
            'field_service_scanners',
            'field_service_scanner_amount'
        ];
        const columns = await pgdb_1.default.any(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'event'
            AND column_name IN (${expectedColumns.map((_, i) => `$${i + 1}`).join(', ')})
        `, expectedColumns);
        const foundColumns = columns.map(c => c.column_name);
        const missingColumns = expectedColumns.filter(c => !foundColumns.includes(c));
        return {
            passed: missingColumns.length === 0,
            message: missingColumns.length === 0
                ? `All ${expectedColumns.length} marketing columns added`
                : `Missing columns: ${missingColumns.join(', ')}`,
            details: {
                expected: expectedColumns.length,
                found: foundColumns.length
            }
        };
    });
    // Test 9: Resale Table Structure
    await runTest('Resale Table Structure', async () => {
        const requiredColumns = [
            'resale_code',
            'commission_rate',
            'commission_amount',
            'seller_receives'
        ];
        const columns = await pgdb_1.default.any(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'event_ticket_resale'
            AND column_name IN (${requiredColumns.map((_, i) => `$${i + 1}`).join(', ')})
        `, requiredColumns);
        const foundColumns = columns.map(c => c.column_name);
        const missingColumns = requiredColumns.filter(c => !foundColumns.includes(c));
        return {
            passed: missingColumns.length === 0,
            message: missingColumns.length === 0
                ? 'Resale table structure correct'
                : `Missing columns: ${missingColumns.join(', ')}`,
            details: {
                found: foundColumns
            }
        };
    });
    // Test 10: Migrations Recorded
    await runTest('Migrations Recorded in Tracker', async () => {
        const migrations = await pgdb_1.default.any(`
            SELECT migration_name, version, status, applied_at
            FROM migration_tracker
            ORDER BY applied_at DESC
        `);
        return {
            passed: migrations.length >= 3,
            message: migrations.length >= 3
                ? `${migrations.length} migrations recorded`
                : `Only ${migrations.length} migrations recorded`,
            details: migrations.map(m => ({
                name: m.migration_name,
                version: m.version,
                status: m.status
            }))
        };
    });
    // Generate Report
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 TEST RESULTS SUMMARY\n');
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    if (failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        results
            .filter(r => !r.passed)
            .forEach(r => {
            console.log(`   - ${r.test}: ${r.message}`);
        });
    }
    console.log('\n' + '═'.repeat(60));
    if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! Migration system is working perfectly!\n');
    }
    else {
        console.log(`\n⚠️  ${failed} test(s) failed. Please review the errors above.\n`);
    }
    return failed === 0;
}
// Run if executed directly
if (require.main === module) {
    testMigrations()
        .then(success => {
        process.exit(success ? 0 : 1);
    })
        .catch(error => {
        console.error('💥 Test suite error:', error);
        process.exit(1);
    });
}
exports.default = testMigrations;

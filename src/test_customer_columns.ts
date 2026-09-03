import { pgAny, pgOneOrNone } from './utils/prisma-compat';

async function testCustomerColumns() {
    try {
        console.log('Testing customer table columns...\n');

        // Check if columns exist
        const columns = await pgAny(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'customer'
            AND column_name IN ('profile_picture', 'wallet_balance')
            ORDER BY column_name;
        `);

        console.log('📊 Columns found:');
        if (columns.length === 0) {
            console.log('❌ NO COLUMNS FOUND! You need to run the migration.');
        } else {
            columns.forEach(col => {
                console.log(`  ✅ ${col.column_name} (${col.data_type}) - Default: ${col.column_default || 'NULL'}`);
            });
        }

        console.log('\n');

        // Try to fetch a customer
        console.log('Testing customer fetch for ID 34...');
        const customer = await pgOneOrNone(`
            SELECT id, first_name, last_name, email, phone,
                   profile_picture, wallet_balance
            FROM customer
            WHERE id = 34 AND is_deleted = FALSE
        `);

        if (customer) {
            console.log('✅ Customer found:');
            console.log(`  ID: ${customer.id}`);
            console.log(`  Name: ${customer.first_name} ${customer.last_name}`);
            console.log(`  Email: ${customer.email}`);
            console.log(`  Profile Picture: ${customer.profile_picture || 'NULL'}`);
            console.log(`  Wallet Balance: ${customer.wallet_balance ?? 'NULL'}`);
        } else {
            console.log('❌ Customer not found!');
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('column')) {
            console.error('\n🔥 COLUMN ERROR - You need to add the missing columns to the database!');
            console.error('Run this SQL:\n');
            console.error('ALTER TABLE customer ADD COLUMN IF NOT EXISTS profile_picture TEXT;');
            console.error('ALTER TABLE customer ADD COLUMN IF NOT EXISTS wallet_balance INT DEFAULT 0;');
        }
    } finally {
        process.exit(0);
    }
}

testCustomerColumns();

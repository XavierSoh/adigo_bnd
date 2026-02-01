import pgpDb from "./pgdb";
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
    console.log('Starting migration: add_missing_event_columns...');

    try {
        const sqlPath = path.join(__dirname, '../migrations/add_missing_event_columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pgpDb.none(sql);

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error: any) {
        console.error('Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();

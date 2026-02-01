import createTables from "./create_tables";
import initFirtsItems from "./initFirtsItems";
import createChatTables, { createChatDatabaseIfNotExists } from "./chat_tables";
import { migrateCustomerTable } from "./migrate_customer_table";
import { migrateBookingPaymentMethod } from "./migrate_booking_payment_method";
import { migrateBookingCreatedBy } from "./migrate_booking_created_by";

export const initDb = async () =>  {
    // Créer la base de données si elle n'existe pas
    const dbName = process.env.DB_DATABASE || 'adigo_db';
    await createChatDatabaseIfNotExists(dbName);

    // Créer les tables
    await createTables();
    await createChatTables();

    // Run migrations
    await migrateCustomerTable();
    await migrateBookingPaymentMethod();
    await migrateBookingCreatedBy();

    // Initialiser les données par défaut
    await initFirtsItems();
}
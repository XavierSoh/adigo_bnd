import createTables from "./create_tables";
import initFirtsItems from "./initFirtsItems";
import createChatTables, { createChatDatabaseIfNotExists } from "./chat_tables";
import { migrateCustomerTable } from "./migrate_customer_table";
import { migrateBookingPaymentMethod } from "./migrate_booking_payment_method";
import { migrateBookingCreatedBy } from "./migrate_booking_created_by";
import { migrateAccessRights } from "./migrate_access_rights";
import { migrateVtcDriverDocuments } from "./migrate_vtc_driver_documents";
import { migrateCustomerAuthTokens } from "./migrate_customer_auth_tokens";
import { migrateEventCodeColumn } from "./migrate_event_code_column";
import { migrateCustomerGoogleId } from "./migrate_customer_google_id";
import { migrateBookingPushNotifications } from "./migrate_booking_push_notifications";

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
    await migrateAccessRights();
    await migrateVtcDriverDocuments();
    await migrateCustomerAuthTokens();
    await migrateEventCodeColumn();
    await migrateCustomerGoogleId();
    await migrateBookingPushNotifications();

    // Initialiser les données par défaut
    await initFirtsItems();
}
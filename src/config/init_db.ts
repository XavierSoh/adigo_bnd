import createTables from "./create_tables";
import initFirtsItems from "./initFirtsItems";
import createChatTables, { createChatDatabaseIfNotExists } from "./chat_tables";
import { migrateCustomerTable } from "./migrate_customer_table";
import { migrateBookingPaymentMethod } from "./migrate_booking_payment_method";
import { migrateBookingCreatedBy } from "./migrate_booking_created_by";
import { migrateAccessRights } from "./migrate_access_rights";
import { migrateVtcDriverDocuments } from "./migrate_vtc_driver_documents";
import { migrateVtcDriverVerification } from "./migrate_vtc_driver_verification";
import { migrateCustomerAuthTokens } from "./migrate_customer_auth_tokens";
import { migrateEventCodeColumn } from "./migrate_event_code_column";
import { migrateCustomerGoogleId } from "./migrate_customer_google_id";
import { migrateBookingPushNotifications } from "./migrate_booking_push_notifications";
import { migrateVtcDriverCancellations } from "./migrate_vtc_driver_cancellations";
import { migrateVtcCancellationFee } from "./migrate_vtc_cancellation_fee";
import { migrateVtcPromo } from "./migrate_vtc_promo";
import { migrateVtcCommission } from "./migrate_vtc_commission";
import { migrateVtcScheduledStatus } from "./migrate_vtc_scheduled_status";
import { migrateVtcDriverStatusCheck } from "./migrate_vtc_driver_status_check";

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
    await migrateVtcDriverVerification();
    await migrateCustomerAuthTokens();
    await migrateEventCodeColumn();
    await migrateCustomerGoogleId();
    await migrateBookingPushNotifications();
    await migrateVtcDriverCancellations();
    await migrateVtcCancellationFee();
    await migrateVtcPromo();
    await migrateVtcCommission();
    await migrateVtcScheduledStatus();
    await migrateVtcDriverStatusCheck();

    // Initialiser les données par défaut
    await initFirtsItems();
}
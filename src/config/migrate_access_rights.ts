import { pgNone } from "../utils/prisma-compat";
import { kAccessRight, kProfileAccessRights } from "../utils/table_names";

/**
 * The admin sidebar (adigo2 custom_nav_rails_destinations.dart) used to gate
 * ~16 unrelated modules — Customers, Agency, Conversations, Settings, the
 * whole Ticketing section, VTC Dispatch — all behind the single MANAGE_USERS
 * access right, as a placeholder that was never finished. This migration
 * creates the dedicated access_right rows the frontend now checks instead,
 * and grants them to every profile that already had MANAGE_USERS so nobody
 * loses access as that one blanket right gets split up.
 *
 * Safe to run repeatedly: both inserts are no-ops once applied.
 */
export const migrateAccessRights = async () => {
    try {
        console.log('🔄 Starting access rights migration...');

        const newAccessRights: Array<{
            key: string;
            module: string;
            module_name_en: string;
            module_name_fr: string;
            description_en: string;
            description_fr: string;
        }> = [
            {
                key: 'VIEW_CUSTOMERS',
                module: 'customers',
                module_name_en: 'Customers',
                module_name_fr: 'Clients',
                description_en: 'View and manage customers',
                description_fr: 'Voir et gérer les clients',
            },
            {
                key: 'VIEW_CONVERSATIONS',
                module: 'chat',
                module_name_en: 'Support',
                module_name_fr: 'Support',
                description_en: 'View and reply to customer conversations',
                description_fr: 'Voir et répondre aux conversations clients',
            },
            {
                key: 'MANAGE_SETTINGS',
                module: 'settings',
                module_name_en: 'Settings',
                module_name_fr: 'Réglages',
                description_en: 'Manage agency/admin settings',
                description_fr: "Gérer les réglages de l'agence/admin",
            },
            {
                key: 'MANAGE_TICKETING',
                module: 'ticketing',
                module_name_en: 'Ticketing',
                module_name_fr: 'Billetterie',
                description_en: 'Manage the ticketing module (dashboard, users, validation, transactions, reviews, marketplace, promo codes, settings, reports, logs)',
                description_fr: 'Gérer le module billetterie (tableau de bord, utilisateurs, validations, transactions, avis, marketplace, codes promo, réglages, rapports, logs)',
            },
            {
                key: 'MANAGE_VTC',
                module: 'vtc',
                module_name_en: 'VTC Dispatch',
                module_name_fr: 'Dispatch VTC',
                description_en: 'Manage VTC dispatch',
                description_fr: 'Gérer le dispatch VTC',
            },
            {
                key: 'MANAGE_AGENCY_SETTINGS',
                module: 'agency',
                module_name_en: 'Agency',
                module_name_fr: 'Agence',
                description_en: 'View and manage agency information',
                description_fr: "Voir et gérer les informations de l'agence",
            },
        ];

        for (const ar of newAccessRights) {
            await pgNone(
                `INSERT INTO ${kAccessRight} (key, module, module_name_en, module_name_fr, description_en, description_fr)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (key) DO NOTHING`,
                [ar.key, ar.module, ar.module_name_en, ar.module_name_fr, ar.description_en, ar.description_fr]
            );
        }
        console.log(`✅ Ensured ${newAccessRights.length} access_right rows exist`);

        // Grant the new rights to every profile that already had MANAGE_USERS.
        const newKeys = newAccessRights.map((ar) => ar.key);
        await pgNone(
            `INSERT INTO ${kProfileAccessRights} (profile_id, access_right_id)
             SELECT par.profile_id, ar_new.id
             FROM ${kProfileAccessRights} par
             JOIN ${kAccessRight} ar_old ON ar_old.id = par.access_right_id AND ar_old.key = 'MANAGE_USERS'
             CROSS JOIN ${kAccessRight} ar_new
             WHERE ar_new.key = ANY($1)
             ON CONFLICT (profile_id, access_right_id) DO NOTHING`,
            [newKeys]
        );
        console.log('✅ Granted new access rights to profiles that already had MANAGE_USERS');

        console.log('✅ Access rights migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating access rights:', error);
        throw error;
    }
};

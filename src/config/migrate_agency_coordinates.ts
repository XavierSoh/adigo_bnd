import { pgNone } from "../utils/prisma-compat";

/**
 * `agency.latitude`/`longitude` were added to schema.prisma (GPS coordinates
 * for the agency's main location, first step toward a per-station "point
 * d'embarquement" feature) but create_tables.ts's original CREATE TABLE IF
 * NOT EXISTS for `agency` predates them and was never a no-op on an
 * already-existing production table — same class of drift as
 * migrate_vtc_driver_status_check.ts. Found live 2026-09-22 testing the
 * prod installer: every GET /agency 500'd with Postgres P2022
 * ("The column agency.latitude does not exist"), and since the response
 * had no `body` key at all on a 500, the desktop's `response.data['body']
 * as List` cast surfaced it as a misleading "type 'Null' is not a subtype
 * of type 'List<dynamic>'" - coincidentally the same message as the
 * earlier (already-fixed) cities_served null-safety bug, but a completely
 * different root cause.
 */
export const migrateAgencyCoordinates = async () => {
    try {
        console.log('🔄 Starting agency coordinates migration...');

        await pgNone(`ALTER TABLE agency ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`);
        await pgNone(`ALTER TABLE agency ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`);

        console.log('✅ Agency coordinates migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating agency coordinates:', error);
        throw error;
    }
};

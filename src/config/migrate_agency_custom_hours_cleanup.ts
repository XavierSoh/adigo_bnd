import { pgNone } from "../utils/prisma-compat";

/**
 * Data cleanup, not a schema change - every agency created before today's
 * AgencyController.createAgency/updateAgency fix (parseCustomHours) got a
 * JSON *string* '""' (or '"null"') stored in the custom_hours Json? column
 * instead of real SQL NULL, because a null Dart value serialized through
 * multipart/form-data becomes the literal 4-character string "null", which
 * `agency.custom_hours ?? undefined` (a truthy string) never caught.
 * Confirmed live 2026-09-22: every one of the 5 agencies that existed
 * before the fix carried this, and kept crashing the desktop's "Agence"
 * list (`json['custom_hours'] as Map<String, dynamic>?`) even after the
 * write-path bug itself was fixed - only new rows were ever safe. This
 * normalizes the existing bad values back to true NULL; safe to re-run
 * (a no-op once every row is clean).
 */
export const migrateAgencyCustomHoursCleanup = async () => {
    try {
        console.log('🔄 Starting agency custom_hours cleanup migration...');

        await pgNone(`
            UPDATE agency
            SET custom_hours = NULL
            WHERE custom_hours IS NOT NULL
              AND jsonb_typeof(custom_hours) = 'string'
        `);

        console.log('✅ Agency custom_hours cleanup migration completed successfully');
    } catch (error) {
        console.error('❌ Error cleaning up agency custom_hours:', error);
        throw error;
    }
};

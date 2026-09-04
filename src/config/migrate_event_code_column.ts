import { pgNone } from "../utils/prisma-compat";

/**
 * `event.code` and `event.maps_link` are part of the CREATE TABLE in
 * src/migrations/ticketing/001_create_tables.sql, but that's a
 * `CREATE TABLE IF NOT EXISTS` - a no-op wherever `event` already existed
 * before these were added to the schema. Production's `event` table
 * predated them (it also carries a pile of legacy columns from an earlier,
 * different event schema generation - venue_map_link, event_code,
 * ticket_price, etc. - that current schema.prisma no longer declares;
 * those are harmless leftovers, not touched here), so
 * `prisma.event.findMany()`/`findUnique()` (which always select every
 * scalar column) threw `P2022: column event.<x> does not exist` on every
 * call - discovered live, GET /ticketing/events was fully down in
 * production. This retrofits both columns; existing rows keep them NULL
 * (both nullable in schema.prisma, nothing assumes they're set) rather
 * than backfilling values for old rows.
 *
 * IMPORTANT: the legacy columns this file references (organization_name,
 * event_code, total_tickets, available_quantity) only exist on
 * environments whose tables predate the current schema (production, as
 * found) - a fresh install / local dev DB created straight from
 * src/migrations/ticketing/001_create_tables.sql never has them at all.
 * Every reference to one is guarded with an information_schema existence
 * check first - reproduced and fixed live after this crashed a fresh
 * local server boot with `column "organization_name" does not exist`.
 */
export const migrateEventCodeColumn = async () => {
    try {
        console.log('🔄 Starting event/event_organizer schema-drift migration...');
        await pgNone(`
            ALTER TABLE event
            ADD COLUMN IF NOT EXISTS code VARCHAR(20) UNIQUE,
            ADD COLUMN IF NOT EXISTS maps_link TEXT
        `);
        console.log('✅ Ensured event.code and event.maps_link columns exist');

        // event_organizer's `name` predates the current schema.prisma under
        // the name `organization_name` on environments that have it - add
        // the new column and backfill from the old one there so existing
        // rows aren't left NULL for a schema field the Prisma model
        // declares non-nullable (nullable in the DB regardless - a NOT
        // NULL constraint isn't added, to avoid failing on any row
        // organization_name itself is also NULL for).
        await pgNone(`
            ALTER TABLE event_organizer
            ADD COLUMN IF NOT EXISTS name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'individual',
            ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS id_card_front VARCHAR(255),
            ADD COLUMN IF NOT EXISTS id_card_back VARCHAR(255),
            ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0
        `);
        await pgNone(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_organizer' AND column_name='organization_name') THEN
                    UPDATE event_organizer SET name = organization_name WHERE name IS NULL AND organization_name IS NOT NULL;
                    -- organization_name predates schema.prisma (which doesn't declare
                    -- it at all) but was still NOT NULL with no default - blocking
                    -- every real organizer creation through the app (which only ever
                    -- sets the columns schema.prisma knows about, i.e. never this
                    -- one), not just this migration's own inserts. Found live via a
                    -- direct P2011 NullConstraintViolation while verifying the
                    -- ticketing payment work in production.
                    ALTER TABLE event_organizer ALTER COLUMN organization_name DROP NOT NULL;
                END IF;
            END $$;
        `);
        console.log('✅ Ensured event_organizer.name/type/verified_at/id_card_front/id_card_back/total_sales columns exist (name backfilled from organization_name where present)');

        // event_ticket_type has the same drift, under different legacy
        // names (sold_quantity, max_purchase, sale_start_date/end_date) -
        // this one matters more: TicketTypeRepository.incrementSold and
        // .validateAvailability (see the ticketing payment plan) read/write
        // `sold`/`max_per_order` directly, so a real purchase would have
        // crashed in production without this. 0 rows existed in
        // event_ticket_type at the time this was found, so no backfill
        // from the legacy columns was needed - if that's no longer true,
        // check before assuming this migration is still a no-op backfill-wise.
        await pgNone(`
            ALTER TABLE event_ticket_type
            ADD COLUMN IF NOT EXISTS sold INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS sale_start TIMESTAMP,
            ADD COLUMN IF NOT EXISTS sale_end TIMESTAMP,
            ADD COLUMN IF NOT EXISTS max_per_order INTEGER DEFAULT 10
        `);
        console.log('✅ Ensured event_ticket_type.sold/sale_start/sale_end/max_per_order columns exist');

        // Same legacy-NOT-NULL-with-no-default trap as event_code/
        // total_tickets/organization_name above - available_quantity isn't
        // in schema.prisma at all, so nothing ever sets it, blocking every
        // real ticket-type creation on environments that have the column.
        await pgNone(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_ticket_type' AND column_name='available_quantity') THEN
                    ALTER TABLE event_ticket_type ALTER COLUMN available_quantity DROP NOT NULL;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='event_code') THEN
                    ALTER TABLE event ALTER COLUMN event_code DROP NOT NULL;
                END IF;
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='total_tickets') THEN
                    ALTER TABLE event ALTER COLUMN total_tickets DROP NOT NULL;
                END IF;
            END $$;
        `);
        console.log('✅ Dropped legacy NOT NULL constraints where present (event.event_code/total_tickets, event_ticket_type.available_quantity) - not populated by any live code path');
    } catch (error) {
        console.error('❌ Error migrating event/event_organizer schema drift:', error);
        throw error;
    }
};

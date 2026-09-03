-- =====================================================
-- MIGRATION: Add missing columns to event_ticket table
-- Date: 2026-08-19
-- Description: event-ticket-purchase.repository.ts reads/writes ~20 columns
-- (payment_reference, qr_code_data, is_validated, attendee_*, is_deleted...)
-- that were never added to the event_ticket table created by
-- ticketing/001_create_tables.sql. Ticket purchase, confirmation,
-- validation, and cancellation all fail today with
-- "column ... does not exist" without this migration.
-- Same pattern as add_missing_event_columns.sql.
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'subtotal') THEN
        ALTER TABLE event_ticket ADD COLUMN subtotal INTEGER;
        RAISE NOTICE 'Column subtotal added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'final_price') THEN
        ALTER TABLE event_ticket ADD COLUMN final_price INTEGER;
        RAISE NOTICE 'Column final_price added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'payment_reference') THEN
        ALTER TABLE event_ticket ADD COLUMN payment_reference VARCHAR(100);
        COMMENT ON COLUMN event_ticket.payment_reference IS 'External payment provider reference (distinct from the legacy payment_ref column)';
        RAISE NOTICE 'Column payment_reference added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'purchase_source') THEN
        ALTER TABLE event_ticket ADD COLUMN purchase_source VARCHAR(20) DEFAULT 'web';
        RAISE NOTICE 'Column purchase_source added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'attendee_name') THEN
        ALTER TABLE event_ticket ADD COLUMN attendee_name VARCHAR(200);
        RAISE NOTICE 'Column attendee_name added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'attendee_first_name') THEN
        ALTER TABLE event_ticket ADD COLUMN attendee_first_name VARCHAR(100);
        RAISE NOTICE 'Column attendee_first_name added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'attendee_last_name') THEN
        ALTER TABLE event_ticket ADD COLUMN attendee_last_name VARCHAR(100);
        RAISE NOTICE 'Column attendee_last_name added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'attendee_email') THEN
        ALTER TABLE event_ticket ADD COLUMN attendee_email VARCHAR(100);
        RAISE NOTICE 'Column attendee_email added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'attendee_phone') THEN
        ALTER TABLE event_ticket ADD COLUMN attendee_phone VARCHAR(20);
        RAISE NOTICE 'Column attendee_phone added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'group_id') THEN
        ALTER TABLE event_ticket ADD COLUMN group_id INTEGER;
        RAISE NOTICE 'Column group_id added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'is_group_leader') THEN
        ALTER TABLE event_ticket ADD COLUMN is_group_leader BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Column is_group_leader added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'qr_code_data') THEN
        ALTER TABLE event_ticket ADD COLUMN qr_code_data VARCHAR(255);
        COMMENT ON COLUMN event_ticket.qr_code_data IS 'QR payload string (distinct from the legacy qr_code column)';
        RAISE NOTICE 'Column qr_code_data added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'qr_code_image') THEN
        ALTER TABLE event_ticket ADD COLUMN qr_code_image VARCHAR(255);
        RAISE NOTICE 'Column qr_code_image added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'wallet_transaction_id') THEN
        ALTER TABLE event_ticket ADD COLUMN wallet_transaction_id INTEGER REFERENCES wallet_transaction(id);
        RAISE NOTICE 'Column wallet_transaction_id added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'payment_date') THEN
        ALTER TABLE event_ticket ADD COLUMN payment_date TIMESTAMP;
        RAISE NOTICE 'Column payment_date added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'confirmation_date') THEN
        ALTER TABLE event_ticket ADD COLUMN confirmation_date TIMESTAMP;
        RAISE NOTICE 'Column confirmation_date added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'updated_at') THEN
        ALTER TABLE event_ticket ADD COLUMN updated_at TIMESTAMP;
        RAISE NOTICE 'Column updated_at added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'is_validated') THEN
        ALTER TABLE event_ticket ADD COLUMN is_validated BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Column is_validated added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'validated_at') THEN
        ALTER TABLE event_ticket ADD COLUMN validated_at TIMESTAMP;
        RAISE NOTICE 'Column validated_at added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'validated_by') THEN
        ALTER TABLE event_ticket ADD COLUMN validated_by INTEGER REFERENCES users(id);
        RAISE NOTICE 'Column validated_by added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'validation_method') THEN
        ALTER TABLE event_ticket ADD COLUMN validation_method VARCHAR(50);
        RAISE NOTICE 'Column validation_method added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'cancellation_date') THEN
        ALTER TABLE event_ticket ADD COLUMN cancellation_date TIMESTAMP;
        RAISE NOTICE 'Column cancellation_date added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE event_ticket ADD COLUMN cancellation_reason TEXT;
        RAISE NOTICE 'Column cancellation_reason added';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_ticket' AND column_name = 'is_deleted') THEN
        ALTER TABLE event_ticket ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN event_ticket.is_deleted IS 'Every read query in event-ticket-purchase.repository.ts filters on this column';
        RAISE NOTICE 'Column is_deleted added';
    END IF;
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
DO $$ BEGIN RAISE NOTICE 'Migration completed: All missing event_ticket columns added successfully'; END $$;

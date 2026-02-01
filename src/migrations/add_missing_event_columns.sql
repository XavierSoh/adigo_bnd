-- =====================================================
-- MIGRATION: Add missing columns to event table
-- Date: 2025-12-01
-- Description: Adds columns required by the event repository
-- =====================================================

-- Add city column (alias for venue_city for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'city') THEN
        ALTER TABLE event ADD COLUMN city VARCHAR(100);
        COMMENT ON COLUMN event.city IS 'City of the event (shorthand for venue_city)';
        RAISE NOTICE 'Column city added';
    END IF;
END $$;

-- Add venue_map_link column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'venue_map_link') THEN
        ALTER TABLE event ADD COLUMN venue_map_link TEXT;
        COMMENT ON COLUMN event.venue_map_link IS 'Google Maps or other map link for the venue';
        RAISE NOTICE 'Column venue_map_link added';
    END IF;
END $$;

-- Add cover_image column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'cover_image') THEN
        ALTER TABLE event ADD COLUMN cover_image VARCHAR(255);
        COMMENT ON COLUMN event.cover_image IS 'Cover/poster image for the event';
        RAISE NOTICE 'Column cover_image added';
    END IF;
END $$;

-- Add ticket_price column (single price for simple events)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'ticket_price') THEN
        ALTER TABLE event ADD COLUMN ticket_price INTEGER DEFAULT 0;
        COMMENT ON COLUMN event.ticket_price IS 'Base ticket price for simple event pricing';
        RAISE NOTICE 'Column ticket_price added';
    END IF;
END $$;

-- Add early_bird_price column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'early_bird_price') THEN
        ALTER TABLE event ADD COLUMN early_bird_price INTEGER;
        COMMENT ON COLUMN event.early_bird_price IS 'Early bird discounted price';
        RAISE NOTICE 'Column early_bird_price added';
    END IF;
END $$;

-- Add early_bird_deadline column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'early_bird_deadline') THEN
        ALTER TABLE event ADD COLUMN early_bird_deadline TIMESTAMP;
        COMMENT ON COLUMN event.early_bird_deadline IS 'Deadline for early bird pricing';
        RAISE NOTICE 'Column early_bird_deadline added';
    END IF;
END $$;

-- Add min_ticket_per_order column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'min_ticket_per_order') THEN
        ALTER TABLE event ADD COLUMN min_ticket_per_order INTEGER DEFAULT 1;
        COMMENT ON COLUMN event.min_ticket_per_order IS 'Minimum tickets per order';
        RAISE NOTICE 'Column min_ticket_per_order added';
    END IF;
END $$;

-- Add max_ticket_per_order column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'max_ticket_per_order') THEN
        ALTER TABLE event ADD COLUMN max_ticket_per_order INTEGER DEFAULT 10;
        COMMENT ON COLUMN event.max_ticket_per_order IS 'Maximum tickets per order';
        RAISE NOTICE 'Column max_ticket_per_order added';
    END IF;
END $$;

-- Add cancellation_policy column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'cancellation_policy') THEN
        ALTER TABLE event ADD COLUMN cancellation_policy TEXT;
        COMMENT ON COLUMN event.cancellation_policy IS 'Event cancellation policy';
        RAISE NOTICE 'Column cancellation_policy added';
    END IF;
END $$;

-- Add registration_deadline column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'registration_deadline') THEN
        ALTER TABLE event ADD COLUMN registration_deadline TIMESTAMP;
        COMMENT ON COLUMN event.registration_deadline IS 'Deadline for ticket registration/purchase';
        RAISE NOTICE 'Column registration_deadline added';
    END IF;
END $$;

-- Add has_boost column (alias for boost_visibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'has_boost') THEN
        ALTER TABLE event ADD COLUMN has_boost BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN event.has_boost IS 'Whether event has visibility boost enabled';
        RAISE NOTICE 'Column has_boost added';
    END IF;
END $$;

-- Add has_featured_placement column (alias for is_featured)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'has_featured_placement') THEN
        ALTER TABLE event ADD COLUMN has_featured_placement BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN event.has_featured_placement IS 'Whether event has featured placement';
        RAISE NOTICE 'Column has_featured_placement added';
    END IF;
END $$;

-- Add boost_start_date column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'boost_start_date') THEN
        ALTER TABLE event ADD COLUMN boost_start_date TIMESTAMP;
        COMMENT ON COLUMN event.boost_start_date IS 'Start date for visibility boost';
        RAISE NOTICE 'Column boost_start_date added';
    END IF;
END $$;

-- Add boost_end_date column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'boost_end_date') THEN
        ALTER TABLE event ADD COLUMN boost_end_date TIMESTAMP;
        COMMENT ON COLUMN event.boost_end_date IS 'End date for visibility boost';
        RAISE NOTICE 'Column boost_end_date added';
    END IF;
END $$;

-- Add featured_placement_duration column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'featured_placement_duration') THEN
        ALTER TABLE event ADD COLUMN featured_placement_duration INTEGER DEFAULT 0;
        COMMENT ON COLUMN event.featured_placement_duration IS 'Duration of featured placement in days';
        RAISE NOTICE 'Column featured_placement_duration added';
    END IF;
END $$;

-- Add featured_placement_amount column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'featured_placement_amount') THEN
        ALTER TABLE event ADD COLUMN featured_placement_amount INTEGER DEFAULT 0;
        COMMENT ON COLUMN event.featured_placement_amount IS 'Amount paid for featured placement';
        RAISE NOTICE 'Column featured_placement_amount added';
    END IF;
END $$;

-- Add contact_name column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'contact_name') THEN
        ALTER TABLE event ADD COLUMN contact_name VARCHAR(200);
        COMMENT ON COLUMN event.contact_name IS 'Contact person name for the event';
        RAISE NOTICE 'Column contact_name added';
    END IF;
END $$;

-- Add contact_phone column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'contact_phone') THEN
        ALTER TABLE event ADD COLUMN contact_phone VARCHAR(20);
        COMMENT ON COLUMN event.contact_phone IS 'Contact phone number for the event';
        RAISE NOTICE 'Column contact_phone added';
    END IF;
END $$;

-- Add contact_email column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'contact_email') THEN
        ALTER TABLE event ADD COLUMN contact_email VARCHAR(100);
        COMMENT ON COLUMN event.contact_email IS 'Contact email for the event';
        RAISE NOTICE 'Column contact_email added';
    END IF;
END $$;

-- Add validated_at column (alias for validation_date)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'validated_at') THEN
        ALTER TABLE event ADD COLUMN validated_at TIMESTAMP;
        COMMENT ON COLUMN event.validated_at IS 'Timestamp when event was validated';
        RAISE NOTICE 'Column validated_at added';
    END IF;
END $$;

-- Add validation_notes column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'validation_notes') THEN
        ALTER TABLE event ADD COLUMN validation_notes TEXT;
        COMMENT ON COLUMN event.validation_notes IS 'Notes from validation process';
        RAISE NOTICE 'Column validation_notes added';
    END IF;
END $$;

-- Add cancellation_reason column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'cancellation_reason') THEN
        ALTER TABLE event ADD COLUMN cancellation_reason TEXT;
        COMMENT ON COLUMN event.cancellation_reason IS 'Reason for event cancellation';
        RAISE NOTICE 'Column cancellation_reason added';
    END IF;
END $$;

-- Add tickets_sold column (alias for sold_tickets)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'tickets_sold') THEN
        ALTER TABLE event ADD COLUMN tickets_sold INTEGER DEFAULT 0;
        COMMENT ON COLUMN event.tickets_sold IS 'Number of tickets sold';
        RAISE NOTICE 'Column tickets_sold added';
    END IF;
END $$;

-- Add total_revenue column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'total_revenue') THEN
        ALTER TABLE event ADD COLUMN total_revenue INTEGER DEFAULT 0;
        COMMENT ON COLUMN event.total_revenue IS 'Total revenue from ticket sales';
        RAISE NOTICE 'Column total_revenue added';
    END IF;
END $$;

-- Add average_rating column (alias for rating)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event' AND column_name = 'average_rating') THEN
        ALTER TABLE event ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00;
        COMMENT ON COLUMN event.average_rating IS 'Average rating from reviews';
        RAISE NOTICE 'Column average_rating added';
    END IF;
END $$;

-- =====================================================
-- Make some existing NOT NULL columns nullable for flexibility
-- =====================================================

-- Make venue_address nullable (we're using venue_name + city now)
ALTER TABLE event ALTER COLUMN venue_address DROP NOT NULL;

-- Make venue_city nullable (we have city column now)
ALTER TABLE event ALTER COLUMN venue_city DROP NOT NULL;

-- Make min_price nullable (we have ticket_price now)
ALTER TABLE event ALTER COLUMN min_price DROP NOT NULL;

-- Make max_price nullable (we have ticket_price now)
ALTER TABLE event ALTER COLUMN max_price DROP NOT NULL;

-- Make available_tickets nullable (will be set automatically)
ALTER TABLE event ALTER COLUMN available_tickets DROP NOT NULL;

-- Set default for available_tickets
ALTER TABLE event ALTER COLUMN available_tickets SET DEFAULT 0;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
DO $$ BEGIN RAISE NOTICE 'Migration completed: All missing event columns added successfully'; END $$;

-- Rebuild BILLETTERIE admin surface: additive-only schema changes.
-- See plan at BOOKING_MODULE_NOTES.md ("Ticketing admin surface rebuild")
-- and the session that designed it. Every ALTER is guarded so this file is
-- safe to re-run. Nothing existing is touched, renamed, or dropped.

DO $$
BEGIN
    -- event: organizer creation flow (premium/boost/featured flags — no
    -- billing logic behind them yet, deliberately minimal) + validation
    -- workflow + contact/policy text fields.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='registration_deadline') THEN
        ALTER TABLE event ADD COLUMN registration_deadline TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='gallery_images') THEN
        ALTER TABLE event ADD COLUMN gallery_images TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='terms_and_conditions') THEN
        ALTER TABLE event ADD COLUMN terms_and_conditions TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='cancellation_policy') THEN
        ALTER TABLE event ADD COLUMN cancellation_policy TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='refund_policy') THEN
        ALTER TABLE event ADD COLUMN refund_policy TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='has_premium_design') THEN
        ALTER TABLE event ADD COLUMN has_premium_design BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='has_boost') THEN
        ALTER TABLE event ADD COLUMN has_boost BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='has_featured_placement') THEN
        ALTER TABLE event ADD COLUMN has_featured_placement BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='boost_start_date') THEN
        ALTER TABLE event ADD COLUMN boost_start_date TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='boost_end_date') THEN
        ALTER TABLE event ADD COLUMN boost_end_date TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='featured_placement_duration') THEN
        ALTER TABLE event ADD COLUMN featured_placement_duration INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='premium_design_amount') THEN
        ALTER TABLE event ADD COLUMN premium_design_amount INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='boost_amount') THEN
        ALTER TABLE event ADD COLUMN boost_amount INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='featured_placement_amount') THEN
        ALTER TABLE event ADD COLUMN featured_placement_amount INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='contact_name') THEN
        ALTER TABLE event ADD COLUMN contact_name VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='contact_phone') THEN
        ALTER TABLE event ADD COLUMN contact_phone VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='contact_email') THEN
        ALTER TABLE event ADD COLUMN contact_email VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='validation_status') THEN
        ALTER TABLE event ADD COLUMN validation_status VARCHAR(20) DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='validated_by') THEN
        ALTER TABLE event ADD COLUMN validated_by INTEGER REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='validated_at') THEN
        ALTER TABLE event ADD COLUMN validated_at TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='validation_notes') THEN
        ALTER TABLE event ADD COLUMN validation_notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='published_at') THEN
        ALTER TABLE event ADD COLUMN published_at TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='cancellation_reason') THEN
        ALTER TABLE event ADD COLUMN cancellation_reason TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='cancelled_at') THEN
        ALTER TABLE event ADD COLUMN cancelled_at TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event' AND column_name='created_by') THEN
        ALTER TABLE event ADD COLUMN created_by INTEGER REFERENCES users(id);
    END IF;

    -- event_organizer: fields the "Validation Organisateurs" screen's
    -- OrganizerProfile model needs that don't exist yet.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_organizer' AND column_name='verification_notes') THEN
        ALTER TABLE event_organizer ADD COLUMN verification_notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_organizer' AND column_name='payment_info') THEN
        ALTER TABLE event_organizer ADD COLUMN payment_info TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_organizer' AND column_name='venue_authorization') THEN
        ALTER TABLE event_organizer ADD COLUMN venue_authorization TEXT;
    END IF;

    -- event_ticket_resale: audit trail for the admin "approve" action.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_ticket_resale' AND column_name='approved_by') THEN
        ALTER TABLE event_ticket_resale ADD COLUMN approved_by INTEGER REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='event_ticket_resale' AND column_name='approved_at') THEN
        ALTER TABLE event_ticket_resale ADD COLUMN approved_at TIMESTAMP;
    END IF;

    RAISE NOTICE 'Ticketing admin surface rebuild: additive columns ensured';
END $$;

-- New table for "Paramètres Système" — a real key/value settings store.
-- Starts empty; nothing pre-seeded.
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP,
    updated_by INTEGER REFERENCES users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_system_settings_category_key UNIQUE (category, setting_key)
);

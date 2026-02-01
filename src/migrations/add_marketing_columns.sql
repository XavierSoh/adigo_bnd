-- =====================================================
-- ADD MARKETING & PREMIUM SERVICES COLUMNS
-- Version: 1.1.0
-- Description: Adds missing marketing and premium service columns to event table
-- =====================================================

-- Check if migration already applied
DO $$
BEGIN
    IF NOT migration_exists('add_marketing_columns_v1.1.0') THEN

        -- Add marketing poster columns
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'event' AND column_name = 'marketing_poster_basic'
        ) THEN
            ALTER TABLE event ADD COLUMN marketing_poster_basic BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'event' AND column_name = 'marketing_poster_premium'
        ) THEN
            ALTER TABLE event ADD COLUMN marketing_poster_premium BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'event' AND column_name = 'marketing_poster_amount'
        ) THEN
            ALTER TABLE event ADD COLUMN marketing_poster_amount INT DEFAULT 0;
        END IF;

        -- Add marketing ads columns
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'event' AND column_name = 'marketing_ads_enabled'
        ) THEN
            ALTER TABLE event ADD COLUMN marketing_ads_enabled BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'event' AND column_name = 'marketing_ads_budget'
        ) THEN
            ALTER TABLE event ADD COLUMN marketing_ads_budget INT DEFAULT 0;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'event' AND column_name = 'marketing_ads_platform'
        ) THEN
            ALTER TABLE event ADD COLUMN marketing_ads_platform VARCHAR(50); -- 'facebook', 'instagram', 'both'
        END IF;

        -- Add SMS notification columns
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'event' AND column_name = 'sms_notifications_enabled'
        ) THEN
            ALTER TABLE event ADD COLUMN sms_notifications_enabled BOOLEAN DEFAULT FALSE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'event' AND column_name = 'sms_count'
        ) THEN
            ALTER TABLE event ADD COLUMN sms_count INT DEFAULT 0;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'event' AND column_name = 'sms_cost_total'
        ) THEN
            ALTER TABLE event ADD COLUMN sms_cost_total INT DEFAULT 0; -- Total cost (30 FCFA per SMS)
        END IF;

        -- Add featured placement columns (separate from general boost)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'event' AND column_name = 'featured_placement_type'
        ) THEN
            ALTER TABLE event ADD COLUMN featured_placement_type VARCHAR(50); -- 'homepage', 'category', 'both'
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'event' AND column_name = 'featured_placement_amount'
        ) THEN
            ALTER TABLE event ADD COLUMN featured_placement_amount INT DEFAULT 0;
        END IF;

        -- Add scanner rental for field service
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'event' AND column_name = 'field_service_scanners'
        ) THEN
            ALTER TABLE event ADD COLUMN field_service_scanners INT DEFAULT 0;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'event' AND column_name = 'field_service_scanner_amount'
        ) THEN
            ALTER TABLE event ADD COLUMN field_service_scanner_amount INT DEFAULT 0;
        END IF;

        -- Record migration
        PERFORM record_migration(
            'add_marketing_columns_v1.1.0',
            '1.1.0',
            'Added marketing, SMS, and premium service columns to event table',
            0
        );

        RAISE NOTICE '✅ Marketing columns added successfully';
    ELSE
        RAISE NOTICE '⏭️  Migration add_marketing_columns_v1.1.0 already applied, skipping...';
    END IF;
END $$;

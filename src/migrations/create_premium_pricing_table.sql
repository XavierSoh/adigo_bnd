-- =====================================================
-- PREMIUM SERVICE PRICING TABLE
-- Version: 1.3.0
-- Description: Configurable pricing for all premium services
-- =====================================================

-- Check if migration already applied
DO $$
BEGIN
    IF NOT migration_exists('create_premium_pricing_table_v1.3.0') THEN

        CREATE TABLE IF NOT EXISTS event_premium_service_pricing (
            id SERIAL PRIMARY KEY,
            service_type VARCHAR(50) NOT NULL,           -- Type of service
            service_subtype VARCHAR(50),                 -- Subtype/variant

            -- Pricing
            base_price INT NOT NULL,                     -- Price in FCFA
            currency VARCHAR(10) DEFAULT 'FCFA',

            -- Conditions (for tiered pricing)
            min_capacity INT,                            -- Minimum event capacity
            max_capacity INT,                            -- Maximum event capacity
            duration_days INT,                           -- Duration (for boost services)

            -- Description
            name_en VARCHAR(255) NOT NULL,
            name_fr VARCHAR(255) NOT NULL,
            description_en TEXT,
            description_fr TEXT,

            -- Status
            is_active BOOLEAN DEFAULT TRUE,

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            is_deleted BOOLEAN DEFAULT FALSE,
            deleted_at TIMESTAMP,

            UNIQUE(service_type, service_subtype, min_capacity, duration_days)
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_premium_pricing_service_type
            ON event_premium_service_pricing(service_type)
            WHERE is_active = TRUE AND is_deleted = FALSE;

        CREATE INDEX IF NOT EXISTS idx_premium_pricing_active
            ON event_premium_service_pricing(is_active)
            WHERE is_deleted = FALSE;

        -- Trigger
        CREATE TRIGGER update_premium_pricing_updated_at
        BEFORE UPDATE ON event_premium_service_pricing
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        -- Seed default pricing according to ADIGO TICKETS document

        -- 1. DESIGN PREMIUM (OBLIGATOIRE) - Based on capacity
        INSERT INTO event_premium_service_pricing
            (service_type, service_subtype, base_price, min_capacity, max_capacity, name_en, name_fr, description_en, description_fr)
        VALUES
            ('design', 'small', 15000, 0, 200, 'Premium Ticket Design - Small Events', 'Design Premium Tickets - Petits Événements',
             'Professional ticket design for events up to 200 attendees',
             'Design professionnel de tickets pour événements jusqu''à 200 participants'),

            ('design', 'medium', 25000, 201, 1000, 'Premium Ticket Design - Medium Events', 'Design Premium Tickets - Événements Moyens',
             'Professional ticket design for events 201-1000 attendees',
             'Design professionnel de tickets pour événements de 201-1000 participants'),

            ('design', 'large', 40000, 1001, 5000, 'Premium Ticket Design - Large Events', 'Design Premium Tickets - Grands Événements',
             'Professional ticket design for events 1001-5000 attendees',
             'Design professionnel de tickets pour événements de 1001-5000 participants'),

            ('design', 'xlarge', 60000, 5001, NULL, 'Premium Ticket Design - Extra Large Events', 'Design Premium Tickets - Très Grands Événements',
             'Professional ticket design for events over 5000 attendees',
             'Design professionnel de tickets pour événements de plus de 5000 participants');

        -- 2. BOOST HOMEPAGE - Featured on homepage
        INSERT INTO event_premium_service_pricing
            (service_type, service_subtype, base_price, duration_days, name_en, name_fr, description_en, description_fr)
        VALUES
            ('boost_homepage', '7days', 5000, 7, 'Homepage Featured - 7 Days', 'Mise en Avant Page d''Accueil - 7 Jours',
             'Feature your event on homepage for 7 days',
             'Mettez votre événement en avant sur la page d''accueil pendant 7 jours'),

            ('boost_homepage', '14days', 8000, 14, 'Homepage Featured - 14 Days', 'Mise en Avant Page d''Accueil - 14 Jours',
             'Feature your event on homepage for 14 days',
             'Mettez votre événement en avant sur la page d''accueil pendant 14 jours'),

            ('boost_homepage', '30days', 15000, 30, 'Homepage Featured - 30 Days', 'Mise en Avant Page d''Accueil - 30 Jours',
             'Feature your event on homepage for 30 days',
             'Mettez votre événement en avant sur la page d''accueil pendant 30 jours');

        -- 3. BOOST CATEGORY - Priority in category
        INSERT INTO event_premium_service_pricing
            (service_type, service_subtype, base_price, duration_days, name_en, name_fr, description_en, description_fr)
        VALUES
            ('boost_category', '7days', 3000, 7, 'Category Priority - 7 Days', 'Priorité Catégorie - 7 Jours',
             'Priority placement in category for 7 days',
             'Placement prioritaire dans la catégorie pendant 7 jours'),

            ('boost_category', '14days', 6000, 14, 'Category Priority - 14 Days', 'Priorité Catégorie - 14 Jours',
             'Priority placement in category for 14 days',
             'Placement prioritaire dans la catégorie pendant 14 jours'),

            ('boost_category', '30days', 12000, 30, 'Category Priority - 30 Days', 'Priorité Catégorie - 30 Jours',
             'Priority placement in category for 30 days',
             'Placement prioritaire dans la catégorie pendant 30 jours');

        -- 4. FIELD SERVICE - Agents and scanners
        INSERT INTO event_premium_service_pricing
            (service_type, service_subtype, base_price, name_en, name_fr, description_en, description_fr)
        VALUES
            ('field_service', 'agent_per_day', 25000, 'Field Agent - Per Day', 'Agent sur Terrain - Par Jour',
             'Professional agent for ticket validation on-site (per day)',
             'Agent professionnel pour validation de tickets sur place (par jour)'),

            ('field_service', 'scanner_rental_per_day', 10000, 'Scanner Rental - Per Day', 'Location Scanner - Par Jour',
             'Professional QR scanner rental (per day)',
             'Location de scanner QR professionnel (par jour)');

        -- 5. MARKETING - Posters
        INSERT INTO event_premium_service_pricing
            (service_type, service_subtype, base_price, name_en, name_fr, description_en, description_fr)
        VALUES
            ('marketing', 'poster_basic', 10000, 'Marketing Poster - Basic', 'Affiche Marketing - Basique',
             'Basic marketing poster design',
             'Design d''affiche marketing basique'),

            ('marketing', 'poster_premium', 20000, 'Marketing Poster - Premium', 'Affiche Marketing - Premium',
             'Premium marketing poster design with advanced graphics',
             'Design d''affiche marketing premium avec graphismes avancés');

        -- 6. MARKETING - Ads Campaign (minimum 10k, customer sets budget)
        INSERT INTO event_premium_service_pricing
            (service_type, service_subtype, base_price, name_en, name_fr, description_en, description_fr)
        VALUES
            ('marketing', 'ads_management', 10000, 'Social Media Ads Management', 'Gestion Publicités Réseaux Sociaux',
             'Minimum budget for social media advertising campaign (Facebook/Instagram)',
             'Budget minimum pour campagne publicitaire sur réseaux sociaux (Facebook/Instagram)');

        -- 7. SMS NOTIFICATIONS - Per SMS
        INSERT INTO event_premium_service_pricing
            (service_type, service_subtype, base_price, name_en, name_fr, description_en, description_fr)
        VALUES
            ('sms', 'notification_per_sms', 30, 'SMS Notification', 'Notification SMS',
             'SMS notification sent to participants (per SMS)',
             'Notification SMS envoyée aux participants (par SMS)');

        -- Record migration
        PERFORM record_migration(
            'create_premium_pricing_table_v1.3.0',
            '1.3.0',
            'Created premium service pricing table with default ADIGO pricing',
            0
        );

        RAISE NOTICE '✅ Premium pricing table created and seeded successfully';
    ELSE
        RAISE NOTICE '⏭️  Migration create_premium_pricing_table_v1.3.0 already applied, skipping...';
    END IF;
END $$;

COMMENT ON TABLE event_premium_service_pricing IS 'Configurable pricing for all ADIGO premium services';

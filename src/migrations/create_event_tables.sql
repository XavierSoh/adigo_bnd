-- =====================================================
-- ADIGO TICKETING MODULE - DATABASE SCHEMA
-- Version: 1.0.0
-- Description: Complete schema for event ticketing system
-- =====================================================

-- =====================================================
-- 1. EVENT CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS event_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    name_en VARCHAR(100) NOT NULL,
    name_fr VARCHAR(100) NOT NULL,
    description TEXT,
    description_en TEXT,
    description_fr TEXT,
    icon VARCHAR(50),                                -- Icon name (e.g., 'music', 'theater', 'sports')
    color VARCHAR(20),                               -- Hex color code for UI
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by INT REFERENCES users(id),
    created_by INT REFERENCES users(id)
);

-- =====================================================
-- 2. EVENT ORGANIZERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS event_organizer (
    id SERIAL PRIMARY KEY,
    customer_id INT UNIQUE REFERENCES customer(id) ON DELETE CASCADE,  -- Link to customer account
    organization_name VARCHAR(255) NOT NULL,
    organization_type VARCHAR(50),                   -- 'company', 'association', 'individual'

    -- Contact Information
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Cameroon',

    -- Legal Documents
    rccm_number VARCHAR(100),                        -- Business registration
    rccm_document VARCHAR(255),                      -- Path to uploaded RCCM
    id_card_type VARCHAR(50),                        -- 'national_id', 'passport'
    id_card_number VARCHAR(100),
    id_card_document VARCHAR(255),                   -- Path to uploaded ID
    proof_of_venue VARCHAR(255),                     -- Path to venue authorization (optional)

    -- Media
    logo VARCHAR(255),
    banner_image VARCHAR(255),
    description TEXT,
    description_en TEXT,
    description_fr TEXT,

    -- Social Media
    website VARCHAR(255),
    facebook VARCHAR(255),
    instagram VARCHAR(255),
    twitter VARCHAR(255),
    linkedin VARCHAR(255),

    -- Payment Info
    bank_account_name VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_name VARCHAR(100),
    mobile_money_number VARCHAR(20),
    mobile_money_provider VARCHAR(20),               -- 'mtn', 'orange'

    -- Verification & Status
    verification_status VARCHAR(20) DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
    verification_date TIMESTAMP,
    verified_by INT REFERENCES users(id),
    rejection_reason TEXT,

    -- Statistics
    is_verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_events INT DEFAULT 0,
    total_tickets_sold INT DEFAULT 0,
    total_revenue INT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by INT REFERENCES users(id),
    created_by INT REFERENCES users(id)
);

-- =====================================================
-- 3. EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS event (
    id SERIAL PRIMARY KEY,
    event_code VARCHAR(20) UNIQUE NOT NULL,          -- e.g., 'EVT-2025-001234'

    -- Basic Information
    title VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    title_fr VARCHAR(255),
    description TEXT,
    description_en TEXT,
    description_fr TEXT,
    short_description VARCHAR(500),

    -- Relationships
    category_id INT NOT NULL REFERENCES event_category(id),
    organizer_id INT NOT NULL REFERENCES event_organizer(id),

    -- Event Details
    event_date TIMESTAMP NOT NULL,
    event_end_date TIMESTAMP,
    doors_open_time TIME,
    duration_minutes INT,

    -- Venue Information
    venue_name VARCHAR(255) NOT NULL,
    venue_address TEXT NOT NULL,
    venue_city VARCHAR(100) NOT NULL,
    venue_country VARCHAR(100) DEFAULT 'Cameroon',
    venue_capacity INT,
    google_maps_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Media
    poster_image VARCHAR(255),
    banner_image VARCHAR(255),
    gallery_images TEXT[],                           -- Array of image paths
    video_url VARCHAR(255),

    -- Ticket Information
    total_tickets INT NOT NULL,
    available_tickets INT NOT NULL,
    sold_tickets INT DEFAULT 0,
    min_price INT NOT NULL,
    max_price INT NOT NULL,
    currency VARCHAR(10) DEFAULT 'FCFA',

    -- Rules & Policies
    max_tickets_per_customer INT DEFAULT 10,
    refund_policy TEXT,
    refund_deadline_hours INT DEFAULT 24,           -- Hours before event for refund
    terms_and_conditions TEXT,

    -- Status & Validation
    status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending_validation', 'published', 'cancelled', 'completed', 'postponed')),
    validation_status VARCHAR(20) DEFAULT 'pending'
        CHECK (validation_status IN ('pending', 'approved', 'rejected')),
    validation_date TIMESTAMP,
    validated_by INT REFERENCES users(id),
    rejection_reason TEXT,

    -- Premium Services
    has_premium_design BOOLEAN DEFAULT FALSE,
    premium_design_paid BOOLEAN DEFAULT FALSE,
    premium_design_amount INT DEFAULT 0,
    boost_visibility BOOLEAN DEFAULT FALSE,
    boost_duration_days INT DEFAULT 0,
    boost_amount INT DEFAULT 0,
    field_service BOOLEAN DEFAULT FALSE,
    field_service_agents INT DEFAULT 0,
    field_service_amount INT DEFAULT 0,

    -- Visibility
    is_featured BOOLEAN DEFAULT FALSE,
    featured_start_date TIMESTAMP,
    featured_end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    views_count INT DEFAULT 0,
    favorites_count INT DEFAULT 0,

    -- Metadata
    tags TEXT[],
    age_restriction INT,                             -- Minimum age (e.g., 18+)
    dress_code VARCHAR(100),
    language VARCHAR(50),
    accessibility_features TEXT[],                   -- ['wheelchair_access', 'sign_language', ...]

    -- Statistics
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,

    -- Timestamps
    published_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by INT REFERENCES users(id),
    created_by INT REFERENCES users(id)
);

-- =====================================================
-- 4. EVENT TICKET TYPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS event_ticket_type (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,

    -- Ticket Type Information
    name VARCHAR(100) NOT NULL,                      -- 'VIP', 'Regular', 'Early Bird', 'Student', etc.
    name_en VARCHAR(100),
    name_fr VARCHAR(100),
    description TEXT,
    description_en TEXT,
    description_fr TEXT,

    -- Pricing
    price INT NOT NULL,
    original_price INT,                              -- For showing discounts
    currency VARCHAR(10) DEFAULT 'FCFA',

    -- Availability
    quantity INT NOT NULL,
    available_quantity INT NOT NULL,
    sold_quantity INT DEFAULT 0,
    min_purchase INT DEFAULT 1,
    max_purchase INT DEFAULT 10,

    -- Sale Period
    sale_start_date TIMESTAMP,
    sale_end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    -- Benefits & Features
    benefits TEXT[],                                 -- ['Front row seating', 'Free drink', 'Meet & greet']
    includes_items TEXT[],                           -- ['T-shirt', 'Poster', 'Goodie bag']
    seating_section VARCHAR(100),

    -- Status
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'sold_out', 'inactive', 'expired')),

    -- Display
    display_order INT DEFAULT 0,
    color VARCHAR(20),                               -- Hex color for UI

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,

    UNIQUE(event_id, name)
);

-- =====================================================
-- 5. EVENT TICKET PURCHASES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS event_ticket_purchase (
    id SERIAL PRIMARY KEY,
    ticket_reference VARCHAR(20) UNIQUE NOT NULL,    -- 'TKT-2025-001234'

    -- Relationships
    event_id INT NOT NULL REFERENCES event(id),
    ticket_type_id INT NOT NULL REFERENCES event_ticket_type(id),
    customer_id INT NOT NULL REFERENCES customer(id),

    -- Pricing
    unit_price INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    subtotal INT NOT NULL,
    discount_amount INT DEFAULT 0,
    total_price INT NOT NULL,
    currency VARCHAR(10) DEFAULT 'FCFA',

    -- Payment Information
    payment_method VARCHAR(20) NOT NULL
        CHECK (payment_method IN ('orangeMoney', 'mtn', 'cash', 'wallet')),
    payment_status VARCHAR(20) DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded', 'failed')),
    payment_reference VARCHAR(100),
    paid_amount INT DEFAULT 0,
    wallet_transaction_id INT REFERENCES wallet_transaction(id),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'used', 'expired', 'refunded')),

    -- QR Code & Validation
    qr_code_data VARCHAR(255) UNIQUE,                -- QR code payload
    qr_code_image VARCHAR(255),                      -- Path to QR code image (optional)
    is_validated BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMP,
    validated_by INT REFERENCES users(id),
    validation_method VARCHAR(50),                   -- 'mobile_app', 'scanner_device', 'manual'

    -- Attendee Information (if different from customer)
    attendee_name VARCHAR(200),
    attendee_email VARCHAR(100),
    attendee_phone VARCHAR(20),
    attendee_id_number VARCHAR(100),

    -- Group Booking
    group_id VARCHAR(50),                            -- Link multiple tickets in one purchase
    is_group_leader BOOLEAN DEFAULT FALSE,

    -- Refund Information
    refund_amount INT DEFAULT 0,
    refund_reason TEXT,
    refund_date TIMESTAMP,
    refund_processed_by INT REFERENCES users(id),

    -- Dates
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmation_date TIMESTAMP,
    cancellation_date TIMESTAMP,
    cancellation_reason TEXT,
    expiry_date TIMESTAMP,

    -- Metadata
    purchase_source VARCHAR(50) DEFAULT 'mobile_app', -- 'mobile_app', 'web', 'pos'
    user_agent TEXT,
    ip_address VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by INT REFERENCES users(id),
    created_by INT REFERENCES customer(id)
);

-- =====================================================
-- 6. EVENT FAVORITES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS event_favorite (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, event_id)
);

-- =====================================================
-- 7. EVENT REVIEWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS event_review (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    customer_id INT NOT NULL REFERENCES customer(id),
    ticket_purchase_id INT REFERENCES event_ticket_purchase(id),

    -- Review Content
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,

    -- Verification
    is_verified_attendee BOOLEAN DEFAULT FALSE,      -- Only if they bought & used ticket

    -- Media
    images TEXT[],                                   -- Photos from event

    -- Status
    is_approved BOOLEAN DEFAULT TRUE,
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,

    UNIQUE(event_id, customer_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Event Category Indexes
CREATE INDEX IF NOT EXISTS idx_event_category_active ON event_category(is_active) WHERE is_deleted = FALSE;

-- Event Organizer Indexes
CREATE INDEX IF NOT EXISTS idx_organizer_customer ON event_organizer(customer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_verification ON event_organizer(verification_status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_organizer_verified ON event_organizer(is_verified) WHERE is_deleted = FALSE;

-- Event Indexes
CREATE INDEX IF NOT EXISTS idx_event_category ON event(category_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_event_organizer ON event(organizer_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_event_date ON event(event_date) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_event_city ON event(venue_city) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_event_status ON event(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_event_featured ON event(is_featured) WHERE is_deleted = FALSE AND is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_event_published ON event(published_at) WHERE status = 'published' AND is_deleted = FALSE;

-- Event Ticket Type Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_type_event ON event_ticket_type(event_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ticket_type_active ON event_ticket_type(is_active) WHERE is_deleted = FALSE;

-- Event Ticket Purchase Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_purchase_event ON event_ticket_purchase(event_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ticket_purchase_customer ON event_ticket_purchase(customer_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ticket_purchase_group ON event_ticket_purchase(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_purchase_status ON event_ticket_purchase(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ticket_purchase_qr ON event_ticket_purchase(qr_code_data);
CREATE INDEX IF NOT EXISTS idx_ticket_purchase_reference ON event_ticket_purchase(ticket_reference);
CREATE INDEX IF NOT EXISTS idx_ticket_purchase_payment_status ON event_ticket_purchase(payment_status) WHERE is_deleted = FALSE;

-- Event Favorite Indexes
CREATE INDEX IF NOT EXISTS idx_favorite_customer ON event_favorite(customer_id);
CREATE INDEX IF NOT EXISTS idx_favorite_event ON event_favorite(event_id);

-- Event Review Indexes
CREATE INDEX IF NOT EXISTS idx_review_event ON event_review(event_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_review_customer ON event_review(customer_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_review_rating ON event_review(rating) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_review_approved ON event_review(is_approved) WHERE is_deleted = FALSE;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_event_category_updated_at BEFORE UPDATE ON event_category
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_organizer_updated_at BEFORE UPDATE ON event_organizer
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_updated_at BEFORE UPDATE ON event
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_ticket_type_updated_at BEFORE UPDATE ON event_ticket_type
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_ticket_purchase_updated_at BEFORE UPDATE ON event_ticket_purchase
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_review_updated_at BEFORE UPDATE ON event_review
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate unique event code
CREATE OR REPLACE FUNCTION generate_event_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'EVT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
                    LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');

        SELECT EXISTS(SELECT 1 FROM event WHERE event_code = new_code) INTO code_exists;

        EXIT WHEN NOT code_exists;
    END LOOP;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Generate unique ticket reference
CREATE OR REPLACE FUNCTION generate_ticket_reference()
RETURNS TEXT AS $$
DECLARE
    new_ref TEXT;
    ref_exists BOOLEAN;
BEGIN
    LOOP
        new_ref := 'TKT-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
                   LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');

        SELECT EXISTS(SELECT 1 FROM event_ticket_purchase WHERE ticket_reference = new_ref) INTO ref_exists;

        EXIT WHEN NOT ref_exists;
    END LOOP;

    RETURN new_ref;
END;
$$ LANGUAGE plpgsql;

-- Update event statistics after ticket purchase
CREATE OR REPLACE FUNCTION update_event_stats_after_purchase()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' AND NEW.payment_status = 'paid' THEN
        -- Update event sold tickets and available tickets
        UPDATE event
        SET sold_tickets = sold_tickets + NEW.quantity,
            available_tickets = available_tickets - NEW.quantity
        WHERE id = NEW.event_id;

        -- Update ticket type sold quantity and available quantity
        UPDATE event_ticket_type
        SET sold_quantity = sold_quantity + NEW.quantity,
            available_quantity = available_quantity - NEW.quantity
        WHERE id = NEW.ticket_type_id;

        -- Update organizer statistics
        UPDATE event_organizer
        SET total_tickets_sold = total_tickets_sold + NEW.quantity,
            total_revenue = total_revenue + NEW.total_price
        WHERE id = (SELECT organizer_id FROM event WHERE id = NEW.event_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_stats
AFTER INSERT OR UPDATE ON event_ticket_purchase
FOR EACH ROW
EXECUTE FUNCTION update_event_stats_after_purchase();

-- Update event rating after review
CREATE OR REPLACE FUNCTION update_event_rating_after_review()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE event
    SET rating = (
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM event_review
            WHERE event_id = NEW.event_id
              AND is_deleted = FALSE
              AND is_approved = TRUE
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM event_review
            WHERE event_id = NEW.event_id
              AND is_deleted = FALSE
              AND is_approved = TRUE
        )
    WHERE id = NEW.event_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_rating
AFTER INSERT OR UPDATE ON event_review
FOR EACH ROW
EXECUTE FUNCTION update_event_rating_after_review();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE event_category IS 'Categories of events (concerts, theater, sports, etc.)';
COMMENT ON TABLE event_organizer IS 'Event organizers with verification and payment info';
COMMENT ON TABLE event IS 'Events with all details, tickets, and validation status';
COMMENT ON TABLE event_ticket_type IS 'Different ticket types for each event (VIP, Regular, etc.)';
COMMENT ON TABLE event_ticket_purchase IS 'Ticket purchases with payment and QR code info';
COMMENT ON TABLE event_favorite IS 'User favorites for events';
COMMENT ON TABLE event_review IS 'User reviews and ratings for events';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- =====================================================
-- ADIGO TICKETING MODULE - DATABASE SCHEMA v2.0
-- =====================================================

-- 1. EVENT CATEGORIES
CREATE TABLE IF NOT EXISTS event_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    name_fr VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. EVENT ORGANIZERS
CREATE TABLE IF NOT EXISTS event_organizer (
    id SERIAL PRIMARY KEY,
    customer_id INT UNIQUE REFERENCES customer(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'individual',
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    logo VARCHAR(255),
    description TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    verified_by INT REFERENCES users(id),
    total_events INT DEFAULT 0,
    total_sales INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- 3. EVENTS
CREATE TABLE IF NOT EXISTS event (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT NOT NULL REFERENCES event_category(id),
    organizer_id INT NOT NULL REFERENCES event_organizer(id),
    cover_image VARCHAR(255),
    event_date TIMESTAMP NOT NULL,
    event_end_date TIMESTAMP,
    venue_name VARCHAR(255) NOT NULL,
    venue_address TEXT,
    city VARCHAR(100) NOT NULL,
    maps_link TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    views_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT event_status_check CHECK (status IN ('draft', 'pending', 'published', 'cancelled', 'completed'))
);

-- 4. EVENT TICKET TYPES
CREATE TABLE IF NOT EXISTS event_ticket_type (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    quantity INT NOT NULL,
    sold INT DEFAULT 0,
    sale_start TIMESTAMP,
    sale_end TIMESTAMP,
    max_per_order INT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, name)
);

-- 5. EVENT TICKETS (purchases)
CREATE TABLE IF NOT EXISTS event_ticket (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(20) UNIQUE,
    event_id INT NOT NULL REFERENCES event(id),
    ticket_type_id INT NOT NULL REFERENCES event_ticket_type(id),
    customer_id INT NOT NULL REFERENCES customer(id),
    quantity INT NOT NULL DEFAULT 1,
    unit_price INT NOT NULL,
    total_price INT NOT NULL,
    payment_method VARCHAR(20),
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_ref VARCHAR(100),
    qr_code VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ticket_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    CONSTRAINT ticket_status_check CHECK (status IN ('pending', 'confirmed', 'used', 'cancelled', 'expired'))
);

-- 6. EVENT FAVORITES
CREATE TABLE IF NOT EXISTS event_favorite (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, event_id)
);

-- 7. EVENT REVIEWS
CREATE TABLE IF NOT EXISTS event_review (
    id SERIAL PRIMARY KEY,
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    customer_id INT NOT NULL REFERENCES customer(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE(event_id, customer_id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_event_category ON event(category_id);
CREATE INDEX IF NOT EXISTS idx_event_organizer ON event(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_status ON event(status);
CREATE INDEX IF NOT EXISTS idx_event_date ON event(event_date);
CREATE INDEX IF NOT EXISTS idx_event_city ON event(city);
CREATE INDEX IF NOT EXISTS idx_event_featured ON event(is_featured) WHERE is_featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_ticket_type_event ON event_ticket_type(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_event ON event_ticket(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_customer ON event_ticket(customer_id);
CREATE INDEX IF NOT EXISTS idx_ticket_status ON event_ticket(status);
CREATE INDEX IF NOT EXISTS idx_ticket_reference ON event_ticket(reference);

CREATE INDEX IF NOT EXISTS idx_favorite_customer ON event_favorite(customer_id);
CREATE INDEX IF NOT EXISTS idx_favorite_event ON event_favorite(event_id);

CREATE INDEX IF NOT EXISTS idx_review_event ON event_review(event_id);

-- =====================================================
-- FUNCTIONS (safe creation)
-- =====================================================

-- Drop old functions if they exist with wrong signature
DROP FUNCTION IF EXISTS generate_event_code() CASCADE;
DROP FUNCTION IF EXISTS generate_ticket_reference() CASCADE;

-- Generate event code
CREATE FUNCTION generate_event_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL THEN
        NEW.code := 'EVT-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(NEW.id::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate ticket reference
CREATE FUNCTION generate_ticket_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference IS NULL THEN
        NEW.reference := 'TKT-' || LPAD(NEW.id::TEXT, 8, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS trg_event_code ON event;
CREATE TRIGGER trg_event_code
    BEFORE INSERT ON event
    FOR EACH ROW EXECUTE FUNCTION generate_event_code();

DROP TRIGGER IF EXISTS trg_ticket_reference ON event_ticket;
CREATE TRIGGER trg_ticket_reference
    BEFORE INSERT ON event_ticket
    FOR EACH ROW EXECUTE FUNCTION generate_ticket_reference();

-- Use existing update_updated_at_column function if available
DROP TRIGGER IF EXISTS trg_event_updated ON event;
CREATE TRIGGER trg_event_updated
    BEFORE UPDATE ON event
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_organizer_updated ON event_organizer;
CREATE TRIGGER trg_organizer_updated
    BEFORE UPDATE ON event_organizer
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_review_updated ON event_review;
CREATE TRIGGER trg_review_updated
    BEFORE UPDATE ON event_review
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END
-- =====================================================

-- =====================================================
-- TICKETING ADMIN MODULE - Missing Tables/Columns
-- =====================================================

-- 1. CREATE WALLET TABLE
CREATE TABLE IF NOT EXISTS wallet (
    id SERIAL PRIMARY KEY,
    customer_id INT UNIQUE NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    balance INT DEFAULT 0 NOT NULL CHECK (balance >= 0),
    transaction_count INT DEFAULT 0,
    total_credits INT DEFAULT 0,
    total_debits INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_customer ON wallet(customer_id);

-- 2. ADD VERIFICATION_STATUS TO EVENT_ORGANIZER
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_organizer' AND column_name = 'verification_status'
    ) THEN
        ALTER TABLE event_organizer
        ADD COLUMN verification_status VARCHAR(20) DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended'));
    END IF;
END $$;

-- 3. ADD ID_CARD COLUMNS TO EVENT_ORGANIZER (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_organizer' AND column_name = 'id_card_front'
    ) THEN
        ALTER TABLE event_organizer
        ADD COLUMN id_card_front VARCHAR(255),
        ADD COLUMN id_card_back VARCHAR(255),
        ADD COLUMN rccm_document VARCHAR(255),
        ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- 4. ADD IS_DELETED COLUMNS (soft delete support)
DO $$
BEGIN
    -- Add is_deleted to event_ticket if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_ticket' AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE event_ticket
        ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
        ADD COLUMN deleted_at TIMESTAMP,
        ADD COLUMN deleted_by INT REFERENCES users(id);
    END IF;

    -- Add is_deleted to event_organizer if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_organizer' AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE event_organizer
        ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
        ADD COLUMN deleted_at TIMESTAMP,
        ADD COLUMN deleted_by INT REFERENCES users(id);
    END IF;
END $$;

-- 5. ADD ROLE AND IS_ACTIVE TO CUSTOMER (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer' AND column_name = 'role'
    ) THEN
        ALTER TABLE customer
        ADD COLUMN role VARCHAR(20) DEFAULT 'customer';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE customer
        ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer' AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE customer
        ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
        ADD COLUMN deleted_at TIMESTAMP,
        ADD COLUMN deleted_by INT REFERENCES users(id);
    END IF;
END $$;

-- 6. CREATE UPDATE TIMESTAMP FUNCTION (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. UPDATE TRIGGERS FOR WALLET
DROP TRIGGER IF EXISTS trg_wallet_updated ON wallet;
CREATE TRIGGER trg_wallet_updated
    BEFORE UPDATE ON wallet
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DEFAULT WALLETS FOR EXISTING CUSTOMERS
-- =====================================================
INSERT INTO wallet (customer_id, balance)
SELECT id, 0
FROM customer
WHERE NOT EXISTS (
    SELECT 1 FROM wallet WHERE wallet.customer_id = customer.id
)
ON CONFLICT (customer_id) DO NOTHING;

-- =====================================================
-- UPDATE VERIFICATION_STATUS FOR EXISTING ORGANIZERS
-- =====================================================
UPDATE event_organizer
SET verification_status = 'pending'
WHERE verification_status IS NULL;

COMMENT ON TABLE wallet IS 'Customer wallet balances for ticketing payments';
COMMENT ON TABLE event_organizer IS 'Event organizer profiles with verification workflow';

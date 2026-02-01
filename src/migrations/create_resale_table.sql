-- =====================================================
-- EVENT TICKET RESALE TABLE (MARKETPLACE)
-- Version: 1.2.0
-- Description: Allows users to resell tickets with 10% commission
-- =====================================================

-- Check if migration already applied
DO $$
BEGIN
    IF NOT migration_exists('create_resale_table_v1.2.0') THEN

        -- Create resale table
        CREATE TABLE IF NOT EXISTS event_ticket_resale (
            id SERIAL PRIMARY KEY,
            resale_code VARCHAR(20) UNIQUE NOT NULL,     -- e.g., 'RSL-2025-001234'

            -- Original Ticket
            ticket_purchase_id INT NOT NULL REFERENCES event_ticket_purchase(id),
            event_id INT NOT NULL REFERENCES event(id),
            ticket_type_id INT NOT NULL REFERENCES event_ticket_type(id),

            -- Seller Information
            seller_id INT NOT NULL REFERENCES customer(id),
            original_price INT NOT NULL,                  -- Original purchase price
            resale_price INT NOT NULL,                    -- Price set by seller

            -- Marketplace Fees (ADIGO Commission: 10%)
            commission_rate DECIMAL(5,2) DEFAULT 10.00,   -- 10%
            commission_amount INT NOT NULL,               -- Calculated: resale_price * 0.10
            seller_receives INT NOT NULL,                 -- Calculated: resale_price - commission_amount

            -- Buyer Information
            buyer_id INT REFERENCES customer(id),

            -- Status
            status VARCHAR(20) DEFAULT 'listed'
                CHECK (status IN ('listed', 'sold', 'cancelled', 'expired', 'removed')),

            -- Payment
            payment_method VARCHAR(20)
                CHECK (payment_method IN ('orangeMoney', 'mtn', 'cash', 'wallet')),
            payment_status VARCHAR(20) DEFAULT 'pending'
                CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
            payment_reference VARCHAR(100),
            wallet_transaction_id INT REFERENCES wallet_transaction(id),

            -- Listing Details
            listing_description TEXT,
            reason_for_sale VARCHAR(255),                 -- 'Cannot attend', 'Change of plans', etc.

            -- Timestamps
            listed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sold_at TIMESTAMP,
            cancelled_at TIMESTAMP,
            cancellation_reason TEXT,
            expires_at TIMESTAMP,                         -- Auto-expire before event

            -- Metadata
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            is_deleted BOOLEAN DEFAULT FALSE,
            deleted_at TIMESTAMP,
            deleted_by INT REFERENCES users(id),
            created_by INT REFERENCES customer(id)
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_resale_seller ON event_ticket_resale(seller_id) WHERE is_deleted = FALSE;
        CREATE INDEX IF NOT EXISTS idx_resale_buyer ON event_ticket_resale(buyer_id) WHERE is_deleted = FALSE;
        CREATE INDEX IF NOT EXISTS idx_resale_event ON event_ticket_resale(event_id) WHERE is_deleted = FALSE;
        CREATE INDEX IF NOT EXISTS idx_resale_status ON event_ticket_resale(status) WHERE is_deleted = FALSE;
        CREATE INDEX IF NOT EXISTS idx_resale_ticket_purchase ON event_ticket_resale(ticket_purchase_id);
        CREATE INDEX IF NOT EXISTS idx_resale_listed_active ON event_ticket_resale(status, listed_at)
            WHERE status = 'listed' AND is_deleted = FALSE;

        -- Trigger for auto-update updated_at
        CREATE TRIGGER update_event_ticket_resale_updated_at
        BEFORE UPDATE ON event_ticket_resale
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        -- Function to generate unique resale code
        CREATE OR REPLACE FUNCTION generate_resale_code()
        RETURNS TEXT AS $func$
        DECLARE
            new_code TEXT;
            code_exists BOOLEAN;
        BEGIN
            LOOP
                new_code := 'RSL-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
                            LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');

                SELECT EXISTS(SELECT 1 FROM event_ticket_resale WHERE resale_code = new_code) INTO code_exists;

                EXIT WHEN NOT code_exists;
            END LOOP;

            RETURN new_code;
        END;
        $func$ LANGUAGE plpgsql;

        -- Trigger to auto-calculate commission and seller receives
        CREATE OR REPLACE FUNCTION calculate_resale_commission()
        RETURNS TRIGGER AS $func$
        BEGIN
            -- Calculate commission (10%)
            NEW.commission_amount := ROUND(NEW.resale_price * (NEW.commission_rate / 100));

            -- Calculate what seller receives (90%)
            NEW.seller_receives := NEW.resale_price - NEW.commission_amount;

            -- Auto-generate resale code if not provided
            IF NEW.resale_code IS NULL OR NEW.resale_code = '' THEN
                NEW.resale_code := generate_resale_code();
            END IF;

            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;

        CREATE TRIGGER trigger_calculate_resale_commission
        BEFORE INSERT OR UPDATE ON event_ticket_resale
        FOR EACH ROW
        EXECUTE FUNCTION calculate_resale_commission();

        -- Note: Ticket resellability will be validated in application logic
        -- PostgreSQL does not support subqueries in CHECK constraints

        -- Comment
        COMMENT ON TABLE event_ticket_resale IS 'Marketplace for reselling event tickets with 10% ADIGO commission';

        -- Record migration
        PERFORM record_migration(
            'create_resale_table_v1.2.0',
            '1.2.0',
            'Created event_ticket_resale table for marketplace functionality',
            0
        );

        RAISE NOTICE '✅ Resale table created successfully';
    ELSE
        RAISE NOTICE '⏭️  Migration create_resale_table_v1.2.0 already applied, skipping...';
    END IF;
END $$;

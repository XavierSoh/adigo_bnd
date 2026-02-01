-- Migration: Add profile_picture and wallet_balance columns to customer table
-- Date: 2025-01-17

-- Add profile_picture column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer' AND column_name = 'profile_picture'
    ) THEN
        ALTER TABLE customer ADD COLUMN profile_picture TEXT;
        RAISE NOTICE 'Added profile_picture column to customer table';
    ELSE
        RAISE NOTICE 'profile_picture column already exists';
    END IF;
END $$;

-- Add wallet_balance column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customer' AND column_name = 'wallet_balance'
    ) THEN
        ALTER TABLE customer ADD COLUMN wallet_balance INT DEFAULT 0;
        RAISE NOTICE 'Added wallet_balance column to customer table';
    ELSE
        RAISE NOTICE 'wallet_balance column already exists';
    END IF;
END $$;

-- Create wallet_transaction table if it doesn't exist
CREATE TABLE IF NOT EXISTS wallet_transaction (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customer(id),
    amount INT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    payment_method VARCHAR(20),
    payment_reference VARCHAR(100),
    description TEXT,
    balance_before INT NOT NULL,
    balance_after INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_transaction_type CHECK (transaction_type IN ('top_up', 'payment', 'refund'))
);

-- Create index on customer_id for faster queries
CREATE INDEX IF NOT EXISTS idx_wallet_transaction_customer_id ON wallet_transaction(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transaction_created_at ON wallet_transaction(created_at);

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
END $$;

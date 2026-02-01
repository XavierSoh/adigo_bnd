-- Migration: Add default payment method numbers to customers table
-- Date: 2025-11-18
-- Description: Allows customers to save default Orange Money and MTN Mobile Money numbers

-- Add columns for default payment methods
ALTER TABLE customer
ADD COLUMN IF NOT EXISTS default_orange_money_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS default_mtn_mobile_money_number VARCHAR(20);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_orange_money ON customer(default_orange_money_number) WHERE default_orange_money_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_mtn_money ON customer(default_mtn_mobile_money_number) WHERE default_mtn_mobile_money_number IS NOT NULL;

-- Add comments to document the purpose
COMMENT ON COLUMN customer.default_orange_money_number IS 'Default Orange Money phone number for payments';
COMMENT ON COLUMN customer.default_mtn_mobile_money_number IS 'Default MTN Mobile Money phone number for payments';

-- Rollback script (commented out - use if needed):
-- ALTER TABLE customer DROP COLUMN IF EXISTS default_orange_money_number;
-- ALTER TABLE customer DROP COLUMN IF EXISTS default_mtn_mobile_money_number;
-- DROP INDEX IF EXISTS idx_customer_orange_money;
-- DROP INDEX IF EXISTS idx_customer_mtn_money;

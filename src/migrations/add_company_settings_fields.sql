-- Migration: Add new fields to company_settings table
-- Date: 2025-11-20
-- Description: Add tax_id, registration_number, business_license, city, country, postal_code, fax, support_hours, slogan

ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS business_license VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS fax VARCHAR(50),
ADD COLUMN IF NOT EXISTS support_hours TEXT,
ADD COLUMN IF NOT EXISTS slogan TEXT;

-- Update the existing row with default values (will be updated by desktop version)
UPDATE company_settings
SET
    tax_id = COALESCE(tax_id, 'M XXXXXXXXXX'),
    registration_number = COALESCE(registration_number, 'RC/XXX/XXX'),
    city = COALESCE(city, 'Douala'),
    country = COALESCE(country, 'Cameroun'),
    slogan = COALESCE(slogan, 'Travel Smart, Travel Safe'),
    updated_at = NOW()
WHERE id = 1;

-- Display the updated table structure and data
SELECT * FROM company_settings;

-- Migration: Create company_settings table for Adigo company information
-- Date: 2025-01-19
-- Description: Stores company contact information, branding, and social media for tickets and app

-- Create company_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS company_settings (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL DEFAULT 'ADIGO',
    address TEXT,
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(255),
    facebook VARCHAR(255),
    twitter VARCHAR(255),
    instagram VARCHAR(255),
    logo_path VARCHAR(255),
    primary_color VARCHAR(7) DEFAULT '#D32F2F',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_settings CHECK (id = 1)
);

-- Create index on id for faster queries
CREATE INDEX IF NOT EXISTS idx_company_settings_id ON company_settings(id);

-- Insert default placeholder data if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM company_settings WHERE id = 1) THEN
        INSERT INTO company_settings (
            id,
            company_name,
            address,
            phone,
            whatsapp,
            email,
            website,
            facebook,
            twitter,
            instagram,
            logo_path,
            primary_color
        ) VALUES (
            1,
            'ADIGO',
            'Douala, Cameroun',
            '+237 XXX XXX XXX',
            '+237 XXX XXX XXX',
            'support@adigo.com',
            'https://www.adigo.com',
            'https://www.facebook.com/adigo',
            'https://twitter.com/adigo',
            'https://instagram.com/adigo',
            'adigo_logo.png',
            '#D32F2F'
        );
        RAISE NOTICE 'Inserted default company settings';
    ELSE
        RAISE NOTICE 'Company settings already exist';
    END IF;
END $$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_company_settings_updated_at ON company_settings;
CREATE TRIGGER trigger_update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_company_settings_updated_at();

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Company settings table migration completed successfully!';
END $$;

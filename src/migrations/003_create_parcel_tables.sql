-- Migration: Parcel Delivery Module Tables
-- Description: Create tables for parcel delivery service
-- Author: Claude
-- Date: 2025-01-19

-- ============================================
-- Table: parcel_shipments
-- Purpose: Store parcel shipment information
-- ============================================
CREATE TABLE IF NOT EXISTS parcel_shipments (
  id SERIAL PRIMARY KEY,
  tracking_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customer(id) NOT NULL,

  -- Sender information
  sender_name VARCHAR(255) NOT NULL,
  sender_phone VARCHAR(20) NOT NULL,
  sender_address TEXT NOT NULL,
  sender_latitude DECIMAL(10,8),
  sender_longitude DECIMAL(11,8),

  -- Receiver information
  receiver_name VARCHAR(255) NOT NULL,
  receiver_phone VARCHAR(20) NOT NULL,
  receiver_address TEXT NOT NULL,
  receiver_latitude DECIMAL(10,8),
  receiver_longitude DECIMAL(11,8),

  -- Parcel details
  parcel_type VARCHAR(50) CHECK (parcel_type IN ('document', 'package', 'fragile')),
  weight DECIMAL(10,2),
  dimensions VARCHAR(50),
  description TEXT,
  declared_value DECIMAL(10,2),

  -- Pricing
  shipping_rate DECIMAL(10,2) NOT NULL,
  insurance_fee DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) NOT NULL,

  -- Delivery
  delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('standard', 'express', 'same_day')),
  estimated_delivery_date DATE,
  actual_delivery_date DATE,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled')
  ),

  -- Payment
  payment_method VARCHAR(50) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')
  ),

  -- Current location
  current_location TEXT,
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),

  -- Proof of delivery
  delivery_signature TEXT,
  delivery_photo TEXT,
  delivered_to VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parcel_tracking_number ON parcel_shipments(tracking_number);
CREATE INDEX idx_parcel_customer ON parcel_shipments(customer_id);
CREATE INDEX idx_parcel_status ON parcel_shipments(status);
CREATE INDEX idx_parcel_created ON parcel_shipments(created_at DESC);

-- ============================================
-- Table: parcel_tracking_events
-- Purpose: Store tracking events for parcels
-- ============================================
CREATE TABLE IF NOT EXISTS parcel_tracking_events (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER REFERENCES parcel_shipments(id) NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (
    event_type IN ('created', 'picked_up', 'at_facility', 'in_transit', 'out_for_delivery', 'delivered', 'failed')
  ),
  description TEXT NOT NULL,
  location TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parcel_events_shipment ON parcel_tracking_events(shipment_id);
CREATE INDEX idx_parcel_events_time ON parcel_tracking_events(created_at DESC);

-- ============================================
-- Table: saved_addresses
-- Purpose: Store customer saved addresses
-- ============================================
CREATE TABLE IF NOT EXISTS saved_addresses (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customer(id) NOT NULL,
  label VARCHAR(50) CHECK (label IN ('home', 'work', 'other')),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  street VARCHAR(255),
  city VARCHAR(100),
  building VARCHAR(100),
  landmark TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_default BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saved_addresses_customer ON saved_addresses(customer_id);
CREATE INDEX idx_saved_addresses_default ON saved_addresses(customer_id, is_default);

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_parcel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parcel_shipments_updated_at
  BEFORE UPDATE ON parcel_shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_parcel_updated_at();

CREATE TRIGGER saved_addresses_updated_at
  BEFORE UPDATE ON saved_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_parcel_updated_at();

-- ============================================
-- Function: Generate tracking number
-- ============================================
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  prefix VARCHAR(3) := 'ADG';
  random_part VARCHAR(47);
BEGIN
  random_part := UPPER(substring(MD5(random()::text || clock_timestamp()::text) from 1 for 12));
  RETURN prefix || random_part;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE parcel_shipments IS 'Parcel shipments and tracking';
COMMENT ON TABLE parcel_tracking_events IS 'Tracking events for parcel shipments';
COMMENT ON TABLE saved_addresses IS 'Customer saved addresses for quick selection';

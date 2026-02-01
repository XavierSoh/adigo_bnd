-- Migration: VTC Module Tables
-- Description: Create tables for VTC/Taxi ride-hailing service
-- Author: Claude
-- Date: 2025-01-19

-- ============================================
-- Table: vtc_drivers
-- Purpose: Store VTC driver information
-- ============================================
CREATE TABLE IF NOT EXISTS vtc_drivers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  photo TEXT,

  -- License information
  license_number VARCHAR(50) NOT NULL UNIQUE,
  license_expiry DATE NOT NULL,

  -- Vehicle information
  vehicle_type VARCHAR(50) NOT NULL CHECK (vehicle_type IN ('economy', 'comfort', 'premium')),
  vehicle_brand VARCHAR(50),
  vehicle_model VARCHAR(50),
  vehicle_year INTEGER,
  vehicle_color VARCHAR(30),
  license_plate VARCHAR(20) NOT NULL UNIQUE,

  -- Ratings and stats
  rating DECIMAL(3,2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  total_rides INTEGER DEFAULT 0,

  -- Status and location
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'suspended')),
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  last_location_update TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vtc_drivers_status ON vtc_drivers(status);
CREATE INDEX idx_vtc_drivers_location ON vtc_drivers(current_latitude, current_longitude);
CREATE INDEX idx_vtc_drivers_user_id ON vtc_drivers(user_id);

-- ============================================
-- Table: vtc_rides
-- Purpose: Store ride requests and history
-- ============================================
CREATE TABLE IF NOT EXISTS vtc_rides (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customer(id) NOT NULL,
  driver_id INTEGER REFERENCES vtc_drivers(id),
  vehicle_type VARCHAR(50) NOT NULL,

  -- Pickup information
  pickup_address TEXT NOT NULL,
  pickup_latitude DECIMAL(10,8) NOT NULL,
  pickup_longitude DECIMAL(11,8) NOT NULL,
  pickup_time TIMESTAMP,

  -- Dropoff information
  dropoff_address TEXT NOT NULL,
  dropoff_latitude DECIMAL(10,8) NOT NULL,
  dropoff_longitude DECIMAL(11,8) NOT NULL,
  dropoff_time TIMESTAMP,

  -- Pricing
  base_fare DECIMAL(10,2) NOT NULL,
  distance_fare DECIMAL(10,2) DEFAULT 0,
  time_fare DECIMAL(10,2) DEFAULT 0,
  surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
  total_fare DECIMAL(10,2) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'requested' CHECK (
    status IN ('requested', 'accepted', 'arrived', 'started', 'completed', 'cancelled')
  ),
  cancellation_reason TEXT,
  cancelled_by VARCHAR(20) CHECK (cancelled_by IN ('customer', 'driver', 'system')),

  -- Ratings
  customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
  driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5),
  customer_feedback TEXT,
  driver_feedback TEXT,

  -- Payment
  payment_method VARCHAR(50) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')
  ),

  -- Tracking
  estimated_distance DECIMAL(10,2),
  actual_distance DECIMAL(10,2),
  estimated_duration INTEGER,
  actual_duration INTEGER,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vtc_rides_customer ON vtc_rides(customer_id);
CREATE INDEX idx_vtc_rides_driver ON vtc_rides(driver_id);
CREATE INDEX idx_vtc_rides_status ON vtc_rides(status);
CREATE INDEX idx_vtc_rides_created ON vtc_rides(created_at DESC);

-- ============================================
-- Table: vtc_ride_tracking
-- Purpose: Store real-time tracking data
-- ============================================
CREATE TABLE IF NOT EXISTS vtc_ride_tracking (
  id SERIAL PRIMARY KEY,
  ride_id INTEGER REFERENCES vtc_rides(id) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  heading DECIMAL(5,2),
  speed DECIMAL(5,2),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vtc_tracking_ride ON vtc_ride_tracking(ride_id);
CREATE INDEX idx_vtc_tracking_time ON vtc_ride_tracking(recorded_at DESC);

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_vtc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vtc_drivers_updated_at
  BEFORE UPDATE ON vtc_drivers
  FOR EACH ROW
  EXECUTE FUNCTION update_vtc_updated_at();

CREATE TRIGGER vtc_rides_updated_at
  BEFORE UPDATE ON vtc_rides
  FOR EACH ROW
  EXECUTE FUNCTION update_vtc_updated_at();

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE vtc_drivers IS 'VTC/Taxi drivers information and status';
COMMENT ON TABLE vtc_rides IS 'VTC ride requests and history';
COMMENT ON TABLE vtc_ride_tracking IS 'Real-time GPS tracking for active rides';

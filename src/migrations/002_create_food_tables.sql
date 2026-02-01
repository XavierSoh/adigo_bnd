-- Migration: Food Delivery Module Tables
-- Description: Create tables for food delivery service
-- Author: Claude
-- Date: 2025-01-19

-- ============================================
-- Table: restaurants
-- Purpose: Store restaurant information
-- ============================================
CREATE TABLE IF NOT EXISTS restaurants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('fast_food', 'restaurant', 'cafe', 'bakery')),
  logo TEXT,
  cover_image TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),

  -- Address
  address TEXT NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,

  -- Business hours (JSON format)
  opening_hours JSONB,

  -- Ratings
  rating DECIMAL(3,2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  total_reviews INTEGER DEFAULT 0,

  -- Delivery
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  delivery_time INTEGER DEFAULT 30,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_accepting_orders BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_restaurants_active ON restaurants(is_active, is_accepting_orders);
CREATE INDEX idx_restaurants_location ON restaurants(latitude, longitude);
CREATE INDEX idx_restaurants_category ON restaurants(category);

-- ============================================
-- Table: menu_items
-- Purpose: Store menu items for each restaurant
-- ============================================
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('appetizer', 'main', 'dessert', 'drink')),
  price DECIMAL(10,2) NOT NULL,
  image TEXT,
  is_available BOOLEAN DEFAULT true,
  is_vegetarian BOOLEAN DEFAULT false,
  is_spicy BOOLEAN DEFAULT false,
  preparation_time INTEGER DEFAULT 15,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_available ON menu_items(is_available);
CREATE INDEX idx_menu_items_category ON menu_items(category);

-- ============================================
-- Table: food_orders
-- Purpose: Store food orders
-- ============================================
CREATE TABLE IF NOT EXISTS food_orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customer(id) NOT NULL,
  restaurant_id INTEGER REFERENCES restaurants(id) NOT NULL,

  -- Delivery
  delivery_address TEXT NOT NULL,
  delivery_latitude DECIMAL(10,8) NOT NULL,
  delivery_longitude DECIMAL(11,8) NOT NULL,
  delivery_instructions TEXT,

  -- Pricing
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled')
  ),

  -- Payment
  payment_method VARCHAR(50) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')
  ),

  -- Tracking
  estimated_delivery_time TIMESTAMP,
  actual_delivery_time TIMESTAMP,

  -- Ratings
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_food_orders_customer ON food_orders(customer_id);
CREATE INDEX idx_food_orders_restaurant ON food_orders(restaurant_id);
CREATE INDEX idx_food_orders_status ON food_orders(status);
CREATE INDEX idx_food_orders_created ON food_orders(created_at DESC);

-- ============================================
-- Table: food_order_items
-- Purpose: Store items in each food order
-- ============================================
CREATE TABLE IF NOT EXISTS food_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES food_orders(id) NOT NULL,
  menu_item_id INTEGER REFERENCES menu_items(id) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,

  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_food_order_items_order ON food_order_items(order_id);

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_food_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_food_updated_at();

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_food_updated_at();

CREATE TRIGGER food_orders_updated_at
  BEFORE UPDATE ON food_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_food_updated_at();

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE restaurants IS 'Restaurants available on the platform';
COMMENT ON TABLE menu_items IS 'Menu items for each restaurant';
COMMENT ON TABLE food_orders IS 'Food delivery orders';
COMMENT ON TABLE food_order_items IS 'Items in each food order';

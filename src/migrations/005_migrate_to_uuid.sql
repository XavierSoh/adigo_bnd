-- Migration: Convert all IDs to UUID for Frontend Compatibility
-- Description: Change INTEGER IDs to UUID for Flutter String compatibility
-- Author: Claude
-- Date: 2025-01-19
-- Priority: CRITICAL
-- WARNING: This migration modifies primary keys - backup database first!

-- ============================================
-- ENABLE UUID EXTENSION
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- STRATEGY: Add new UUID columns, migrate data, swap columns
-- This allows rollback if needed
-- ============================================

-- ============================================
-- 1. VTC MODULE
-- ============================================

-- VTC Drivers
ALTER TABLE vtc_drivers ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
UPDATE vtc_drivers SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;

-- VTC Rides (add temp columns for FKs)
ALTER TABLE vtc_rides ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE vtc_rides ADD COLUMN driver_id_uuid UUID;
UPDATE vtc_rides SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;
UPDATE vtc_rides r SET driver_id_uuid = d.id_uuid
FROM vtc_drivers d WHERE r.driver_id = d.id;

-- VTC Ride Tracking
ALTER TABLE vtc_ride_tracking ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE vtc_ride_tracking ADD COLUMN ride_id_uuid UUID;
UPDATE vtc_ride_tracking SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;
UPDATE vtc_ride_tracking t SET ride_id_uuid = r.id_uuid
FROM vtc_rides r WHERE t.ride_id = r.id;

-- ============================================
-- 2. FOOD MODULE
-- ============================================

-- Restaurants
ALTER TABLE restaurants ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
UPDATE restaurants SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;

-- Menu Items
ALTER TABLE menu_items ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE menu_items ADD COLUMN restaurant_id_uuid UUID;
UPDATE menu_items SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;
UPDATE menu_items m SET restaurant_id_uuid = r.id_uuid
FROM restaurants r WHERE m.restaurant_id = r.id;

-- Menu Item Options
ALTER TABLE menu_item_options ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE menu_item_options ADD COLUMN menu_item_id_uuid UUID;
UPDATE menu_item_options SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;
UPDATE menu_item_options o SET menu_item_id_uuid = m.id_uuid
FROM menu_items m WHERE o.menu_item_id = m.id;

-- Menu Item Addons
ALTER TABLE menu_item_addons ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE menu_item_addons ADD COLUMN menu_item_id_uuid UUID;
UPDATE menu_item_addons SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;
UPDATE menu_item_addons a SET menu_item_id_uuid = m.id_uuid
FROM menu_items m WHERE a.menu_item_id = m.id;

-- Food Orders
ALTER TABLE food_orders ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE food_orders ADD COLUMN restaurant_id_uuid UUID;
UPDATE food_orders SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;
UPDATE food_orders o SET restaurant_id_uuid = r.id_uuid
FROM restaurants r WHERE o.restaurant_id = r.id;

-- Food Order Items
ALTER TABLE food_order_items ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE food_order_items ADD COLUMN order_id_uuid UUID;
ALTER TABLE food_order_items ADD COLUMN menu_item_id_uuid UUID;
UPDATE food_order_items SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;
UPDATE food_order_items oi SET order_id_uuid = o.id_uuid
FROM food_orders o WHERE oi.order_id = o.id;
UPDATE food_order_items oi SET menu_item_id_uuid = m.id_uuid
FROM menu_items m WHERE oi.menu_item_id = m.id;

-- Food Order Item Selections
ALTER TABLE food_order_item_selections ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE food_order_item_selections ADD COLUMN order_item_id_uuid UUID;
ALTER TABLE food_order_item_selections ADD COLUMN option_id_uuid UUID;
ALTER TABLE food_order_item_selections ADD COLUMN addon_id_uuid UUID;
UPDATE food_order_item_selections SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;
UPDATE food_order_item_selections s SET order_item_id_uuid = oi.id_uuid
FROM food_order_items oi WHERE s.order_item_id = oi.id;
UPDATE food_order_item_selections s SET option_id_uuid = o.id_uuid
FROM menu_item_options o WHERE s.option_id = o.id;
UPDATE food_order_item_selections s SET addon_id_uuid = a.id_uuid
FROM menu_item_addons a WHERE s.addon_id = a.id;

-- ============================================
-- 3. PARCEL MODULE
-- ============================================

-- Parcel Shipments
ALTER TABLE parcel_shipments ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
UPDATE parcel_shipments SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;

-- Parcel Tracking Events
ALTER TABLE parcel_tracking_events ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE parcel_tracking_events ADD COLUMN shipment_id_uuid UUID;
UPDATE parcel_tracking_events SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;
UPDATE parcel_tracking_events e SET shipment_id_uuid = s.id_uuid
FROM parcel_shipments s WHERE e.shipment_id = s.id;

-- Saved Addresses
ALTER TABLE saved_addresses ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();
UPDATE saved_addresses SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;

-- ============================================
-- 4. DROP OLD CONSTRAINTS AND INDEXES
-- ============================================

-- VTC
ALTER TABLE vtc_rides DROP CONSTRAINT IF EXISTS vtc_rides_driver_id_fkey;
ALTER TABLE vtc_ride_tracking DROP CONSTRAINT IF EXISTS vtc_ride_tracking_ride_id_fkey;
DROP INDEX IF EXISTS idx_vtc_rides_driver;
DROP INDEX IF EXISTS idx_vtc_tracking_ride;

-- Food
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS menu_items_restaurant_id_fkey;
ALTER TABLE menu_item_options DROP CONSTRAINT IF EXISTS menu_item_options_menu_item_id_fkey;
ALTER TABLE menu_item_addons DROP CONSTRAINT IF EXISTS menu_item_addons_menu_item_id_fkey;
ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_restaurant_id_fkey;
ALTER TABLE food_order_items DROP CONSTRAINT IF EXISTS food_order_items_order_id_fkey;
ALTER TABLE food_order_items DROP CONSTRAINT IF EXISTS food_order_items_menu_item_id_fkey;
ALTER TABLE food_order_item_selections DROP CONSTRAINT IF EXISTS food_order_item_selections_order_item_id_fkey;
ALTER TABLE food_order_item_selections DROP CONSTRAINT IF EXISTS food_order_item_selections_option_id_fkey;
ALTER TABLE food_order_item_selections DROP CONSTRAINT IF EXISTS food_order_item_selections_addon_id_fkey;

-- Parcel
ALTER TABLE parcel_tracking_events DROP CONSTRAINT IF EXISTS parcel_tracking_events_shipment_id_fkey;

-- ============================================
-- 5. SWAP COLUMNS (id → id_old, id_uuid → id)
-- ============================================

-- VTC Drivers
ALTER TABLE vtc_drivers RENAME COLUMN id TO id_old;
ALTER TABLE vtc_drivers RENAME COLUMN id_uuid TO id;
ALTER TABLE vtc_drivers DROP COLUMN id_old CASCADE;

-- VTC Rides
ALTER TABLE vtc_rides RENAME COLUMN id TO id_old;
ALTER TABLE vtc_rides RENAME COLUMN driver_id TO driver_id_old;
ALTER TABLE vtc_rides RENAME COLUMN id_uuid TO id;
ALTER TABLE vtc_rides RENAME COLUMN driver_id_uuid TO driver_id;
ALTER TABLE vtc_rides DROP COLUMN id_old;
ALTER TABLE vtc_rides DROP COLUMN driver_id_old;

-- VTC Ride Tracking
ALTER TABLE vtc_ride_tracking RENAME COLUMN id TO id_old;
ALTER TABLE vtc_ride_tracking RENAME COLUMN ride_id TO ride_id_old;
ALTER TABLE vtc_ride_tracking RENAME COLUMN id_uuid TO id;
ALTER TABLE vtc_ride_tracking RENAME COLUMN ride_id_uuid TO ride_id;
ALTER TABLE vtc_ride_tracking DROP COLUMN id_old;
ALTER TABLE vtc_ride_tracking DROP COLUMN ride_id_old;

-- Restaurants
ALTER TABLE restaurants RENAME COLUMN id TO id_old;
ALTER TABLE restaurants RENAME COLUMN id_uuid TO id;
ALTER TABLE restaurants DROP COLUMN id_old CASCADE;

-- Menu Items
ALTER TABLE menu_items RENAME COLUMN id TO id_old;
ALTER TABLE menu_items RENAME COLUMN restaurant_id TO restaurant_id_old;
ALTER TABLE menu_items RENAME COLUMN id_uuid TO id;
ALTER TABLE menu_items RENAME COLUMN restaurant_id_uuid TO restaurant_id;
ALTER TABLE menu_items DROP COLUMN id_old;
ALTER TABLE menu_items DROP COLUMN restaurant_id_old;

-- Menu Item Options
ALTER TABLE menu_item_options RENAME COLUMN id TO id_old;
ALTER TABLE menu_item_options RENAME COLUMN menu_item_id TO menu_item_id_old;
ALTER TABLE menu_item_options RENAME COLUMN id_uuid TO id;
ALTER TABLE menu_item_options RENAME COLUMN menu_item_id_uuid TO menu_item_id;
ALTER TABLE menu_item_options DROP COLUMN id_old;
ALTER TABLE menu_item_options DROP COLUMN menu_item_id_old;

-- Menu Item Addons
ALTER TABLE menu_item_addons RENAME COLUMN id TO id_old;
ALTER TABLE menu_item_addons RENAME COLUMN menu_item_id TO menu_item_id_old;
ALTER TABLE menu_item_addons RENAME COLUMN id_uuid TO id;
ALTER TABLE menu_item_addons RENAME COLUMN menu_item_id_uuid TO menu_item_id;
ALTER TABLE menu_item_addons DROP COLUMN id_old;
ALTER TABLE menu_item_addons DROP COLUMN menu_item_id_old;

-- Food Orders
ALTER TABLE food_orders RENAME COLUMN id TO id_old;
ALTER TABLE food_orders RENAME COLUMN restaurant_id TO restaurant_id_old;
ALTER TABLE food_orders RENAME COLUMN id_uuid TO id;
ALTER TABLE food_orders RENAME COLUMN restaurant_id_uuid TO restaurant_id;
ALTER TABLE food_orders DROP COLUMN id_old;
ALTER TABLE food_orders DROP COLUMN restaurant_id_old;

-- Food Order Items
ALTER TABLE food_order_items RENAME COLUMN id TO id_old;
ALTER TABLE food_order_items RENAME COLUMN order_id TO order_id_old;
ALTER TABLE food_order_items RENAME COLUMN menu_item_id TO menu_item_id_old;
ALTER TABLE food_order_items RENAME COLUMN id_uuid TO id;
ALTER TABLE food_order_items RENAME COLUMN order_id_uuid TO order_id;
ALTER TABLE food_order_items RENAME COLUMN menu_item_id_uuid TO menu_item_id;
ALTER TABLE food_order_items DROP COLUMN id_old;
ALTER TABLE food_order_items DROP COLUMN order_id_old;
ALTER TABLE food_order_items DROP COLUMN menu_item_id_old;

-- Food Order Item Selections
ALTER TABLE food_order_item_selections RENAME COLUMN id TO id_old;
ALTER TABLE food_order_item_selections RENAME COLUMN order_item_id TO order_item_id_old;
ALTER TABLE food_order_item_selections RENAME COLUMN option_id TO option_id_old;
ALTER TABLE food_order_item_selections RENAME COLUMN addon_id TO addon_id_old;
ALTER TABLE food_order_item_selections RENAME COLUMN id_uuid TO id;
ALTER TABLE food_order_item_selections RENAME COLUMN order_item_id_uuid TO order_item_id;
ALTER TABLE food_order_item_selections RENAME COLUMN option_id_uuid TO option_id;
ALTER TABLE food_order_item_selections RENAME COLUMN addon_id_uuid TO addon_id;
ALTER TABLE food_order_item_selections DROP COLUMN id_old;
ALTER TABLE food_order_item_selections DROP COLUMN order_item_id_old;
ALTER TABLE food_order_item_selections DROP COLUMN option_id_old;
ALTER TABLE food_order_item_selections DROP COLUMN addon_id_old;

-- Parcel Shipments
ALTER TABLE parcel_shipments RENAME COLUMN id TO id_old;
ALTER TABLE parcel_shipments RENAME COLUMN id_uuid TO id;
ALTER TABLE parcel_shipments DROP COLUMN id_old CASCADE;

-- Parcel Tracking Events
ALTER TABLE parcel_tracking_events RENAME COLUMN id TO id_old;
ALTER TABLE parcel_tracking_events RENAME COLUMN shipment_id TO shipment_id_old;
ALTER TABLE parcel_tracking_events RENAME COLUMN id_uuid TO id;
ALTER TABLE parcel_tracking_events RENAME COLUMN shipment_id_uuid TO shipment_id;
ALTER TABLE parcel_tracking_events DROP COLUMN id_old;
ALTER TABLE parcel_tracking_events DROP COLUMN shipment_id_old;

-- Saved Addresses
ALTER TABLE saved_addresses RENAME COLUMN id TO id_old;
ALTER TABLE saved_addresses RENAME COLUMN id_uuid TO id;
ALTER TABLE saved_addresses DROP COLUMN id_old CASCADE;

-- ============================================
-- 6. ADD NEW PRIMARY KEYS AND CONSTRAINTS
-- ============================================

-- VTC
ALTER TABLE vtc_drivers ADD PRIMARY KEY (id);
ALTER TABLE vtc_rides ADD PRIMARY KEY (id);
ALTER TABLE vtc_rides ADD CONSTRAINT vtc_rides_driver_id_fkey
  FOREIGN KEY (driver_id) REFERENCES vtc_drivers(id) ON DELETE SET NULL;
ALTER TABLE vtc_ride_tracking ADD PRIMARY KEY (id);
ALTER TABLE vtc_ride_tracking ADD CONSTRAINT vtc_ride_tracking_ride_id_fkey
  FOREIGN KEY (ride_id) REFERENCES vtc_rides(id) ON DELETE CASCADE;

-- Food
ALTER TABLE restaurants ADD PRIMARY KEY (id);
ALTER TABLE menu_items ADD PRIMARY KEY (id);
ALTER TABLE menu_items ADD CONSTRAINT menu_items_restaurant_id_fkey
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE menu_item_options ADD PRIMARY KEY (id);
ALTER TABLE menu_item_options ADD CONSTRAINT menu_item_options_menu_item_id_fkey
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE;
ALTER TABLE menu_item_addons ADD PRIMARY KEY (id);
ALTER TABLE menu_item_addons ADD CONSTRAINT menu_item_addons_menu_item_id_fkey
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE;
ALTER TABLE food_orders ADD PRIMARY KEY (id);
ALTER TABLE food_orders ADD CONSTRAINT food_orders_restaurant_id_fkey
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE RESTRICT;
ALTER TABLE food_order_items ADD PRIMARY KEY (id);
ALTER TABLE food_order_items ADD CONSTRAINT food_order_items_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES food_orders(id) ON DELETE CASCADE;
ALTER TABLE food_order_items ADD CONSTRAINT food_order_items_menu_item_id_fkey
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT;
ALTER TABLE food_order_item_selections ADD PRIMARY KEY (id);
ALTER TABLE food_order_item_selections ADD CONSTRAINT food_order_item_selections_order_item_id_fkey
  FOREIGN KEY (order_item_id) REFERENCES food_order_items(id) ON DELETE CASCADE;
ALTER TABLE food_order_item_selections ADD CONSTRAINT food_order_item_selections_option_id_fkey
  FOREIGN KEY (option_id) REFERENCES menu_item_options(id) ON DELETE RESTRICT;
ALTER TABLE food_order_item_selections ADD CONSTRAINT food_order_item_selections_addon_id_fkey
  FOREIGN KEY (addon_id) REFERENCES menu_item_addons(id) ON DELETE RESTRICT;

-- Parcel
ALTER TABLE parcel_shipments ADD PRIMARY KEY (id);
ALTER TABLE parcel_tracking_events ADD PRIMARY KEY (id);
ALTER TABLE parcel_tracking_events ADD CONSTRAINT parcel_tracking_events_shipment_id_fkey
  FOREIGN KEY (shipment_id) REFERENCES parcel_shipments(id) ON DELETE CASCADE;
ALTER TABLE saved_addresses ADD PRIMARY KEY (id);

-- ============================================
-- 7. RECREATE INDEXES
-- ============================================

-- VTC
CREATE INDEX idx_vtc_rides_driver ON vtc_rides(driver_id);
CREATE INDEX idx_vtc_tracking_ride ON vtc_ride_tracking(ride_id);

-- Food
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_menu_options_item ON menu_item_options(menu_item_id);
CREATE INDEX idx_menu_addons_item ON menu_item_addons(menu_item_id);
CREATE INDEX idx_food_orders_restaurant ON food_orders(restaurant_id);
CREATE INDEX idx_food_order_items_order ON food_order_items(order_id);
CREATE INDEX idx_order_selections_item ON food_order_item_selections(order_item_id);

-- Parcel
CREATE INDEX idx_parcel_events_shipment ON parcel_tracking_events(shipment_id);

-- ============================================
-- 8. UPDATE VIEWS TO USE UUID
-- ============================================

DROP VIEW IF EXISTS vtc_rides_mobile CASCADE;
DROP VIEW IF EXISTS food_orders_mobile CASCADE;

-- Recreate with UUID
CREATE VIEW vtc_rides_mobile AS
SELECT
  r.id::text as id,  -- Convert UUID to string for mobile
  r.customer_id,
  r.driver_id::text as driver_id,
  r.vehicle_type,
  r.pickup_address,
  r.pickup_latitude,
  r.pickup_longitude,
  r.dropoff_address,
  r.dropoff_latitude,
  r.dropoff_longitude,
  r.base_fare,
  r.distance_fare,
  r.time_fare,
  r.surge_multiplier,
  r.total_fare,
  r.status,
  r.payment_method,
  r.payment_status,
  r.estimated_distance,
  r.actual_distance,
  r.estimated_duration,
  r.actual_duration,
  r.customer_rating,
  r.driver_rating,
  r.created_at,
  r.pickup_time as started_at,
  r.dropoff_time as completed_at,
  d.first_name || ' ' || d.last_name as driver_name,
  d.phone as driver_phone,
  d.photo as driver_photo,
  d.rating as driver_rating_avg,
  d.total_rides as driver_total_rides,
  d.vehicle_model,
  d.vehicle_color,
  d.license_plate as vehicle_plate
FROM vtc_rides r
LEFT JOIN vtc_drivers d ON r.driver_id = d.id;

CREATE VIEW food_orders_mobile AS
SELECT
  o.id::text as id,
  o.customer_id,
  o.restaurant_id::text as restaurant_id,
  o.delivery_address,
  o.delivery_latitude,
  o.delivery_longitude,
  o.delivery_instructions,
  o.subtotal,
  o.delivery_fee,
  o.tax,
  o.total,
  o.status,
  o.payment_method,
  o.payment_status,
  o.estimated_delivery_time,
  o.actual_delivery_time,
  o.rating,
  o.review,
  o.created_at,
  r.name as restaurant_name,
  r.logo,
  r.phone as restaurant_phone,
  r.rating as restaurant_rating,
  CASE
    WHEN o.estimated_delivery_time IS NOT NULL
    THEN EXTRACT(EPOCH FROM (o.estimated_delivery_time - o.created_at))/60
    ELSE NULL
  END as estimated_minutes
FROM food_orders o
JOIN restaurants r ON o.restaurant_id = r.id;

COMMENT ON VIEW vtc_rides_mobile IS 'Vue enrichie VTC avec conversion UUID→String pour mobile';
COMMENT ON VIEW food_orders_mobile IS 'Vue enrichie Food avec conversion UUID→String pour mobile';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migration UUID complétée avec succès!';
  RAISE NOTICE '   - Toutes les tables utilisent maintenant des UUID';
  RAISE NOTICE '   - Toutes les foreign keys ont été recréées';
  RAISE NOTICE '   - Tous les indexes ont été recréés';
  RAISE NOTICE '   - Les vues mobiles ont été mises à jour';
END $$;

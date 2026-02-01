-- Migration: Fix Frontend-Backend Compatibility Issues
-- Description: Corrections critiques pour alignement Flutter-TypeScript
-- Author: Claude
-- Date: 2025-01-19
-- Priority: CRITICAL

-- ============================================
-- 1. AJOUTER TABLES OPTIONS/ADDONS (FOOD)
-- ============================================

CREATE TABLE IF NOT EXISTS menu_item_options (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_options_item ON menu_item_options(menu_item_id);

CREATE TABLE IF NOT EXISTS menu_item_addons (
  id SERIAL PRIMARY KEY,
  menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_menu_addons_item ON menu_item_addons(menu_item_id);

-- Table pour stocker les sélections dans les commandes
CREATE TABLE IF NOT EXISTS food_order_item_selections (
  id SERIAL PRIMARY KEY,
  order_item_id INTEGER REFERENCES food_order_items(id) ON DELETE CASCADE,
  option_id INTEGER REFERENCES menu_item_options(id),
  addon_id INTEGER REFERENCES menu_item_addons(id),
  CHECK ((option_id IS NOT NULL AND addon_id IS NULL) OR (option_id IS NULL AND addon_id IS NOT NULL))
);

CREATE INDEX idx_order_selections_item ON food_order_item_selections(order_item_id);

COMMENT ON TABLE menu_item_options IS 'Options disponibles pour les articles de menu (ex: taille)';
COMMENT ON TABLE menu_item_addons IS 'Suppléments disponibles pour les articles de menu';
COMMENT ON TABLE food_order_item_selections IS 'Options et addons sélectionnés pour chaque article commandé';

-- ============================================
-- 2. STANDARDISER NOMENCLATURE PARCEL
-- ============================================

-- Renommer les colonnes pour correspondre au frontend
ALTER TABLE saved_addresses RENAME COLUMN name TO full_name;
ALTER TABLE saved_addresses RENAME COLUMN phone TO phone_number;

-- Ajouter le champ manquant
ALTER TABLE parcel_shipments ADD COLUMN IF NOT EXISTS delivered_to VARCHAR(255);

-- Renommer pour cohérence
ALTER TABLE parcel_shipments RENAME COLUMN delivery_signature TO recipient_signature;
ALTER TABLE parcel_shipments RENAME COLUMN delivery_photo TO proof_of_delivery_url;

COMMENT ON COLUMN parcel_shipments.delivered_to IS 'Nom de la personne ayant réellement reçu le colis';

-- ============================================
-- 3. AJOUTER CHAMPS MANQUANTS VTC
-- ============================================

-- Ajouter surge multiplier s'il manque (devrait déjà exister)
-- Vérification: La colonne existe déjà dans vtc_rides

-- Ajouter colonne pour tracking du statut du driver en temps réel
ALTER TABLE vtc_drivers ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP;

-- Index pour recherche rapide des drivers actifs
CREATE INDEX IF NOT EXISTS idx_vtc_drivers_active ON vtc_drivers(status, last_active_at)
WHERE status = 'online';

-- ============================================
-- 4. AJOUTER CHAMPS MANQUANTS FOOD
-- ============================================

-- Vérifier que tax et payment_status existent
-- (Devraient déjà exister dans food_orders)

-- Ajouter champs contact restaurant si manquants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS accepts_vouchers BOOLEAN DEFAULT false;

-- ============================================
-- 5. CRÉER VUES POUR COMPATIBILITÉ
-- ============================================

-- Vue pour VTC rides avec format frontend
CREATE OR REPLACE VIEW vtc_rides_mobile AS
SELECT
  r.id,
  r.customer_id,
  r.driver_id,
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
  -- Informations driver enrichies
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

COMMENT ON VIEW vtc_rides_mobile IS 'Vue enrichie pour consommation mobile app';

-- Vue pour food orders avec calculs
CREATE OR REPLACE VIEW food_orders_mobile AS
SELECT
  o.id,
  o.customer_id,
  o.restaurant_id,
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
  -- Informations restaurant enrichies
  r.name as restaurant_name,
  r.logo,
  r.phone as restaurant_phone,
  r.rating as restaurant_rating,
  -- Calculs utiles
  CASE
    WHEN o.estimated_delivery_time IS NOT NULL
    THEN EXTRACT(EPOCH FROM (o.estimated_delivery_time - o.created_at))/60
    ELSE NULL
  END as estimated_minutes
FROM food_orders o
JOIN restaurants r ON o.restaurant_id = r.id;

COMMENT ON VIEW food_orders_mobile IS 'Vue enrichie pour consommation mobile app';

-- ============================================
-- 6. FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour calculer le prix total VTC
CREATE OR REPLACE FUNCTION calculate_vtc_total_fare(
  base_fare DECIMAL,
  distance_fare DECIMAL,
  time_fare DECIMAL,
  surge_multiplier DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN ROUND((base_fare + distance_fare + time_fare) * surge_multiplier);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour calculer le total food order
CREATE OR REPLACE FUNCTION calculate_food_order_total(
  subtotal DECIMAL,
  delivery_fee DECIMAL,
  tax_rate DECIMAL DEFAULT 0.05
) RETURNS DECIMAL AS $$
BEGIN
  RETURN ROUND(subtotal + delivery_fee + (subtotal * tax_rate));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 7. CONTRAINTES ADDITIONNELLES
-- ============================================

-- Assurer cohérence des statuts
ALTER TABLE vtc_rides DROP CONSTRAINT IF EXISTS vtc_rides_status_check;
ALTER TABLE vtc_rides ADD CONSTRAINT vtc_rides_status_check
CHECK (status IN ('requested', 'accepted', 'arrived', 'started', 'completed', 'cancelled'));

ALTER TABLE food_orders DROP CONSTRAINT IF EXISTS food_orders_status_check;
ALTER TABLE food_orders ADD CONSTRAINT food_orders_status_check
CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled'));

-- Assurer que les ratings sont valides
ALTER TABLE vtc_rides DROP CONSTRAINT IF EXISTS vtc_rides_customer_rating_check;
ALTER TABLE vtc_rides ADD CONSTRAINT vtc_rides_customer_rating_check
CHECK (customer_rating IS NULL OR (customer_rating >= 1 AND customer_rating <= 5));

ALTER TABLE vtc_rides DROP CONSTRAINT IF EXISTS vtc_rides_driver_rating_check;
ALTER TABLE vtc_rides ADD CONSTRAINT vtc_rides_driver_rating_check
CHECK (driver_rating IS NULL OR (driver_rating >= 1 AND driver_rating <= 5));

-- ============================================
-- 8. DONNÉES DE TEST (OPTIONNEL)
-- ============================================

-- Exemples d'options pour un burger
INSERT INTO menu_item_options (menu_item_id, name, price) VALUES
(1, 'Petit', 0),
(1, 'Moyen', 500),
(1, 'Grand', 1000);

-- Exemples d'addons
INSERT INTO menu_item_addons (menu_item_id, name, price, is_required) VALUES
(1, 'Fromage supplémentaire', 300, false),
(1, 'Bacon', 500, false),
(1, 'Sauce piquante', 0, false);

COMMENT ON COLUMN menu_item_options.price IS 'Supplément de prix pour cette option (0 si option de base)';
COMMENT ON COLUMN menu_item_addons.price IS 'Prix de ce supplément';

-- ============================================
-- Fin de la migration
-- ============================================

-- Migration pour la réservation multiple avec infos passager (nom, téléphone, document)

-- 1. Création de la table booking_passenger si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS booking_passenger (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES booking(id) ON DELETE CASCADE,
    name VARCHAR(100),
    phone VARCHAR(30),
    document_type VARCHAR(20),
    document_number VARCHAR(50)
);

-- 2. Ajout des colonnes document_type et document_number si la table existe déjà
ALTER TABLE booking_passenger ADD COLUMN IF NOT EXISTS document_type VARCHAR(20);
ALTER TABLE booking_passenger ADD COLUMN IF NOT EXISTS document_number VARCHAR(50);

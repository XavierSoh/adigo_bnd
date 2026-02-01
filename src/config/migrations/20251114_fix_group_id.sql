-- Correction migration : Ajout de la colonne group_id si manquante
ALTER TABLE booking ADD COLUMN IF NOT EXISTS group_id VARCHAR(50);

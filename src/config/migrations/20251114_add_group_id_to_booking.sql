-- Migration : Ajout du champ group_id pour la gestion des réservations multiples
ALTER TABLE booking ADD COLUMN IF NOT EXISTS group_id VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_booking_group_id ON booking(group_id);
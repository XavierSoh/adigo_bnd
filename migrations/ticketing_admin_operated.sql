-- Billetterie opérée par Adigo (TICKETING_MODULE_PLAN_2026-10.md) :
-- les admins créent organisateurs et événements, l'organisateur suit ses
-- ventes et fait scanner par des contrôleurs invités événement par
-- événement, Adigo prélève une commission et enregistre ses reversements.
-- Idempotent — exécuté à chaque déploiement par deploy.yml, comme les
-- autres fichiers de ce dossier.
DO $$
BEGIN
    -- §3.1 Suspendre / reprendre les ventes sans dépublier l'événement.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event' AND column_name = 'sales_paused'
    ) THEN
        ALTER TABLE event ADD COLUMN sales_paused BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Column event.sales_paused added';
    END IF;

    -- §4.1 Taux spécifique à un organisateur (NULL = taux par défaut).
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_organizer' AND column_name = 'commission_rate'
    ) THEN
        ALTER TABLE event_organizer ADD COLUMN commission_rate NUMERIC(5,2);
        ALTER TABLE event_organizer ADD CONSTRAINT event_organizer_commission_rate_check
            CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100));
        RAISE NOTICE 'Column event_organizer.commission_rate added';
    END IF;

    -- §4.1 Commission figée à la vente.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_ticket' AND column_name = 'commission_rate'
    ) THEN
        ALTER TABLE event_ticket ADD COLUMN commission_rate NUMERIC(5,2);
        ALTER TABLE event_ticket ADD COLUMN commission_amount INTEGER;
        RAISE NOTICE 'Columns event_ticket.commission_rate/commission_amount added';
    END IF;

    -- §3.2 Compteur d'entrées pour un billet multi-personnes. Ajouté une
    -- seule fois : c'est aussi le moment où `sold` change de sens — il
    -- compte désormais les places RÉSERVÉES (billets en attente de
    -- paiement inclus) et plus seulement les places payées, pour qu'un
    -- paiement Orange Money en cours bloque sa place (anti-survente). Le
    -- recalcul ci-dessous aligne les compteurs existants sur cette règle.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_ticket' AND column_name = 'checked_in_count'
    ) THEN
        ALTER TABLE event_ticket ADD COLUMN checked_in_count INTEGER NOT NULL DEFAULT 0;
        UPDATE event_ticket SET checked_in_count = quantity WHERE status = 'used';

        UPDATE event_ticket_type tt
        SET sold = COALESCE((
            SELECT SUM(t.quantity) FROM event_ticket t
            WHERE t.ticket_type_id = tt.id
              AND t.is_deleted = false
              AND t.status IN ('pending', 'confirmed', 'used')
        ), 0);
        RAISE NOTICE 'Column event_ticket.checked_in_count added, event_ticket_type.sold recomputed';
    END IF;

    -- §3.2 Demande d'annulation par le client, validée par un admin.
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_ticket' AND column_name = 'cancel_request_status'
    ) THEN
        ALTER TABLE event_ticket ADD COLUMN cancel_request_status VARCHAR(20);
        ALTER TABLE event_ticket ADD CONSTRAINT event_ticket_cancel_request_status_check
            CHECK (cancel_request_status IS NULL OR cancel_request_status IN ('requested', 'approved', 'rejected'));
        ALTER TABLE event_ticket ADD COLUMN cancel_requested_at TIMESTAMP;
        ALTER TABLE event_ticket ADD COLUMN cancel_request_reason TEXT;
        ALTER TABLE event_ticket ADD COLUMN cancel_decided_at TIMESTAMP;
        ALTER TABLE event_ticket ADD COLUMN cancel_decided_by INTEGER REFERENCES users(id);
        ALTER TABLE event_ticket ADD COLUMN cancel_decision_note TEXT;
        RAISE NOTICE 'Cancellation request columns added to event_ticket';
    END IF;

    -- Montant effectivement remboursé (toujours sur le wallet).
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_ticket' AND column_name = 'refunded_amount'
    ) THEN
        ALTER TABLE event_ticket ADD COLUMN refunded_amount INTEGER;
        ALTER TABLE event_ticket ADD COLUMN refunded_at TIMESTAMP;
        RAISE NOTICE 'Columns event_ticket.refunded_amount/refunded_at added';
    END IF;
END $$;

-- §3.3 Invitations et accès contrôleur, par événement.
CREATE TABLE IF NOT EXISTS event_controller (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'invited'
        CHECK (status IN ('invited', 'accepted', 'declined', 'revoked', 'expired')),
    invited_by_user_id INTEGER REFERENCES users(id),
    invited_by_customer_id INTEGER REFERENCES customer(id),
    invited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    revoked_at TIMESTAMP,
    CONSTRAINT uq_event_controller_event_customer UNIQUE (event_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_event_controller_customer ON event_controller(customer_id, status);

-- Historique des scans : qui a admis combien de personnes, et quand.
CREATE TABLE IF NOT EXISTS ticket_scan (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES event_ticket(id) ON DELETE CASCADE,
    event_id INTEGER NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    admitted INTEGER NOT NULL CHECK (admitted > 0),
    scanned_by_customer_id INTEGER REFERENCES customer(id),
    scanned_by_user_id INTEGER REFERENCES users(id),
    scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ticket_scan_ticket ON ticket_scan(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scan_event ON ticket_scan(event_id);

-- §4.3 Reversements aux organisateurs, enregistrés à la main par un admin.
CREATE TABLE IF NOT EXISTS organizer_payout (
    id SERIAL PRIMARY KEY,
    organizer_id INTEGER NOT NULL REFERENCES event_organizer(id),
    event_id INTEGER REFERENCES event(id),
    amount INTEGER NOT NULL CHECK (amount > 0),
    method VARCHAR(20) NOT NULL
        CHECK (method IN ('orange_money', 'mtn_momo', 'bank_transfer', 'cash', 'other')),
    reference VARCHAR(100),
    notes TEXT,
    paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_organizer_payout_organizer ON organizer_payout(organizer_id) WHERE is_deleted = false;

-- §4.1 Taux de commission par défaut — 10 % en attendant le taux réel,
-- modifiable depuis adigo2 (Billetterie > Paramètres). Jamais écrasé
-- une fois créé.
INSERT INTO system_settings (category, setting_key, setting_value, description, updated_at)
VALUES ('ticketing', 'default_commission_rate', '10',
        'Taux de commission Adigo par défaut (%) sur les ventes de billets', CURRENT_TIMESTAMP)
ON CONFLICT (category, setting_key) DO NOTHING;

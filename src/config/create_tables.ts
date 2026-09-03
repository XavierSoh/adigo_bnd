

import * as tbl from "../utils/table_names";
import { kProfile } from "../utils/table_names";
import { pgNone } from "../utils/prisma-compat";
import TableQuery from "../models/table_query.model";
import { accessRightsRepository } from "../repository/access_rights.repository";
//import queryLogs from "../utils/query_logs";  
//import setupPermissions from "./create_access_right";
//import constrainst from "../utils/constraints";

//import stockRemovalReport from "../utils/get_stock_removal_reports";
let tableQueries: TableQuery[] = [
    {
        query: `
        CREATE TABLE IF NOT EXISTS ${tbl.kContractType} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE, 
        code VARCHAR(40) NOT NULL UNIQUE,
        terms_and_conditions TEXT,
        periodicity VARCHAR(40) NOT NULL,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP, 
        updated_at TIMESTAMP, 
        deleted_by INT,  
        created_by INT    
       ); 
        `
    },

    {
        query: `CREATE TABLE IF NOT EXISTS "${tbl.kUsers}" (
            id SERIAL PRIMARY KEY,
            login VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL, 
            creation_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            staff INT, --REFERENCES staf(id)
            profile INT, -- REFERENCES kProfile (id)
            dark_mode BOOLEAN DEFAULT FALSE,
            language VARCHAR(2) CHECK (language IN('fr', 'en') ) ,
            super_u VARCHAR, 
            role VARCHAR(50) DEFAULT 'guest' CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'guest')),
            account_status VARCHAR CHECK (account_status IN ('deleted', 'disabled', 'enabled')),
            is_deleted BOOLEAN DEFAULT FALSE,
            is_online BOOLEAN DEFAULT FALSE,
            deleted_at TIMESTAMP WITHOUT TIME ZONE, -- Référence à l'utilisateur qui a effectué la suppression
            deleted_by INT,
            updated_at TIMESTAMP, 
            created_by INT   

        );`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS ${tbl.kStaff} (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(50) NOT NULL,
                birth_name VARCHAR(50) ,
                last_name VARCHAR(50) ,
                employee_id VARCHAR(20) UNIQUE NOT NULL,
                birth_date TIMESTAMP WITHOUT TIME ZONE,  
                email VARCHAR(100),
                mobile_phone VARCHAR(20),
                landline_phone VARCHAR(20),
                contract_start_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                contract_start_time TIME,
                weekly_working_hours INT NOT NULL,
                contract_end_date TIMESTAMP WITHOUT TIME ZONE,
                contract_type INT NOT NULL REFERENCES "${tbl.kContractType}"(id) ON DELETE CASCADE,
                salary INT NOT NULL,
                payment_mode VARCHAR(50) NOT NULL CHECK (payment_mode IN ('daily', 'weekly', 'monthly')) DEFAULT 'monthly',
                FOREIGN KEY (contract_type) REFERENCES contract_type(id) ON DELETE SET NULL,
                last_salary_payment DATE,
                is_deleted BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP WITHOUT TIME ZONE, 
                deleted_by INT REFERENCES "${tbl.kUsers}"(id)     
);  
        `

    },

    {
        query: `CREATE TABLE IF NOT EXISTS ${tbl.kAccessRight} (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(50) NOT NULL UNIQUE,
                    module TEXT NOT NULL,
                    module_name_en VARCHAR(100) NOT NULL,
                    module_name_fr VARCHAR(100) NOT NULL,
                    description_en VARCHAR(255),
                    description_fr VARCHAR(255),
                    is_deleted BOOLEAN DEFAULT FALSE,
                    deleted_at TIMESTAMP WITHOUT TIME ZONE,
                    deleted_by INT REFERENCES "${tbl.kUsers}"(id), 
                    created_by INT REFERENCES "${tbl.kUsers}"(id)
                );
                            
            `
    },
      
    //Profile
    


    // Table booking_passenger sera créée APRÈS la table booking (voir plus bas)
    {
        query: `CREATE TABLE IF NOT EXISTS "${tbl.kProfile}" (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                description VARCHAR(50),     
                is_deleted BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP WITHOUT TIME ZONE,
                deleted_by INT REFERENCES "${tbl.kUsers}"(id), 
                created_by INT REFERENCES "${tbl.kUsers}"(id)

            );               
            `
    },

    //Profile access rights 
    {
        query: `CREATE TABLE IF NOT EXISTS "${tbl.kProfileAccessRights}" (
                profile_id INT NOT NULL REFERENCES "${kProfile}"(id) ON DELETE CASCADE,
                access_right_id INT NOT NULL REFERENCES "${tbl.kAccessRight}"(id) ON DELETE CASCADE,
                PRIMARY KEY (profile_id, access_right_id),
                is_deleted BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP WITHOUT TIME ZONE,
                deleted_by INT REFERENCES "${tbl.kUsers}"(id)
            );               
            `
    },
    {
        query: `CREATE TABLE IF NOT EXISTS ${tbl.kAgency} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        cities_served TEXT[] NOT NULL, -- Tableau des villes desservies
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
          logo VARCHAR(255), -- Chemin vers le logo de l'agence
        opening_hours VARCHAR(50)  , -- '08:00-18:00'
        custom_hours JSONB, -- {monday: {open: '08:00', close: '18:00'}, ...}
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP,
        deleted_by INT REFERENCES "${tbl.kUsers}"(id),
        created_by INT REFERENCES "${tbl.kUsers}"(id)  
    )`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS ${tbl.kBus} (
        id SERIAL PRIMARY KEY,
        registration_number VARCHAR(50) UNIQUE ,
        capacity INT NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('standard', 'VIP')),
        amenities TEXT[], -- ['wifi', 'toilet', 'ac', ...]
        seat_layout VARCHAR(10) NOT NULL CHECK (seat_layout IN ('2x2', '3x2')),
        has_toilet BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        agency_id INT REFERENCES ${tbl.kAgency}(id),
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP,
        deleted_by INT REFERENCES "${tbl.kUsers}"(id),
        created_by INT REFERENCES "${tbl.kUsers}"(id)
    )`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS ${tbl.kSeat} (
            id SERIAL PRIMARY KEY,
            bus_id INT NOT NULL REFERENCES ${tbl.kBus}(id) ON DELETE CASCADE,
            seat_number INT  NOT NULL, -- 'A1', 'B3', etc.
            row_number INT, -- Ligne du siège (1, 2, 3...)
            column_position INT, -- Position ('A', 'B', 'C'...)
            seat_type VARCHAR(20) CHECK (seat_type IN ('standard', 'premium', 'extra_legroom')),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(bus_id, seat_number)
    );
     

    `
    },
    {
        query:`
        -- Fonction pour générer automatiquement les sièges lors de la création d'un bus
CREATE OR REPLACE FUNCTION generate_bus_seats()
RETURNS TRIGGER AS $$
DECLARE
    seat_num INT := 1;
BEGIN
    -- Boucler de 1 à la capacité du bus
    WHILE seat_num <= NEW.capacity LOOP
        INSERT INTO ${tbl.kSeat} (
            bus_id, 
            seat_number,  -- maintenant INT
            seat_type,
            is_active
        ) VALUES (
            NEW.id,
            seat_num,
            'standard',
            TRUE
        )
        ON CONFLICT DO NOTHING; -- éviter doublons si contrainte unique

        seat_num := seat_num + 1;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer puis recréer le trigger proprement
DROP TRIGGER IF EXISTS trigger_generate_bus_seats ON ${tbl.kBus};

CREATE TRIGGER trigger_generate_bus_seats
AFTER INSERT ON ${tbl.kBus}
FOR EACH ROW
EXECUTE FUNCTION generate_bus_seats();

        
        `
    },
    
    { 
        query: `CREATE TABLE IF NOT EXISTS ${tbl.kRecurrencePattern} (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'none')),
        interval INT DEFAULT 1,
        days_of_week TEXT, -- JSON array pour les jours de la semaine [0-6]
        end_date DATE,
        exceptions TEXT, -- JSON array des dates d'exception
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP,
        deleted_by INT REFERENCES "${tbl.kUsers}"(id),
        created_by INT REFERENCES "${tbl.kUsers}"(id)
    )`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS ${tbl.kTrip} (
        id SERIAL PRIMARY KEY,
        departure_city VARCHAR(100) NOT NULL,
        arrival_city VARCHAR(100) NOT NULL,
        departure_time TIMESTAMP NOT NULL,
        arrival_time TIMESTAMP NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        bus_id INT REFERENCES ${tbl.kBus}(id),
        agency_id INT REFERENCES ${tbl.kAgency}(id),
        is_active BOOLEAN DEFAULT TRUE,
        cancellation_policy TEXT,
        recurrence_pattern_id INT REFERENCES ${tbl.kRecurrencePattern}(id) ON DELETE SET NULL,
        valid_from DATE NOT NULL,
        valid_until DATE,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_by INT REFERENCES "${tbl.kUsers}"(id),
        created_by INT REFERENCES "${tbl.kUsers}"(id)
    )`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS ${tbl.kGeneratedTrip} (
            id SERIAL PRIMARY KEY,
            trip_id INT NOT NULL REFERENCES ${tbl.kTrip}(id) ON DELETE CASCADE,
            original_departure_time TIMESTAMP NOT NULL, -- Heure de départ originale
            actual_departure_time TIMESTAMP NOT NULL, -- Heure réelle (peut être modifiée)
            actual_arrival_time TIMESTAMP,
            available_seats INT NOT NULL,
            status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'boarding', 'departed', 'arrived', 'cancelled')),
            driver_id INT REFERENCES ${tbl.kStaff}(id),
            conductor_id INT REFERENCES ${tbl.kStaff}(id),
            bus_id INT REFERENCES ${tbl.kBus}(id) NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(trip_id, actual_departure_time) 
        )`
    },
    {
        query: `
        -- 6. Table GeneratedTripSeat - Sièges disponibles pour chaque voyage généré
-- C'est LA table clé qui lie un siège physique à un voyage spécifique
        CREATE TABLE IF NOT EXISTS ${tbl.kGeneratedTripSeat} (
        id SERIAL PRIMARY KEY,
        generated_trip_id INT NOT NULL REFERENCES ${tbl.kGeneratedTrip}(id) ON DELETE CASCADE,
        seat_id INT NOT NULL REFERENCES ${tbl.kSeat}(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'available' 
            CHECK (status IN ('available', 'reserved', 'booked', 'blocked')),
        price_adjustment DECIMAL(10,2) DEFAULT 0.00, -- Ajustement de prix pour ce siège
        blocked_reason TEXT, -- Si le siège est bloqué (maintenance, etc.)
        blocked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(generated_trip_id, seat_id)
);
        
        `
    },

    {
        query: ` 
CREATE TABLE IF NOT EXISTS ${tbl.kCustomer} (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    city VARCHAR(100),
    id_card_number VARCHAR(50),
    id_card_type VARCHAR(20),
    preferred_language VARCHAR(2) DEFAULT 'fr',
    notification_enabled BOOLEAN DEFAULT TRUE,
    preferred_seat_type VARCHAR(20),
    loyalty_points INT DEFAULT 0,
    customer_tier VARCHAR(20) DEFAULT 'regular',
    account_status VARCHAR(20) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    profile_picture TEXT,
    wallet_balance INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    last_login TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by INT REFERENCES users(id)
);

`
    },

    // Wallet transactions table
    {
        query: `CREATE TABLE IF NOT EXISTS wallet_transaction (
            id SERIAL PRIMARY KEY,
            customer_id INT NOT NULL REFERENCES ${tbl.kCustomer}(id),
            amount INT NOT NULL,
            transaction_type VARCHAR(20) NOT NULL,
            payment_method VARCHAR(20),
            payment_reference VARCHAR(100),
            description TEXT,
            balance_before INT NOT NULL,
            balance_after INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_transaction_type CHECK (transaction_type IN ('top_up', 'payment', 'refund'))
        )`
    },

    // Table pour suivre la génération des voyages
    {
        query: `CREATE TABLE IF NOT EXISTS ${tbl.kTripGenerationLog} (
            id SERIAL PRIMARY KEY,
            generation_date DATE NOT NULL,
            trips_generated INT NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            generated_by INT REFERENCES "${tbl.kUsers}"(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    },
    
    {
        query: `    -- Index pour recherche rapide
        CREATE INDEX IF NOT EXISTS idx_seat_bus ON seat(bus_id);`
    },
    {
        query: `-- 8. Table Booking - REFONTE COMPLÈTE
    CREATE TABLE IF NOT EXISTS ${tbl.kBooking} (
        id SERIAL PRIMARY KEY,
        booking_reference VARCHAR(20) UNIQUE NOT NULL, -- Ex: 'BKG-2025-001234'
        payment_method VARCHAR(20) CHECK (payment_method IN ('orangeMoney', 'mtn', 'cash', 'wallet')) NOT NULL,
        generated_trip_id INT NOT NULL REFERENCES ${tbl.kGeneratedTrip}(id),
        generated_trip_seat_id INT NOT NULL REFERENCES ${tbl.kGeneratedTripSeat}(id),
        customer_id INT NOT NULL REFERENCES ${tbl.kCustomer}(id),
        -- Prix et paiement
        base_price INT,
        seat_price_adjustment DECIMAL(10,2) DEFAULT 0.00,
        taxes DECIMAL(10,2) DEFAULT 0.00,
        discount DECIMAL(10,2) DEFAULT 0.00,
        total_price INT NOT NULL,
        -- Statut
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
        -- Dates importantes
        booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmation_date TIMESTAMP,
        cancellation_date TIMESTAMP,
        completion_date TIMESTAMP,
        -- Informations additionnelles
        cancellation_reason TEXT,
        special_requests TEXT,
        payment_reference VARCHAR(100),
        payment_status VARCHAR(20) DEFAULT 'unpaid'
            CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
        -- Tracking
        created_by INT NOT NULL REFERENCES ${tbl.kCustomer}(id),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP,
        deleted_by INT REFERENCES "${tbl.kUsers}"(id),
        group_id VARCHAR(50)
    )
    `
    },
    // Index pour group_id
    {
        query: `CREATE INDEX IF NOT EXISTS idx_booking_group_id ON ${tbl.kBooking}(group_id);`
    },
    // ✅ Ajout d’un index unique partiel pour éviter la double réservation
    {
        query: `CREATE UNIQUE INDEX IF NOT EXISTS idx_no_double_booking ON ${tbl.kBooking}(generated_trip_seat_id) WHERE status IN ('confirmed', 'pending');`
    },
    // Table booking_passenger pour les passagers multiples
    {
        query: `CREATE TABLE IF NOT EXISTS booking_passenger (
            id SERIAL PRIMARY KEY,
            booking_id INTEGER REFERENCES ${tbl.kBooking}(id) ON DELETE CASCADE,
            name VARCHAR(100),
            phone VARCHAR(30),
            document_type VARCHAR(20),
            document_number VARCHAR(50)
        );
        ALTER TABLE booking_passenger ADD COLUMN IF NOT EXISTS document_type VARCHAR(20);
        ALTER TABLE booking_passenger ADD COLUMN IF NOT EXISTS document_number VARCHAR(50);`
    },
    

    {
        query: `
 -- Fonction pour générer automatiquement les sièges lors de la création d'un voyage
CREATE OR REPLACE FUNCTION generate_trip_seats()
RETURNS TRIGGER AS $$
DECLARE
    bus_capacity INT;
    existing_seats INT;
    seats_to_create INT;
BEGIN
    -- Récupérer la capacité du bus
    SELECT capacity INTO bus_capacity 
    FROM bus
    WHERE id = NEW.bus_id;
    
    -- Compter les sièges actifs existants pour ce bus
    SELECT COUNT(*) INTO existing_seats
    FROM seat
    WHERE bus_id = NEW.bus_id  
      AND is_active = TRUE;
    
    -- Si aucun siège défini, ne rien faire
    IF existing_seats = 0 THEN
         RETURN NEW;
    END IF;
    
    seats_to_create := LEAST(existing_seats, bus_capacity);
    
    -- Créer les entrées dans generated_trip_seat (éviter doublons avec ON CONFLICT)
    INSERT INTO generated_trip_seat (generated_trip_id, seat_id, status)
    SELECT NEW.id, s.id, 'available'
    FROM seat s
    WHERE s.bus_id = NEW.bus_id 
      AND s.is_active = TRUE
    ORDER BY s.row_number, s.column_position
    LIMIT seats_to_create
    ON CONFLICT DO NOTHING; -- 🔥 important
    
    -- Mettre à jour le nombre de sièges disponibles
    UPDATE generated_trip
    SET available_seats = seats_to_create
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer puis recréer le trigger proprement
DROP TRIGGER IF EXISTS trigger_generate_trip_seats ON generated_trip;

CREATE TRIGGER trigger_generate_trip_seats
AFTER INSERT ON generated_trip
FOR EACH ROW
EXECUTE FUNCTION generate_trip_seats();

 
    `
    },

    {
        query: `
    -- 11. Fonction pour mettre à jour available_seats automatiquement generated_trip_seat_id
CREATE OR REPLACE FUNCTION update_available_seats()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour le nombre de sièges disponibles dans generated_trip
    UPDATE generated_trip
    SET available_seats = (
        SELECT COUNT(*)
        FROM ${tbl.kGeneratedTripSeat}
        WHERE generated_trip_id = COALESCE(NEW.generated_trip_id, OLD.generated_trip_id)
        AND status = 'available'
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.generated_trip_id, OLD.generated_trip_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_available_seats ON ${tbl.kGeneratedTripSeat};
CREATE TRIGGER trigger_update_available_seats
AFTER INSERT OR UPDATE OR DELETE ON ${tbl.kGeneratedTripSeat}
FOR EACH ROW
EXECUTE FUNCTION update_available_seats();
    `
    },

    {
        query: `
-- 12. Fonction pour mettre à jour le statut du siège lors d'une réservation 
CREATE OR REPLACE FUNCTION update_seat_status_on_booking()
RETURNS TRIGGER AS $$ 
BEGIN
    -- Cas d'INSERTION (nouvelle réservation)
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'pending' THEN
            -- Marquer le siège comme réservé (en attente de confirmation)
            UPDATE ${tbl.kGeneratedTripSeat}
            SET status = 'reserved',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.generated_trip_seat_id;
            
        ELSIF NEW.status = 'confirmed' THEN
            -- Marquer le siège comme réservé définitivement
            UPDATE ${tbl.kGeneratedTripSeat}
            SET status = 'booked',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.generated_trip_seat_id;
        END IF;
    
    -- Cas de MISE À JOUR
    ELSIF TG_OP = 'UPDATE' THEN
        -- Transition de pending à confirmed
        IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
            UPDATE ${tbl.kGeneratedTripSeat}
            SET status = 'booked',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.generated_trip_seat_id;
            
        -- Transition de confirmed/pending à cancelled
        ELSIF (OLD.status IN ('pending', 'confirmed') AND NEW.status = 'cancelled') THEN
            UPDATE ${tbl.kGeneratedTripSeat}
            SET status = 'available',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.generated_trip_seat_id;
            
        -- Transition de cancelled à pending/confirmed (réactivation)
        ELSIF OLD.status = 'cancelled' AND NEW.status IN ('pending', 'confirmed') THEN
            IF NEW.status = 'pending' THEN
                UPDATE ${tbl.kGeneratedTripSeat}
                SET status = 'reserved',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.generated_trip_seat_id;
            ELSE
                UPDATE ${tbl.kGeneratedTripSeat}
                SET status = 'booked',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.generated_trip_seat_id;
            END IF;
            
        -- Cas completed et no_show : le siège reste booked
        ELSIF NEW.status IN ('completed', 'no_show') THEN
            -- Le siège reste marqué comme 'booked' car le voyage a eu lieu
            -- Pas de changement de statut du siège
            NULL;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_seat_on_booking ON ${tbl.kBooking};
CREATE TRIGGER trigger_update_seat_on_booking
AFTER INSERT OR UPDATE ON ${tbl.kBooking}
FOR EACH ROW
EXECUTE FUNCTION update_seat_status_on_booking();
    
    `
    }, 

    {
        query:`
        -- 13. Vue pour faciliter les requêtes de réservation
CREATE OR REPLACE VIEW booking_details AS
SELECT 
    b.id as booking_id,
    b.booking_reference,
    b.status as booking_status,
    b.total_price,
    b.booking_date,
    
    -- Customer info
    c.id as customer_id,
    c.first_name || ' ' || c.last_name as customer_name,
    c.email,
    c.phone,
    
    -- Trip info
    gt.id as generated_trip_id,
    gt.actual_departure_time,
    gt.actual_arrival_time,
    gt.status as trip_status,
    t.departure_city,
    t.arrival_city,
    
    -- Seat info
    s.seat_number,
    s.seat_type,
    s.row_number,
    s.column_position,
    
    -- Bus info
    bus.registration_number,
    bus.type as bus_type
    
FROM ${tbl.kBooking} b
JOIN ${tbl.kCustomer} c ON b.customer_id = c.id
JOIN ${tbl.kGeneratedTripSeat} gts ON b.generated_trip_seat_id = gts.id
JOIN ${tbl.kGeneratedTrip} gt ON gts.generated_trip_id = gt.id
JOIN ${tbl.kTrip} t ON gt.trip_id = t.id
JOIN ${tbl.kSeat} s ON gts.seat_id = s.id
JOIN ${tbl.kBus} ON s.bus_id = bus.id
WHERE b.is_deleted = FALSE;

        `
    },

    // Generic payment transaction ledger — one row per Orange Money attempt,
    // regardless of what it's paying for (wallet top-up, booking, ticket
    // purchase...). "settled" guards against double-crediting when both a
    // status poll and the async webhook observe the same success.
    {
        query: `CREATE TABLE IF NOT EXISTS ${tbl.kPaymentTransaction} (
            id SERIAL PRIMARY KEY,
            customer_id INT NOT NULL REFERENCES ${tbl.kCustomer}(id),
            provider VARCHAR(20) NOT NULL DEFAULT 'orange_money'
                CHECK (provider IN ('orange_money', 'mtn_momo')),
            purpose VARCHAR(30) NOT NULL
                CHECK (purpose IN ('wallet_topup', 'booking', 'ticket_purchase')),
            purpose_ref_id INT,
            order_id VARCHAR(50) NOT NULL UNIQUE,
            pay_token VARCHAR(100),
            subscriber_msisdn VARCHAR(20) NOT NULL,
            amount INT NOT NULL,
            currency VARCHAR(10) DEFAULT 'XAF',
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'initiated'
                CHECK (status IN ('initiated', 'pending', 'successful', 'failed', 'expired')),
            provider_txn_id VARCHAR(100),
            settled BOOLEAN NOT NULL DEFAULT FALSE,
            settled_at TIMESTAMP,
            error_message TEXT,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        )`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_payment_transaction_customer ON ${tbl.kPaymentTransaction}(customer_id)`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_payment_transaction_pay_token ON ${tbl.kPaymentTransaction}(pay_token)`
    },
    // Widen the provider CHECK for existing databases created before MoMo was
    // added as a (stub) provider — the CREATE TABLE above already has the
    // wide constraint for fresh installs, this is a no-op there.
    {
        query: `ALTER TABLE ${tbl.kPaymentTransaction} DROP CONSTRAINT IF EXISTS payment_transaction_provider_check`
    },
    {
        query: `ALTER TABLE ${tbl.kPaymentTransaction} ADD CONSTRAINT payment_transaction_provider_check CHECK (provider IN ('orange_money', 'mtn_momo'))`
    },

    // Ticketing — Event schema. The single biggest gap found this session:
    // event_category/event_organizer/event/event_ticket_type/event_ticket/
    // event_favorite/event_review and the customer `wallet` table only ever
    // existed in loose files (src/migrations/ticketing/001_create_tables.sql,
    // 003_add_admin_tables.sql) that nothing runs automatically — despite
    // every admin controller/repository and desktop screen (Dashboard,
    // Utilisateurs, Validation Organisateurs/Événements, Avis, Transactions)
    // being fully wired against them. Every one of those 500'd with
    // `relation "..." does not exist`. Ported here, same treatment as
    // payment_transaction/vtc_*/promo_code above — kept close to the
    // original SQL, admin-only columns (verification_status, id_card_*,
    // is_deleted/deleted_at/deleted_by) folded directly into the CREATE
    // TABLE rather than as separate ALTERs, since these tables don't exist
    // yet anywhere this runs.
    {
        query: `CREATE TABLE IF NOT EXISTS event_category (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            name_fr VARCHAR(100) NOT NULL,
            name_en VARCHAR(100) NOT NULL,
            icon VARCHAR(50),
            color VARCHAR(20),
            is_active BOOLEAN DEFAULT TRUE,
            display_order INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS event_organizer (
            id SERIAL PRIMARY KEY,
            customer_id INT UNIQUE REFERENCES ${tbl.kCustomer}(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50) DEFAULT 'individual',
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(100) NOT NULL,
            logo VARCHAR(255),
            description TEXT,
            is_verified BOOLEAN DEFAULT FALSE,
            verified_at TIMESTAMP,
            verified_by INT REFERENCES users(id),
            verification_status VARCHAR(20) DEFAULT 'pending'
                CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
            id_card_front VARCHAR(255),
            id_card_back VARCHAR(255),
            rccm_document VARCHAR(255),
            rejection_reason TEXT,
            total_events INT DEFAULT 0,
            total_sales INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            deleted_at TIMESTAMP,
            deleted_by INT REFERENCES users(id)
        )`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS event (
            id SERIAL PRIMARY KEY,
            code VARCHAR(20) UNIQUE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category_id INT NOT NULL REFERENCES event_category(id),
            organizer_id INT NOT NULL REFERENCES event_organizer(id),
            cover_image VARCHAR(255),
            event_date TIMESTAMP NOT NULL,
            event_end_date TIMESTAMP,
            venue_name VARCHAR(255) NOT NULL,
            venue_address TEXT,
            city VARCHAR(100) NOT NULL,
            maps_link TEXT,
            status VARCHAR(20) DEFAULT 'draft'
                CHECK (status IN ('draft', 'pending', 'published', 'cancelled', 'completed')),
            is_featured BOOLEAN DEFAULT FALSE,
            views_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            deleted_at TIMESTAMP,
            deleted_by INT REFERENCES users(id)
        )`
    },
    // event.is_deleted is used everywhere in event.repository.ts (and by
    // most admin controllers/reports) but was missing from the original
    // source migration entirely (unlike event_ticket/event_organizer,
    // which did get it) — defensive ALTER for the DB this already ran
    // against once without these columns.
    {
        query: `ALTER TABLE event ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE`
    },
    {
        query: `ALTER TABLE event ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`
    },
    {
        query: `ALTER TABLE event ADD COLUMN IF NOT EXISTS deleted_by INT REFERENCES users(id)`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS event_ticket_type (
            id SERIAL PRIMARY KEY,
            event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            price INT NOT NULL,
            quantity INT NOT NULL,
            sold INT DEFAULT 0,
            sale_start TIMESTAMP,
            sale_end TIMESTAMP,
            max_per_order INT DEFAULT 10,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(event_id, name)
        )`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS event_ticket (
            id SERIAL PRIMARY KEY,
            reference VARCHAR(20) UNIQUE,
            event_id INT NOT NULL REFERENCES event(id),
            ticket_type_id INT NOT NULL REFERENCES event_ticket_type(id),
            customer_id INT NOT NULL REFERENCES ${tbl.kCustomer}(id),
            quantity INT NOT NULL DEFAULT 1,
            unit_price INT NOT NULL,
            total_price INT NOT NULL,
            payment_method VARCHAR(20),
            payment_status VARCHAR(20) DEFAULT 'pending'
                CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
            payment_ref VARCHAR(100),
            qr_code VARCHAR(255),
            status VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'used', 'cancelled', 'expired')),
            used_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            deleted_at TIMESTAMP,
            deleted_by INT REFERENCES users(id)
        )`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS event_favorite (
            id SERIAL PRIMARY KEY,
            customer_id INT NOT NULL REFERENCES ${tbl.kCustomer}(id) ON DELETE CASCADE,
            event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(customer_id, event_id)
        )`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS event_review (
            id SERIAL PRIMARY KEY,
            event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
            customer_id INT NOT NULL REFERENCES ${tbl.kCustomer}(id),
            rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            is_approved BOOLEAN DEFAULT TRUE,
            is_flagged BOOLEAN DEFAULT FALSE,
            flag_reason TEXT,
            flagged_by INT REFERENCES ${tbl.kCustomer}(id),
            flagged_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            deleted_at TIMESTAMP,
            deleted_by INT REFERENCES users(id),
            UNIQUE(event_id, customer_id)
        )`
    },
    // admin-reviews.controller.ts uses is_flagged/flag_reason/flagged_by/
    // flagged_at and is_deleted — none of which were in the original
    // source migration (which only had is_approved). Defensive ALTERs for
    // the DB this already ran against once without them.
    {
        query: `ALTER TABLE event_review ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE`
    },
    {
        query: `ALTER TABLE event_review ADD COLUMN IF NOT EXISTS flag_reason TEXT`
    },
    {
        query: `ALTER TABLE event_review ADD COLUMN IF NOT EXISTS flagged_by INT REFERENCES ${tbl.kCustomer}(id)`
    },
    {
        query: `ALTER TABLE event_review ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP`
    },
    {
        query: `ALTER TABLE event_review ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE`
    },
    {
        query: `ALTER TABLE event_review ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`
    },
    {
        query: `ALTER TABLE event_review ADD COLUMN IF NOT EXISTS deleted_by INT REFERENCES users(id)`
    },
    {
        query: `
            CREATE INDEX IF NOT EXISTS idx_event_category ON event(category_id);
            CREATE INDEX IF NOT EXISTS idx_event_organizer ON event(organizer_id);
            CREATE INDEX IF NOT EXISTS idx_event_status ON event(status);
            CREATE INDEX IF NOT EXISTS idx_event_date ON event(event_date);
            CREATE INDEX IF NOT EXISTS idx_event_city ON event(city);
            CREATE INDEX IF NOT EXISTS idx_event_featured ON event(is_featured) WHERE is_featured = TRUE;
            CREATE INDEX IF NOT EXISTS idx_ticket_type_event ON event_ticket_type(event_id);
            CREATE INDEX IF NOT EXISTS idx_ticket_event ON event_ticket(event_id);
            CREATE INDEX IF NOT EXISTS idx_ticket_customer ON event_ticket(customer_id);
            CREATE INDEX IF NOT EXISTS idx_ticket_status ON event_ticket(status);
            CREATE INDEX IF NOT EXISTS idx_ticket_reference ON event_ticket(reference);
            CREATE INDEX IF NOT EXISTS idx_favorite_customer ON event_favorite(customer_id);
            CREATE INDEX IF NOT EXISTS idx_favorite_event ON event_favorite(event_id);
            CREATE INDEX IF NOT EXISTS idx_review_event ON event_review(event_id);
        `
    },
    // Auto-generated event code / ticket reference — application code
    // (event.repository.ts, event-ticket-purchase.repository.ts) never sets
    // these itself, it relies on these DB triggers.
    {
        query: `
            DROP FUNCTION IF EXISTS generate_event_code() CASCADE;
            CREATE FUNCTION generate_event_code()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.code IS NULL THEN
                    NEW.code := 'EVT-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(NEW.id::TEXT, 5, '0');
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP FUNCTION IF EXISTS generate_ticket_reference() CASCADE;
            CREATE FUNCTION generate_ticket_reference()
            RETURNS TRIGGER AS $$
            BEGIN
                IF NEW.reference IS NULL THEN
                    NEW.reference := 'TKT-' || LPAD(NEW.id::TEXT, 8, '0');
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `
    },
    {
        query: `
            DROP TRIGGER IF EXISTS trg_event_code ON event;
            CREATE TRIGGER trg_event_code
                BEFORE INSERT ON event
                FOR EACH ROW EXECUTE FUNCTION generate_event_code();

            DROP TRIGGER IF EXISTS trg_ticket_reference ON event_ticket;
            CREATE TRIGGER trg_ticket_reference
                BEFORE INSERT ON event_ticket
                FOR EACH ROW EXECUTE FUNCTION generate_ticket_reference();

            DROP TRIGGER IF EXISTS trg_event_updated ON event;
            CREATE TRIGGER trg_event_updated
                BEFORE UPDATE ON event
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

            DROP TRIGGER IF EXISTS trg_organizer_updated ON event_organizer;
            CREATE TRIGGER trg_organizer_updated
                BEFORE UPDATE ON event_organizer
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

            DROP TRIGGER IF EXISTS trg_review_updated ON event_review;
            CREATE TRIGGER trg_review_updated
                BEFORE UPDATE ON event_review
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `
    },

    // Default event categories (also only ever a loose, never-run seed file
    // — src/migrations/ticketing/002_seed_categories.sql). Without these,
    // creating an event is impossible (event.category_id is NOT NULL).
    {
        query: `
            INSERT INTO event_category (name, name_fr, name_en, icon, color, display_order) VALUES
            ('music', 'Musique', 'Music', 'music_note', '#E91E63', 1),
            ('concert', 'Concert', 'Concert', 'mic', '#9C27B0', 2),
            ('festival', 'Festival', 'Festival', 'celebration', '#673AB7', 3),
            ('sport', 'Sport', 'Sport', 'sports_soccer', '#4CAF50', 4),
            ('theater', 'Théâtre', 'Theater', 'theater_comedy', '#FF9800', 5),
            ('cinema', 'Cinéma', 'Cinema', 'movie', '#795548', 6),
            ('comedy', 'Humour', 'Comedy', 'sentiment_very_satisfied', '#FFC107', 7),
            ('conference', 'Conférence', 'Conference', 'groups', '#607D8B', 8),
            ('workshop', 'Atelier', 'Workshop', 'build', '#00BCD4', 9),
            ('exhibition', 'Exposition', 'Exhibition', 'palette', '#3F51B5', 10),
            ('party', 'Soirée', 'Party', 'nightlife', '#F44336', 11),
            ('networking', 'Networking', 'Networking', 'handshake', '#009688', 12),
            ('religious', 'Religieux', 'Religious', 'church', '#8D6E63', 13),
            ('charity', 'Caritatif', 'Charity', 'volunteer_activism', '#E91E63', 14),
            ('food', 'Gastronomie', 'Food & Drinks', 'restaurant', '#FF5722', 15),
            ('kids', 'Enfants', 'Kids', 'child_care', '#CDDC39', 16),
            ('education', 'Éducation', 'Education', 'school', '#2196F3', 17),
            ('business', 'Business', 'Business', 'business_center', '#455A64', 18),
            ('health', 'Santé', 'Health & Wellness', 'favorite', '#4CAF50', 19),
            ('other', 'Autre', 'Other', 'category', '#9E9E9E', 20)
            ON CONFLICT (name) DO NOTHING
        `
    },

    // Ticketing — customer wallet balances (distinct from wallet_balance on
    // customer itself, and from wallet_transaction — this is the table
    // admin-users/admin-transactions actually join against).
    {
        query: `CREATE TABLE IF NOT EXISTS wallet (
            id SERIAL PRIMARY KEY,
            customer_id INT UNIQUE NOT NULL REFERENCES ${tbl.kCustomer}(id) ON DELETE CASCADE,
            balance INT DEFAULT 0 NOT NULL CHECK (balance >= 0),
            transaction_count INT DEFAULT 0,
            total_credits INT DEFAULT 0,
            total_debits INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP
        )`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_wallet_customer ON wallet(customer_id)`
    },
    {
        query: `
            DROP TRIGGER IF EXISTS trg_wallet_updated ON wallet;
            CREATE TRIGGER trg_wallet_updated
                BEFORE UPDATE ON wallet
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        `
    },
    {
        query: `
            INSERT INTO wallet (customer_id, balance)
            SELECT id, 0 FROM ${tbl.kCustomer}
            WHERE NOT EXISTS (SELECT 1 FROM wallet WHERE wallet.customer_id = ${tbl.kCustomer}.id)
            ON CONFLICT (customer_id) DO NOTHING
        `
    },

    // role/is_active on customer — added here (not in the base CREATE
    // TABLE above) because AdminUsersController needs them but nothing
    // else does; same missing-migration story as the rest of this block.
    {
        query: `ALTER TABLE ${tbl.kCustomer} ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'customer'`
    },
    {
        query: `ALTER TABLE ${tbl.kCustomer} ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`
    },

    // Ticketing — Marketplace (ticket resale, 10% commission). Same missing
    // migration story (src/migrations/create_resale_table.sql, never run
    // automatically) — this is why "Marketplace" 500'd. Ported without its
    // original commission-auto-calc trigger (that file depended on a
    // migration_exists()/record_migration() framework that isn't wired up
    // either) and with its FK corrected: the source migration referenced
    // `event_ticket_purchase(id)`, a table that has never existed here —
    // the real ticket table is `event_ticket` (event-ticket-purchase.repository.ts
    // TABLE = 'event_ticket'). event-ticket-resale.repository.ts and
    // event-review.repository.ts still query `event_ticket_purchase`
    // themselves and will 500 until that's fixed too — flagged, not fixed
    // here (out of scope: fixing the missing table, not repository bugs).
    {
        query: `CREATE TABLE IF NOT EXISTS event_ticket_resale (
            id SERIAL PRIMARY KEY,
            resale_code VARCHAR(20) UNIQUE,
            ticket_purchase_id INT NOT NULL REFERENCES event_ticket(id),
            event_id INT NOT NULL REFERENCES event(id),
            ticket_type_id INT NOT NULL REFERENCES event_ticket_type(id),
            seller_id INT NOT NULL REFERENCES ${tbl.kCustomer}(id),
            original_price INT NOT NULL,
            resale_price INT NOT NULL,
            commission_rate DECIMAL(5,2) DEFAULT 10.00,
            commission_amount INT,
            seller_receives INT,
            buyer_id INT REFERENCES ${tbl.kCustomer}(id),
            status VARCHAR(20) DEFAULT 'listed'
                CHECK (status IN ('listed', 'sold', 'cancelled', 'expired', 'removed')),
            payment_method VARCHAR(20)
                CHECK (payment_method IN ('orangeMoney', 'mtn_momo', 'mtn', 'cash', 'wallet')),
            payment_status VARCHAR(20) DEFAULT 'pending'
                CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
            payment_reference VARCHAR(100),
            wallet_transaction_id INT REFERENCES wallet_transaction(id),
            listing_description TEXT,
            reason_for_sale VARCHAR(255),
            listed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sold_at TIMESTAMP,
            cancelled_at TIMESTAMP,
            cancellation_reason TEXT,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            is_deleted BOOLEAN DEFAULT FALSE,
            deleted_at TIMESTAMP,
            deleted_by INT REFERENCES users(id),
            created_by INT REFERENCES ${tbl.kCustomer}(id)
        )`
    },
    {
        query: `
            CREATE INDEX IF NOT EXISTS idx_resale_seller ON event_ticket_resale(seller_id) WHERE is_deleted = FALSE;
            CREATE INDEX IF NOT EXISTS idx_resale_buyer ON event_ticket_resale(buyer_id) WHERE is_deleted = FALSE;
            CREATE INDEX IF NOT EXISTS idx_resale_event ON event_ticket_resale(event_id) WHERE is_deleted = FALSE;
            CREATE INDEX IF NOT EXISTS idx_resale_status ON event_ticket_resale(status) WHERE is_deleted = FALSE;
            CREATE INDEX IF NOT EXISTS idx_resale_ticket_purchase ON event_ticket_resale(ticket_purchase_id);
        `
    },

    // Ticketing admin — Promo Codes & Logs. AdminPromoController and
    // AdminLogsController (src/ticketing/controllers/admin-*.ts) were fully
    // wired end to end (routes, desktop screens) but their tables were
    // never created anywhere — every request 500'd with
    // `relation "promo_code"/"activity_log" does not exist`. Same treatment
    // as payment_transaction/vtc_* above: defined here so they always exist.
    // Nothing writes to activity_log yet (no audit-log call sites found) —
    // this only stops the crash; the screen will show empty until a writer
    // is added.
    {
        query: `CREATE TABLE IF NOT EXISTS promo_code (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
            discount_value INT NOT NULL,
            max_uses INT,
            uses_count INT NOT NULL DEFAULT 0,
            min_purchase_amount INT DEFAULT 0,
            valid_from TIMESTAMP,
            valid_until TIMESTAMP,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_by INT REFERENCES ${tbl.kCustomer}(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            deleted_at TIMESTAMP,
            deleted_by INT REFERENCES ${tbl.kCustomer}(id)
        )`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS activity_log (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES ${tbl.kCustomer}(id),
            action_type VARCHAR(50) NOT NULL,
            entity_type VARCHAR(50),
            entity_id INT,
            description TEXT,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id)`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id)`
    },

    // VTC module — previously only in src/migrations/001_create_vtc_tables.sql,
    // which is never run automatically. Ported here so these tables always
    // exist, same treatment as payment_transaction above.
    {
        query: `CREATE TABLE IF NOT EXISTS vtc_drivers (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES ${tbl.kCustomer}(id),
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            email VARCHAR(255),
            photo TEXT,
            license_number VARCHAR(50) NOT NULL UNIQUE,
            license_expiry DATE NOT NULL,
            vehicle_type VARCHAR(50) NOT NULL CHECK (vehicle_type IN ('economy', 'comfort', 'premium')),
            vehicle_brand VARCHAR(50),
            vehicle_model VARCHAR(50),
            vehicle_year INTEGER,
            vehicle_color VARCHAR(30),
            license_plate VARCHAR(20) NOT NULL UNIQUE,
            seats INTEGER DEFAULT 4,
            insurance_number VARCHAR(50),
            insurance_expiry DATE,
            registration_document TEXT,
            vehicle_photos TEXT[],
            rating DECIMAL(3,2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
            total_rides INTEGER DEFAULT 0,
            status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'suspended')),
            current_latitude DECIMAL(10,8),
            current_longitude DECIMAL(11,8),
            last_location_update TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_vtc_drivers_status ON vtc_drivers(status)`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_vtc_drivers_location ON vtc_drivers(current_latitude, current_longitude)`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS vtc_rides (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES ${tbl.kCustomer}(id) NOT NULL,
            driver_id INTEGER REFERENCES vtc_drivers(id),
            vehicle_type VARCHAR(50) NOT NULL,
            pickup_address TEXT NOT NULL,
            pickup_latitude DECIMAL(10,8) NOT NULL,
            pickup_longitude DECIMAL(11,8) NOT NULL,
            pickup_time TIMESTAMP,
            dropoff_address TEXT NOT NULL,
            dropoff_latitude DECIMAL(10,8) NOT NULL,
            dropoff_longitude DECIMAL(11,8) NOT NULL,
            dropoff_time TIMESTAMP,
            base_fare DECIMAL(10,2) NOT NULL,
            distance_fare DECIMAL(10,2) DEFAULT 0,
            time_fare DECIMAL(10,2) DEFAULT 0,
            surge_multiplier DECIMAL(3,2) DEFAULT 1.0,
            total_fare DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'requested' CHECK (
                status IN ('requested', 'accepted', 'arrived', 'started', 'completed', 'cancelled')
            ),
            cancellation_reason TEXT,
            cancelled_by VARCHAR(20) CHECK (cancelled_by IN ('customer', 'driver', 'system')),
            customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
            driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5),
            customer_feedback TEXT,
            driver_feedback TEXT,
            payment_method VARCHAR(50) NOT NULL,
            payment_status VARCHAR(20) DEFAULT 'pending' CHECK (
                payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')
            ),
            estimated_distance DECIMAL(10,2),
            actual_distance DECIMAL(10,2),
            estimated_duration INTEGER,
            actual_duration INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_vtc_rides_customer ON vtc_rides(customer_id)`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_vtc_rides_driver ON vtc_rides(driver_id)`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_vtc_rides_status ON vtc_rides(status)`
    },
    {
        query: `CREATE TABLE IF NOT EXISTS vtc_ride_tracking (
            id SERIAL PRIMARY KEY,
            ride_id INTEGER REFERENCES vtc_rides(id) NOT NULL,
            latitude DECIMAL(10,8) NOT NULL,
            longitude DECIMAL(11,8) NOT NULL,
            heading DECIMAL(5,2),
            speed DECIMAL(5,2),
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    },
    {
        query: `CREATE INDEX IF NOT EXISTS idx_vtc_tracking_ride ON vtc_ride_tracking(ride_id)`
    }

]

export default async function createTables() {
    try {
        for (const tableQuery of tableQueries) {
            await pgNone(tableQuery.query, tableQuery.arguments);
        }
        accessRightsRepository.setUpAccessRights(); // Set up access rights after creating tables
        console.log("Tables created successfully");
    } catch (exception) {
        console.error(exception)
    }

}   
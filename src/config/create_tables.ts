

import * as tbl from "../utils/table_names";
import { kProfile } from "../utils/table_names";
import pgpDb from "./pgdb";
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
    }

]

export default async function createTables() {
    try {
        for (const tableQuery of tableQueries) {
            await pgpDb.none(tableQuery.query, tableQuery.arguments);
        }
        accessRightsRepository.setUpAccessRights(); // Set up access rights after creating tables
        console.log("Tables created successfully");
    } catch (exception) {
        console.error(exception)
    }

}   
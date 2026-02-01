"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratedTripSeatRepository = void 0;
// ============================================
// REPOSITORY - generated-trip-seat.repository.ts
// ============================================
const pgdb_1 = __importDefault(require("../config/pgdb"));
const table_names_1 = require("../utils/table_names");
class GeneratedTripSeatRepository {
    // Find seat by ID
    static async findById(id) {
        try {
            const seat = await pgdb_1.default.oneOrNone(`SELECT ${this.BASE_SELECT}
                 ${this.BASE_JOINS}
                 WHERE gts.id = $1`, [id]);
            if (!seat) {
                return { status: false, message: "Siège non trouvé | No seat FOUND", code: 404 };
            }
            return { status: true, message: "Siège trouvé", body: seat, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche du siège", code: 500 };
        }
    }
    // Find all seats for a generated trip
    static async findByGeneratedTrip(generatedTripId) {
        try {
            const seats = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT},
                        ${this.BUS_SELECT}
                 ${this.BASE_JOINS}
                 INNER JOIN ${table_names_1.kGeneratedTrip} gt ON gt.id = gts.generated_trip_id
                 LEFT JOIN ${table_names_1.kBus} bs ON bs.id = gt.bus_id
                 WHERE gts.generated_trip_id = $1
                 ORDER BY gts.id ASC`, [generatedTripId]);
            return { status: true, message: "Sièges du voyage généré récupérés", body: seats, code: 200 };
        }
        catch (error) {
            console.log(`Error ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la récupération des sièges", code: 500 };
        }
    }
    // Find by seat status (available, reserved, booked, blocked)
    static async findByStatus(generatedTripId, status) {
        try {
            const seats = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT},
                        ${this.BUS_SELECT}
                 ${this.BASE_JOINS}
                 INNER JOIN ${table_names_1.kGeneratedTrip} gt ON gt.id = gts.generated_trip_id
                 LEFT JOIN ${table_names_1.kBus} bs ON bs.id = gt.bus_id
                 WHERE gts.generated_trip_id = $1 AND gts.status = $2
                 ORDER BY gts.id ASC`, [generatedTripId, status]);
            return { status: true, message: "Sièges récupérés par statut", body: seats, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges par statut", code: 500 };
        }
    }
    // Count available seats
    static async countAvailable(generatedTripId) {
        try {
            const result = await pgdb_1.default.one(`SELECT COUNT(*)::int as available_count 
                 FROM ${table_names_1.kGeneratedTripSeat} gts
                 WHERE gts.generated_trip_id = $1 AND gts.status = 'available'`, [generatedTripId]);
            return { status: true, message: "Nombre de sièges disponibles récupéré", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors du comptage des sièges disponibles", code: 500 };
        }
    }
    // Find all with seat details (join with seat + bus)
    static async findWithDetails(generatedTripId) {
        try {
            console.log(`Fetching details for generated trip ID: ${generatedTripId}`);
            const seats = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT},
                        ${this.BUS_SELECT}
                 ${this.BASE_JOINS}
                 INNER JOIN ${table_names_1.kGeneratedTrip} gt ON gt.id = gts.generated_trip_id
                 LEFT JOIN ${table_names_1.kBus} bs ON bs.id = gt.bus_id
                 WHERE gts.generated_trip_id = $1
                 ORDER BY s.row_number, s.column_position`, [generatedTripId]);
            return { status: true, message: "Détails des sièges récupérés", body: seats, code: 200 };
        }
        catch (error) {
            console.log(`Error ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la récupération des détails des sièges", code: 500 };
        }
    }
    // Find available seats with details
    static async findAvailableWithDetails(generatedTripId) {
        try {
            const seats = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT},
                        ${this.BUS_SELECT}
                 ${this.BASE_JOINS}
                 INNER JOIN ${table_names_1.kGeneratedTrip} gt ON gt.id = gts.generated_trip_id
                 LEFT JOIN ${table_names_1.kBus} bs ON bs.id = gt.bus_id
                 WHERE gts.generated_trip_id = $1 AND gts.status = 'available'
                 ORDER BY s.row_number, s.column_position`, [generatedTripId]);
            return { status: true, message: "Sièges disponibles récupérés", body: seats, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges disponibles", code: 500 };
        }
    }
    // Find booked seats with details
    static async findBookedWithDetails(generatedTripId) {
        try {
            const seats = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT},
                        ${this.BUS_SELECT}
                 ${this.BASE_JOINS}
                 INNER JOIN ${table_names_1.kGeneratedTrip} gt ON gt.id = gts.generated_trip_id
                 LEFT JOIN ${table_names_1.kBus} bs ON bs.id = gt.bus_id
                 WHERE gts.generated_trip_id = $1 AND gts.status = 'booked'
                 ORDER BY s.row_number, s.column_position`, [generatedTripId]);
            return { status: true, message: "Sièges réservés récupérés", body: seats, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges réservés", code: 500 };
        }
    }
}
exports.GeneratedTripSeatRepository = GeneratedTripSeatRepository;
// Constantes pour les sélections réutilisables
GeneratedTripSeatRepository.SEAT_SELECT = `
        json_build_object(
            'id', s.id,
            'bus_id', s.bus_id,
            'seat_number', s.seat_number,
            'row_number', s.row_number,
            'column_position', s.column_position,
            'seat_type', s.seat_type,
            'is_active', s.is_active
        ) AS seat
    `;
GeneratedTripSeatRepository.BUS_SELECT = `
        json_build_object(
            'id', bs.id,
            'registration_number', bs.registration_number,
            'capacity', bs.capacity,
            'type', bs.type,
            'amenities', bs.amenities,
            'seat_layout', bs.seat_layout,
            'has_toilet', bs.has_toilet,
            'is_active', bs.is_active,
            'agency_id', bs.agency_id,
            'is_deleted', bs.is_deleted,
            'deleted_at', bs.deleted_at,
            'deleted_by', bs.deleted_by,
            'created_by', bs.created_by
        ) AS bus
    `;
GeneratedTripSeatRepository.BASE_SELECT = `
        gts.id,
        gts.generated_trip_id,
        gts.seat_id,
        gts.status,
        gts.price_adjustment::int AS price_adjustment,
        gts.blocked_reason,
        gts.blocked_until,
        gts.created_at,
        gts.updated_at,
        ${GeneratedTripSeatRepository.SEAT_SELECT}
    `;
GeneratedTripSeatRepository.BASE_JOINS = `
        FROM ${table_names_1.kGeneratedTripSeat} gts
        LEFT JOIN ${table_names_1.kSeat} s ON gts.seat_id = s.id
    `;

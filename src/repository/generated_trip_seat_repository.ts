// ============================================
// REPOSITORY - generated-trip-seat.repository.ts
// ============================================
// Migrated from pg-promise to Prisma (raw queries via the pg-promise-shaped
// shim in ../utils/prisma-compat.ts) — see BOOKING_MODULE_NOTES.md.
import { pgOne, pgOneOrNone, pgAny } from "../utils/prisma-compat";
import ResponseModel from "../models/response.model";
import { kBooking, kBus, kGeneratedTrip, kGeneratedTripSeat, kSeat } from "../utils/table_names";

export class GeneratedTripSeatRepository {
    // Constantes pour les sélections réutilisables
    private static readonly SEAT_SELECT = `
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

    private static readonly BUS_SELECT = `
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

    // gts.status is only ever hand-written (blocked/maintenance seats) —
    // nothing updates it when a booking is created or cancelled, so it
    // silently goes stale the moment a real booking happens. The `booking`
    // table is the actual source of truth (BookingRepository.checkSeatAvailability
    // already queries it, not this column) — derive the seat's live status
    // from it here instead of trusting gts.status for available/reserved/booked.
    private static readonly LIVE_STATUS = `
        CASE
            WHEN bk.status = 'confirmed' THEN 'booked'
            WHEN bk.status = 'pending' THEN 'reserved'
            ELSE gts.status
        END AS status
    `;

    private static readonly BASE_SELECT = `
        gts.id,
        gts.generated_trip_id,
        gts.seat_id,
        ${GeneratedTripSeatRepository.LIVE_STATUS},
        gts.price_adjustment::int AS price_adjustment,
        gts.blocked_reason,
        gts.blocked_until,
        gts.created_at,
        gts.updated_at,
        ${GeneratedTripSeatRepository.SEAT_SELECT}
    `;

    private static readonly BASE_JOINS = `
        FROM ${kGeneratedTripSeat} gts
        LEFT JOIN ${kSeat} s ON gts.seat_id = s.id
        LEFT JOIN ${kBooking} bk ON bk.generated_trip_id = gts.generated_trip_id
            AND bk.generated_trip_seat_id = gts.id
            AND bk.status IN ('confirmed', 'pending')
            AND bk.is_deleted = FALSE
    `;

    // Find seat by ID
    static async findById(id: number): Promise<ResponseModel> {
        try {
            const seat = await pgOneOrNone(
                `SELECT ${this.BASE_SELECT}
                 ${this.BASE_JOINS}
                 WHERE gts.id = $1`,
                [id]
            );

            if (!seat) {
                return { status: false, message: "Siège non trouvé | No seat FOUND", code: 404 };
            }

            return { status: true, message: "Siège trouvé", body: seat, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche du siège", code: 500 };
        }
    }

    // Find all seats for a generated trip
    static async findByGeneratedTrip(generatedTripId: number): Promise<ResponseModel> {
        try {
            const seats = await pgAny(
                `SELECT ${this.BASE_SELECT},
                        ${this.BUS_SELECT}
                 ${this.BASE_JOINS}
                 INNER JOIN ${kGeneratedTrip} gt ON gt.id = gts.generated_trip_id
                 LEFT JOIN ${kBus} bs ON bs.id = gt.bus_id
                 WHERE gts.generated_trip_id = $1
                 ORDER BY gts.id ASC`,
                [generatedTripId]
            );

            return { status: true, message: "Sièges du voyage généré récupérés", body: seats, code: 200 };
        } catch (error) {
            console.log(`Error ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la récupération des sièges", code: 500 };
        }
    }

    // Find by seat status (available, reserved, booked, blocked) — filters
    // on the same live-derived status BASE_SELECT exposes, not the stale column.
    static async findByStatus(generatedTripId: number, status: string): Promise<ResponseModel> {
        try {
            const seats = await pgAny(
                `SELECT ${this.BASE_SELECT},
                        ${this.BUS_SELECT}
                 ${this.BASE_JOINS}
                 INNER JOIN ${kGeneratedTrip} gt ON gt.id = gts.generated_trip_id
                 LEFT JOIN ${kBus} bs ON bs.id = gt.bus_id
                 WHERE gts.generated_trip_id = $1
                   AND (CASE WHEN bk.status = 'confirmed' THEN 'booked'
                             WHEN bk.status = 'pending' THEN 'reserved'
                             ELSE gts.status END) = $2
                 ORDER BY gts.id ASC`,
                [generatedTripId, status]
            );

            return { status: true, message: "Sièges récupérés par statut", body: seats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges par statut", code: 500 };
        }
    }

    // Count available seats — a seat only counts as available if it isn't
    // blocked/maintenance (gts.status) AND has no active (confirmed or
    // pending) booking against it.
    static async countAvailable(generatedTripId: number): Promise<ResponseModel> {
        try {
            const result = await pgOne(
                `SELECT COUNT(*)::int as available_count
                 FROM ${kGeneratedTripSeat} gts
                 LEFT JOIN ${kBooking} bk ON bk.generated_trip_id = gts.generated_trip_id
                     AND bk.generated_trip_seat_id = gts.id
                     AND bk.status IN ('confirmed', 'pending')
                     AND bk.is_deleted = FALSE
                 WHERE gts.generated_trip_id = $1 AND gts.status = 'available' AND bk.id IS NULL`,
                [generatedTripId]
            );

            return { status: true, message: "Nombre de sièges disponibles récupéré", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors du comptage des sièges disponibles", code: 500 };
        }
    }

    // Find all with seat details (join with seat + bus)
    static async findWithDetails(generatedTripId: number): Promise<ResponseModel> {
        try {
            console.log(`Fetching details for generated trip ID: ${generatedTripId}`);
            const seats = await pgAny(
                `SELECT ${this.BASE_SELECT},
                        ${this.BUS_SELECT}
                 ${this.BASE_JOINS}
                 INNER JOIN ${kGeneratedTrip} gt ON gt.id = gts.generated_trip_id
                 LEFT JOIN ${kBus} bs ON bs.id = gt.bus_id
                 WHERE gts.generated_trip_id = $1
                 ORDER BY s.row_number, s.column_position`,
                [generatedTripId]
            );

            return { status: true, message: "Détails des sièges récupérés", body: seats, code: 200 };
        } catch (error) {
            console.log(`Error ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la récupération des détails des sièges", code: 500 };
        }
    }

    // Find available seats with details
    static async findAvailableWithDetails(generatedTripId: number): Promise<ResponseModel> {
        try {
            const seats = await pgAny(
                `SELECT ${this.BASE_SELECT},
                        ${this.BUS_SELECT}
                 ${this.BASE_JOINS}
                 INNER JOIN ${kGeneratedTrip} gt ON gt.id = gts.generated_trip_id
                 LEFT JOIN ${kBus} bs ON bs.id = gt.bus_id
                 WHERE gts.generated_trip_id = $1 AND gts.status = 'available' AND bk.id IS NULL
                 ORDER BY s.row_number, s.column_position`,
                [generatedTripId]
            );

            return { status: true, message: "Sièges disponibles récupérés", body: seats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges disponibles", code: 500 };
        }
    }

    // Find booked seats with details
    static async findBookedWithDetails(generatedTripId: number): Promise<ResponseModel> {
        try {
            const seats = await pgAny(
                `SELECT ${this.BASE_SELECT},
                        ${this.BUS_SELECT}
                 ${this.BASE_JOINS}
                 INNER JOIN ${kGeneratedTrip} gt ON gt.id = gts.generated_trip_id
                 LEFT JOIN ${kBus} bs ON bs.id = gt.bus_id
                 WHERE gts.generated_trip_id = $1 AND bk.status = 'confirmed'
                 ORDER BY s.row_number, s.column_position`,
                [generatedTripId]
            );

            return { status: true, message: "Sièges réservés récupérés", body: seats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges réservés", code: 500 };
        }
    }
}
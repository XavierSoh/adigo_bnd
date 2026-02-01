// ============================================
// 2. REPOSITORY - generated-trip.repository.ts
// ============================================
import pgpDb from "../config/pgdb";
import { GeneratedTripModel } from "../models/generated_trip.model";
import ResponseModel from "../models/response.model";
import { kGeneratedTrip, kTrip, kStaff, kBus, kBooking, kAgency } from "../utils/table_names";

export class GeneratedTripRepository {
    // Constantes pour les sélections réutilisables
    private static readonly BUS_SELECT = `
        json_build_object(
            'id', b.id,
            'registration_number', b.registration_number,
            'capacity', b.capacity,
            'type', b.type,
            'amenities', b.amenities,
            'seat_layout', b.seat_layout,
            'has_toilet', b.has_toilet,
            'is_active', b.is_active,
            'agency_id', b.agency_id,
            'is_deleted', b.is_deleted,
            'deleted_at', b.deleted_at,
            'deleted_by', b.deleted_by,
            'created_by', b.created_by
        ) AS bus
    `;

    private static readonly BASE_SELECT = `
        gt.*,
        ${GeneratedTripRepository.BUS_SELECT}
    `;

    // Create new generated trip
    static async create(generatedTrip: GeneratedTripModel): Promise<ResponseModel> {
        try {
            const result = await pgpDb.one(
                `INSERT INTO ${kGeneratedTrip} (
                    trip_id, original_departure_time, actual_departure_time,
                    actual_arrival_time, available_seats, status, driver_id,
                    conductor_id, bus_id, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *`,
                [
                    generatedTrip.trip_id,
                    generatedTrip.original_departure_time,
                    generatedTrip.actual_departure_time,
                    generatedTrip.actual_arrival_time,
                    generatedTrip.available_seats,
                    generatedTrip.status ?? 'scheduled',
                    generatedTrip.driver_id,
                    generatedTrip.conductor_id,
                    generatedTrip.bus_id,
                    generatedTrip.notes
                ]
            );

            return { status: true, message: "Voyage généré créé", body: result, code: 201 };
        } catch (error: any) {
            if (error.code === '23505') { // Unique violation
                return { status: false, message: "Ce voyage existe déjà pour cette date/heure", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création du voyage généré", code: 500 };
        }
    }

    // Find by ID
    static async findById(id: number): Promise<ResponseModel> {
        try {
            const generatedTrip = await pgpDb.oneOrNone(
                `SELECT 
                    ${this.BASE_SELECT}
                FROM ${kGeneratedTrip} gt 
                LEFT JOIN ${kBus} b ON gt.bus_id = b.id
                WHERE gt.id = $1`,
                [id]
            );

            if (!generatedTrip) {
                return { status: false, message: "Voyage généré non trouvé", code: 404 };
            }

            return { status: true, message: "Voyage généré trouvé", body: generatedTrip, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche du voyage généré", code: 500 };
        }
    }

    // Update generated trip
    static async update(id: number, generatedTrip: Partial<GeneratedTripModel>): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kGeneratedTrip} SET
                    trip_id = COALESCE($1, trip_id),
                    original_departure_time = COALESCE($2, original_departure_time),
                    actual_departure_time = COALESCE($3, actual_departure_time),
                    actual_arrival_time = COALESCE($4, actual_arrival_time),
                    available_seats = COALESCE($5, available_seats),
                    status = COALESCE($6, status),
                    driver_id = COALESCE($7, driver_id),
                    conductor_id = COALESCE($8, conductor_id),
                    bus_id = COALESCE($9, bus_id),
                    notes = COALESCE($10, notes),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $11
                RETURNING *`,
                [
                    generatedTrip.trip_id,
                    generatedTrip.original_departure_time,
                    generatedTrip.actual_departure_time,
                    generatedTrip.actual_arrival_time,
                    generatedTrip.available_seats,
                    generatedTrip.status,
                    generatedTrip.driver_id,
                    generatedTrip.conductor_id,
                    generatedTrip.bus_id,
                    generatedTrip.notes,
                    id
                ]
            );

            if (!result) {
                return { status: false, message: "Voyage généré non trouvé", code: 404 };
            }

            return { status: true, message: "Voyage généré mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour du voyage généré", code: 500 };
        }
    }

    // Delete generated trip
    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `DELETE FROM ${kGeneratedTrip} WHERE id = $1`,
                [id]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Voyage généré non trouvé", code: 404 };
            }

            return { status: true, message: "Voyage généré supprimé", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression du voyage généré", code: 500 };
        }
    }

    // Find all generated trips
    static async findAll(): Promise<ResponseModel> {
        try {
            const generatedTrips = await pgpDb.any(
                `SELECT 
                    ${this.BASE_SELECT}
                FROM ${kGeneratedTrip} gt
                LEFT JOIN ${kBus} b ON gt.bus_id = b.id
                ORDER BY gt.actual_departure_time DESC`
            );

            return { status: true, message: "Liste des voyages générés récupérée", body: generatedTrips, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des voyages générés", code: 500 };
        }
    }

    // Find by trip ID
    static async findByTrip(tripId: number): Promise<ResponseModel> {
        try {
            const generatedTrips = await pgpDb.any(
                `SELECT 
                    ${this.BASE_SELECT}
                FROM ${kGeneratedTrip} gt
                LEFT JOIN ${kBus} b ON gt.bus_id = b.id
                WHERE gt.trip_id = $1 
                ORDER BY gt.actual_departure_time DESC`,
                [tripId]
            );

            return { status: true, message: "Voyages générés récupérés", body: generatedTrips, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des voyages générés", code: 500 };
        }
    }

    // Find by status
    static async findByStatus(status: string): Promise<ResponseModel> {
        try {
            const generatedTrips = await pgpDb.any(
                `SELECT 
                    ${this.BASE_SELECT}
                FROM ${kGeneratedTrip} gt
                LEFT JOIN ${kBus} b ON gt.bus_id = b.id
                WHERE gt.status = $1 
                ORDER BY gt.actual_departure_time DESC`,
                [status]
            );

            return { status: true, message: "Voyages générés récupérés", body: generatedTrips, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des voyages générés", code: 500 };
        }
    }

    // Find by date range
    static async findByDateRange(startDate: Date, endDate: Date): Promise<ResponseModel> {
        try {
            const generatedTrips = await pgpDb.any(
                `SELECT
                    gt.*,
                    ${this.BUS_SELECT},
                    json_build_object(
                        'id', t.id,
                        'departure_city', t.departure_city,
                        'arrival_city', t.arrival_city,
                        'departure_time', t.departure_time,
                        'arrival_time', t.arrival_time,
                        'price', t.price::float,
                        'bus_id', t.bus_id,
                        'agency_id', t.agency_id,
                        'is_active', t.is_active,
                        'valid_from', t.valid_from,
                        'valid_until', t.valid_until,
                        'agency', json_build_object(
                            'id', a.id,
                            'name', a.name,
                            'logo', a.logo,
                            'phone', a.phone,
                            'email', a.email,
                            'address', a.address
                        )
                    ) as trip
                FROM ${kGeneratedTrip} gt
                LEFT JOIN ${kBus} b ON gt.bus_id = b.id
                INNER JOIN ${kTrip} t ON gt.trip_id = t.id
                LEFT JOIN ${kAgency} a ON t.agency_id = a.id
                WHERE gt.actual_departure_time >= $1 AND gt.actual_departure_time <= $2
                ORDER BY gt.actual_departure_time ASC`,
                [startDate, endDate]
            );

            return { status: true, message: "Voyages générés récupérés", body: generatedTrips, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des voyages générés", code: 500 };
        }
    }

    // Find with details (joins)
    static async findAllWithDetails(agencyId?: number): Promise<ResponseModel> {
        try {
            let query = `
                SELECT 
                    gt.*,
                    ${this.BUS_SELECT},
                    t.departure_city,
                    t.arrival_city,
                    t.price::int,
                    t.agency_id,
                    d.first_name as driver_first_name,
                    d.last_name as driver_last_name,
                    c.first_name as conductor_first_name,
                    c.last_name as conductor_last_name
                FROM ${kGeneratedTrip} gt
                INNER JOIN ${kTrip} t ON gt.trip_id = t.id
                LEFT JOIN ${kBus} b ON gt.bus_id = b.id
                LEFT JOIN ${kStaff} d ON gt.driver_id = d.id
                LEFT JOIN ${kStaff} c ON gt.conductor_id = c.id
                WHERE 1=1
            `;

            const params: any[] = [];

            if (agencyId) {
                query += ' AND t.agency_id = $1';
                params.push(agencyId);
            }

            query += ' ORDER BY gt.actual_departure_time DESC';

            const generatedTrips = await pgpDb.any(query, params);

            return { status: true, message: "Voyages générés avec détails récupérés", body: generatedTrips, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des voyages générés", code: 500 };
        }
    }

    // Update status
    static async updateStatus(id: number, status: string): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kGeneratedTrip} SET 
                    status = $1, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2 
                RETURNING *`,
                [status, id]
            );

            if (!result) {
                return { status: false, message: "Voyage généré non trouvé", code: 404 };
            }

            return { status: true, message: "Statut mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour du statut", code: 500 };
        }
    }

    // Get available seats count
    static async getAvailableSeatsCount(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.one(
                `SELECT available_seats FROM ${kGeneratedTrip} WHERE id = $1`,
                [id]
            );

            return { status: true, message: "Nombre de sièges disponibles récupéré", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges disponibles", code: 500 };
        }
    }

    // Update available seats
    static async updateAvailableSeats(id: number, availableSeats: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kGeneratedTrip} SET 
                    available_seats = $1,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2 
                RETURNING *`,
                [availableSeats, id]
            );

            if (!result) {
                return { status: false, message: "Voyage généré non trouvé", code: 404 };
            }

            return { status: true, message: "Sièges disponibles mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour des sièges disponibles", code: 500 };
        }
    }

    // Assign staff (driver/conductor)
    static async assignStaff(id: number, driverId?: number, conductorId?: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kGeneratedTrip} SET
                    driver_id = COALESCE($1, driver_id),
                    conductor_id = COALESCE($2, conductor_id),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *`,
                [driverId, conductorId, id]
            );

            if (!result) {
                return { status: false, message: "Voyage généré non trouvé", code: 404 };
            }

            return { status: true, message: "Personnel assigné", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de l'assignation du personnel", code: 500 };
        }
    }

    // Get statistics
    static async getStatistics(agencyId?: number): Promise<ResponseModel> {
        try {
            let query = `
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
                    SUM(CASE WHEN status = 'boarding' THEN 1 ELSE 0 END) as boarding,
                    SUM(CASE WHEN status = 'departed' THEN 1 ELSE 0 END) as departed,
                    SUM(CASE WHEN status = 'arrived' THEN 1 ELSE 0 END) as arrived,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                    SUM(available_seats) as total_available_seats
                FROM ${kGeneratedTrip} gt
            `;

            const params: any[] = [];

            if (agencyId) {
                query += `
                    INNER JOIN ${kTrip} t ON gt.trip_id = t.id
                    WHERE t.agency_id = $1
                `;
                params.push(agencyId);
            }

            const result = await pgpDb.one(query, params);

            return { status: true, message: "Statistiques récupérées", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques", code: 500 };
        }
    }

    // Get available cities (unique departure and arrival cities from trips)
    static async getAvailableCities(): Promise<ResponseModel> {
        try {
            const result = await pgpDb.any(
                `SELECT DISTINCT city
                FROM (
                    SELECT departure_city as city FROM ${kTrip} WHERE is_active = true
                    UNION
                    SELECT arrival_city as city FROM ${kTrip} WHERE is_active = true
                ) cities
                ORDER BY city ASC`
            );

            const cities = result.map(row => row.city);

            return { status: true, message: "Villes disponibles récupérées", body: cities, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des villes disponibles", code: 500 };
        }
    }
}
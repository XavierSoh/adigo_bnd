import pgpDb from "../config/pgdb";
import { TripModel, RecurrencePatternModel } from "../models/trip.model";
import ResponseModel from "../models/response.model";
import { kTrip, kRecurrencePattern, kBus } from "../utils/table_names";

export class TripRepository {
    static async create(trip: TripModel): Promise<ResponseModel> {
        const t = await pgpDb.tx(async (tx) => {
            try {
                let recurrencePatternId = null;
                
                // Create recurrence pattern if provided
                if (trip.recurrence_pattern) { 
                    const recurrenceResult = await tx.one(
                        `INSERT INTO ${kRecurrencePattern} (
                            type, interval, days_of_week, end_date, exceptions
                        ) VALUES ($1, $2, $3, $4, $5)
                        RETURNING id`,
                        [
                            trip.recurrence_pattern.type,
                            trip.recurrence_pattern.interval,
                            trip.recurrence_pattern.days_of_week ? JSON.stringify(trip.recurrence_pattern.days_of_week) : null,
                            trip.recurrence_pattern.end_date,
                            trip.recurrence_pattern.exceptions ? JSON.stringify(trip.recurrence_pattern.exceptions) : null
                        ]
                    );
                    recurrencePatternId = recurrenceResult.id;
                }

                // Create trip
                 trip.departure_time.setSeconds(0, 0);
                 trip.arrival_time.setSeconds(0, 0);
                const result = await tx.one(
                    `INSERT INTO ${kTrip} (
                        departure_city, arrival_city, departure_time, arrival_time,
                        price, bus_id, agency_id, is_active, cancellation_policy,
                        is_deleted, recurrence_pattern_id, valid_from, valid_until, created_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    RETURNING *`,
                    [
                        trip.departure_city,
                        trip.arrival_city,
                        trip.departure_time,
                        trip.arrival_time,
                        trip.price,
                        trip.bus_id,
                        trip.agency_id,
                        trip.is_active ?? true,
                        trip.cancellation_policy,
                        trip.is_deleted ?? false,
                        recurrencePatternId, 
                        trip.valid_from,
                        trip.valid_until,
                        trip.created_by
                    ]
                );

                return { status: true, message: 'Trip créé', body: result, code: 201 };
            } catch (error) {
                throw error;
            } 
        });

        return t;
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const trip = await pgpDb.oneOrNone(
                `SELECT t.*, 
                        rp.type as recurrence_type, 
                        rp.interval as recurrence_interval,
                        rp.days_of_week as recurrence_days_of_week,
                        rp.end_date as recurrence_end_date,
                        rp.exceptions as recurrence_exceptions
                 FROM ${kTrip} t
                 LEFT JOIN ${kRecurrencePattern} rp ON t.recurrence_pattern_id = rp.id
                 WHERE t.id = $1 AND t.is_deleted = FALSE`,
                [id]
            );
            
            if (!trip) {
                return { status: false, message: 'Trip non trouvé', code: 404 };
            }

            // Parse recurrence pattern if exists
            if (trip.recurrence_type) {
                trip.recurrence_pattern = {
                    type: trip.recurrence_type,
                    interval: trip.recurrence_interval,
                    days_of_week: trip.recurrence_days_of_week ? JSON.parse(trip.recurrence_days_of_week) : null,
                    end_date: trip.recurrence_end_date,
                    exceptions: trip.recurrence_exceptions ? JSON.parse(trip.recurrence_exceptions) : null
                };
            }

            // Clean up temporary fields
            delete trip.recurrence_type;
            delete trip.recurrence_interval;
            delete trip.recurrence_days_of_week;
            delete trip.recurrence_end_date;
            delete trip.recurrence_exceptions;

            return { status: true, message: 'Trip trouvé', body: trip, code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la recherche', code: 500 };
        }
    }

    static async update(id: number, trip: Partial<TripModel>): Promise<ResponseModel> {
        const t = await pgpDb.tx(async (tx) => {
            try {
                let recurrencePatternId = null;

                // Handle recurrence pattern update
                if (trip.recurrence_pattern) {
                    // First check if trip has existing recurrence pattern
                    const existingTrip = await tx.oneOrNone(
                        `SELECT recurrence_pattern_id FROM ${kTrip} WHERE id = $1`,
                        [id]
                    );

                    if (existingTrip?.recurrence_pattern_id) {
                        // Update existing pattern
                        await tx.none(
                            `UPDATE ${kRecurrencePattern} SET 
                                type = COALESCE($1, type),
                                interval = COALESCE($2, interval),
                                days_of_week = COALESCE($3, days_of_week),
                                end_date = COALESCE($4, end_date),
                                exceptions = COALESCE($5, exceptions)
                            WHERE id = $6`,
                            [
                                trip.recurrence_pattern.type,
                                trip.recurrence_pattern.interval,
                                trip.recurrence_pattern.days_of_week ? JSON.stringify(trip.recurrence_pattern.days_of_week) : null,
                                trip.recurrence_pattern.end_date,
                                trip.recurrence_pattern.exceptions ? JSON.stringify(trip.recurrence_pattern.exceptions) : null,
                                existingTrip.recurrence_pattern_id
                            ]
                        );
                        recurrencePatternId = existingTrip.recurrence_pattern_id;
                    } else {
                        // Create new pattern
                        const recurrenceResult = await tx.one(
                            `INSERT INTO ${kRecurrencePattern} (
                                type, interval, days_of_week, end_date, exceptions
                            ) VALUES ($1, $2, $3, $4, $5)
                            RETURNING id`,
                            [
                                trip.recurrence_pattern.type,
                                trip.recurrence_pattern.interval,
                                trip.recurrence_pattern.days_of_week ? JSON.stringify(trip.recurrence_pattern.days_of_week) : null,
                                trip.recurrence_pattern.end_date,
                                trip.recurrence_pattern.exceptions ? JSON.stringify(trip.recurrence_pattern.exceptions) : null
                            ]
                        );
                        recurrencePatternId = recurrenceResult.id;
                    }
                }

                // Update trip
                const result = await tx.oneOrNone(
                    `UPDATE ${kTrip} SET 
                        departure_city = COALESCE($1, departure_city),
                        arrival_city = COALESCE($2, arrival_city),
                        departure_time = COALESCE($3, departure_time),
                        arrival_time = COALESCE($4, arrival_time),
                        price = COALESCE($5, price),
                        bus_id = COALESCE($6, bus_id),
                        agency_id = COALESCE($7, agency_id),
                        is_active = COALESCE($8, is_active),
                        cancellation_policy = COALESCE($9, cancellation_policy),
                        recurrence_pattern_id = COALESCE($10, recurrence_pattern_id),
                        valid_from = COALESCE($11, valid_from),
                        valid_until = COALESCE($12, valid_until),
                        updated_at = NOW()
                    WHERE id = $13 AND is_deleted = FALSE
                    RETURNING *`,
                    [
                        trip.departure_city,
                        trip.arrival_city,
                        trip.departure_time,
                        trip.arrival_time,
                        trip.price,
                        trip.bus_id,
                        trip.agency_id,
                        trip.is_active,
                        trip.cancellation_policy,
                        recurrencePatternId,
                        trip.valid_from,
                        trip.valid_until,
                        id
                    ]
                );

                if (!result) {
                    throw new Error('Trip not found or deleted');
                }

                return { status: true, message: 'Trip mis à jour', body: result, code: 200 };
            } catch (error) {
                throw error;
            }
        });

        return t;
    }

    static async softDelete(id: number, deleted_by: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `UPDATE ${kTrip} SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $2 
                WHERE id = $1 AND is_deleted = FALSE`,
                [id, deleted_by]
            );
            if (result.rowCount === 0) {
                return { status: false, message: 'Trip non trouvé ou déjà supprimé', code: 404 };
            }
            return { status: true, message: 'Trip supprimé temporairement', code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la suppression', code: 500 };
        }
    }

    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `UPDATE ${kTrip} SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL 
                WHERE id = $1 AND is_deleted = TRUE`,
                [id]
            );
            if (result.rowCount === 0) {
                return { status: false, message: 'Trip non trouvé ou déjà restauré', code: 404 };
            }
            return { status: true, message: 'Trip restauré', code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la restauration', code: 500 };
        }
    }

    static async delete(id: number): Promise<ResponseModel> {
        const t = await pgpDb.tx(async (tx) => {
            try {
                // Get recurrence pattern id before deleting trip
                const trip = await tx.oneOrNone(
                    `SELECT recurrence_pattern_id FROM ${kTrip} WHERE id = $1`,
                    [id]
                );

                // Delete trip
                const result = await tx.result(
                    `DELETE FROM ${kTrip} WHERE id = $1`,
                    [id]
                );

                if (result.rowCount === 0) {
                    throw new Error('Trip not found');
                }

                // Delete associated recurrence pattern if exists
                if (trip?.recurrence_pattern_id) {
                    await tx.none(
                        `DELETE FROM ${kRecurrencePattern} WHERE id = $1`,
                        [trip.recurrence_pattern_id]
                    );
                }

                return { status: true, message: 'Trip supprimé définitivement', code: 200 };
            } catch (error) {
                throw error;
            }
        });

        return t;
    }

    static async findAllByAgency(agencyId: number, isDeleted: boolean = false): Promise<ResponseModel> {
        try {
            const trips = await pgpDb.any(
                `SELECT t.id,
                        t.departure_city,
                        t.arrival_city,
                        t.departure_time,
                        t.arrival_time,
                        t.bus_id,
                        t.agency_id,
                        t.is_active,
                        t.cancellation_policy,
                        t.is_deleted,
                        t.deleted_at,
                        t.updated_at,
                        t.deleted_by,
                        t.created_by,

                        t.price::INT,
                        t.valid_from,
                        t.valid_until,
                        
                        rp.type as recurrence_type, 
                        rp.interval as recurrence_interval,
                        rp.days_of_week as recurrence_days_of_week,
                        rp.end_date as recurrence_end_date,
                        rp.exceptions as recurrence_exceptions, 
                        b.registration_number AS bus_registration_number
                 FROM ${kTrip} t
                 LEFT JOIN ${kRecurrencePattern} rp ON t.recurrence_pattern_id = rp.id
                 LEFT JOIN ${kBus} b ON b.id = t.bus_id
                 WHERE t.agency_id = $1 AND t.is_deleted = $2
                 ORDER BY t.departure_time ASC`,
                [agencyId, isDeleted]
            );

            // Parse recurrence patterns
            trips.forEach(trip => {
                if (trip.recurrence_type) {
                    trip.recurrence_pattern = {
                        type: trip.recurrence_type,
                        interval: trip.recurrence_interval,
                        days_of_week: trip.recurrence_days_of_week ? JSON.parse(trip.recurrence_days_of_week) : null,
                        end_date: trip.recurrence_end_date,
                        exceptions: trip.recurrence_exceptions ? JSON.parse(trip.recurrence_exceptions) : null
                    };
                }

                // Clean up temporary fields
                delete trip.recurrence_type;
                delete trip.recurrence_interval;
                delete trip.recurrence_days_of_week;
                delete trip.recurrence_end_date;
                delete trip.recurrence_exceptions;
            });

            return { status: true, message: 'Liste des trips récupérée', body: trips, code: 200 };
        } catch (error) {
            console.log(error)
            return { status: false, message: `Erreur lors de la récupération des trips ${JSON.stringify(error)}`, code: 500, };
        }
    }

    static async findByRoute(departureCity: string, arrivalCity: string, departureDate?: Date): Promise<ResponseModel> {
        try {
            let query = `
                SELECT t.*, 
                        rp.type as recurrence_type, 
                        rp.interval as recurrence_interval,
                        rp.days_of_week as recurrence_days_of_week,
                        rp.end_date as recurrence_end_date,
                        rp.exceptions as recurrence_exceptions
                 FROM ${kTrip} t
                 LEFT JOIN ${kRecurrencePattern} rp ON t.recurrence_pattern_id = rp.id
                 WHERE t.departure_city = $1 AND t.arrival_city = $2 
                 AND t.is_deleted = FALSE AND t.is_active = TRUE
                 AND t.valid_from <= CURRENT_DATE
                 AND (t.valid_until IS NULL OR t.valid_until >= CURRENT_DATE)`;
            
            let params = [departureCity, arrivalCity];

            if (departureDate) { 
                query += ` AND DATE(t.departure_time) = DATE($3)`;
                params.push(departureDate.toISOString());
            }

            query += ` ORDER BY t.departure_time ASC`;

            const trips = await pgpDb.any(query, params);

            // Parse recurrence patterns and ensure price is a number
            trips.forEach(trip => {
                // Convert price to float if it's a string
                if (trip.price && typeof trip.price === 'string') {
                    trip.price = parseFloat(trip.price);
                }

                if (trip.recurrence_type) {
                    trip.recurrence_pattern = {
                        type: trip.recurrence_type,
                        interval: trip.recurrence_interval,
                        days_of_week: trip.recurrence_days_of_week ? JSON.parse(trip.recurrence_days_of_week) : null,
                        end_date: trip.recurrence_end_date,
                        exceptions: trip.recurrence_exceptions ? JSON.parse(trip.recurrence_exceptions) : null
                    };
                }

                // Clean up temporary fields
                delete trip.recurrence_type;
                delete trip.recurrence_interval;
                delete trip.recurrence_days_of_week;
                delete trip.recurrence_end_date;
                delete trip.recurrence_exceptions;
            });

            return { status: true, message: 'Trips trouvés', body: trips, code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la recherche de trips', code: 500 };
        }
    }
}
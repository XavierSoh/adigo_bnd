"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingRepository = void 0;
const pgdb_1 = __importDefault(require("../config/pgdb"));
const table_names_1 = require("../utils/table_names");
const tier_service_1 = require("../services/tier.service");
class BookingRepository {
    // Ajout d'un passager à une réservation (nom, téléphone, document)
    static async addPassenger(bookingId, name, phone, document_type, document_number) {
        await pgdb_1.default.none(`INSERT INTO booking_passenger (booking_id, name, phone, document_type, document_number) VALUES ($1, $2, $3, $4, $5)`, [bookingId, name || null, phone || null, document_type || null, document_number || null]);
    }
    static async create(booking) {
        try {
            // Générer une référence simple
            const generateBookingReference = () => {
                const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
                return `BK${random}`; // Ex: "BK042536" (8 caractères)
            };
            const result = await pgdb_1.default.one(`INSERT INTO ${table_names_1.kBooking} (
                generated_trip_id, customer_id, generated_trip_seat_id, booking_date, status,
                payment_method, payment_reference, is_deleted, created_by, booking_reference, total_price, group_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`, [
                booking.generated_trip_id,
                booking.customer_id,
                booking.generated_trip_seat_id,
                booking.booking_date ?? new Date(),
                booking.status ?? 'confirmed',
                booking.payment_method,
                booking.payment_reference,
                false,
                booking.created_by,
                generateBookingReference(),
                booking.total_price,
                booking.group_id || null
            ]);
            // Add loyalty points for confirmed bookings
            if (result.status === 'confirmed' && result.total_price) {
                await tier_service_1.TierService.addLoyaltyPoints(booking.customer_id, result.total_price, `Booking ${result.booking_reference}`);
            }
            return { status: true, message: "Réservation créée", body: result, code: 201 };
        }
        catch (error) {
            console.log(`Erreur de réservation ... ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la création de la réservation", code: 500, body: error };
        }
    }
    // Update booking
    static async update(id, booking) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kBooking} SET
                    generated_trip_id = COALESCE($1, generated_trip_id),
                    customer_id = COALESCE($2, customer_id),
                    generated_trip_seat_id = COALESCE($3, generated_trip_seat_id),
                    status = COALESCE($4, status),
                    payment_method = COALESCE($5, payment_method),
                    cancellation_date = COALESCE($6, cancellation_date),
                    cancellation_reason = COALESCE($7, cancellation_reason),
                    payment_reference = COALESCE($8, payment_reference),
                    updated_at = NOW()
                WHERE id = $9 AND is_deleted = FALSE
                RETURNING *`, [
                booking.generated_trip_id,
                booking.customer_id,
                booking.generated_trip_seat_id,
                booking.status,
                booking.payment_method, // NOUVEAU PARAMÈTRE
                booking.cancellation_date,
                booking.cancellation_reason,
                booking.payment_reference,
                id
            ]);
            if (!result) {
                return { status: false, message: "Réservation non trouvée", code: 404 };
            }
            return { status: true, message: "Réservation mise à jour", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour de la réservation", code: 500 };
        }
    }
    // Get statistics by payment method
    static async getStatisticsByPaymentMethod(agencyId) {
        try {
            let query = `
                SELECT 
                    payment_method,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                FROM ${table_names_1.kBooking} b
            `;
            const params = [];
            if (agencyId) {
                query += `
                    INNER JOIN ${table_names_1.kTrip} t ON b.trip_id = t.id
                    WHERE t.agency_id = $1 AND b.is_deleted = FALSE
                `;
                params.push(agencyId);
            }
            else {
                query += ' WHERE b.is_deleted = FALSE';
            }
            query += ' GROUP BY payment_method';
            const result = await pgdb_1.default.any(query, params);
            return { status: true, message: "Statistiques par méthode de paiement récupérées", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques", code: 500 };
        }
    }
    // Soft delete booking
    static async softDelete(id, deletedBy) {
        try {
            const result = await pgdb_1.default.result(`UPDATE ${table_names_1.kBooking} SET
                    is_deleted = TRUE,
                    deleted_at = NOW(),
                    deleted_by = $2,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = FALSE`, [id, deletedBy]);
            if (result.rowCount === 0) {
                return { status: false, message: "Réservation non trouvée ou déjà supprimée", code: 404 };
            }
            return { status: true, message: "Réservation supprimée", code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la suppression de la réservation", code: 500 };
        }
    }
    // Restore soft deleted booking
    static async restore(id) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kBooking} SET
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = TRUE
                RETURNING *`, [id]);
            if (!result) {
                return { status: false, message: "Réservation non trouvée ou déjà active", code: 404 };
            }
            return { status: true, message: "Réservation restaurée", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la restauration de la réservation", code: 500 };
        }
    }
    // Hard delete booking
    static async delete(id) {
        try {
            const result = await pgdb_1.default.result(`DELETE FROM ${table_names_1.kBooking} WHERE id = $1`, [id]);
            if (result.rowCount === 0) {
                return { status: false, message: "Réservation non trouvée", code: 404 };
            }
            return { status: true, message: "Réservation supprimée définitivement", code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la suppression de la réservation", code: 500 };
        }
    }
    // Get bookings by trip and status
    static async findByTripAndStatus(tripId, status) {
        try {
            const bookings = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE gt.trip_id = $1 AND b.status = $2 AND b.is_deleted = FALSE
                ORDER BY b.booking_date DESC`, [tripId, status]);
            return { status: true, message: "Liste des réservations récupérée", body: bookings, code: 200 };
        }
        catch (error) {
            console.log(`Error in findByTripAndStatus: ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la récupération des réservations par voyages et status ", code: 500 };
        }
    }
    // Check seat availability for trip
    static async checkSeatAvailability(tripId, seatId, excludeBookingId) {
        try {
            let query = `
                SELECT COUNT(*) as count FROM ${table_names_1.kBooking}
                WHERE generated_trip_id = $1 AND generated_trip_seat_id = $2 AND status = 'confirmed' AND is_deleted = FALSE
            `;
            const params = [tripId, seatId];
            if (excludeBookingId) {
                query += ' AND id != $3';
                params.push(excludeBookingId);
            }
            const result = await pgdb_1.default.one(query, params);
            const available = parseInt(result.count) === 0;
            return { status: true, message: "Disponibilité vérifiée", body: { available }, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la vérification de disponibilité", code: 500 };
        }
    }
    // Get booked seat IDs for a trip
    static async getBookedSeatIds(tripId) {
        try {
            const result = await pgdb_1.default.any(`SELECT generated_trip_seat_id FROM ${table_names_1.kBooking}
                WHERE trip_id = $1 AND status = 'confirmed' AND is_deleted = FALSE`, [tripId]);
            const seatIds = result.map((row) => row.generated_trip_seat_id);
            return { status: true, message: "Sièges réservés récupérés", body: seatIds, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges réservés", code: 500 };
        }
    }
    // Get booking statistics
    static async getStatistics(agencyId) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                FROM ${table_names_1.kBooking} b
            `;
            const params = [];
            if (agencyId) {
                query += `
                    INNER JOIN ${table_names_1.kTrip} t ON b.trip_id = t.id
                    WHERE t.agency_id = $1 AND b.is_deleted = FALSE
                `;
                params.push(agencyId);
            }
            else {
                query += ' WHERE b.is_deleted = FALSE';
            }
            const result = await pgdb_1.default.one(query, params);
            return { status: true, message: "Statistiques récupérées", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques", code: 500 };
        }
    }
    // Get revenue statistics
    static async getRevenueStatistics(agencyId, startDate, endDate) {
        try {
            let query = `
                SELECT 
                    SUM(CASE WHEN b.status = 'confirmed' THEN t.price ELSE 0 END) as confirmed_revenue,
                    SUM(CASE WHEN b.status = 'completed' THEN t.price ELSE 0 END) as completed_revenue,
                    SUM(t.price) as total_potential_revenue
                FROM ${table_names_1.kBooking} b
                INNER JOIN ${table_names_1.kTrip} t ON b.trip_id = t.id
                WHERE b.is_deleted = FALSE
            `;
            const params = [];
            let paramIndex = 1;
            if (agencyId) {
                query += ` AND t.agency_id = $${paramIndex}`;
                params.push(agencyId);
                paramIndex++;
            }
            if (startDate) {
                query += ` AND b.booking_date >= $${paramIndex}`;
                params.push(startDate);
                paramIndex++;
            }
            if (endDate) {
                query += ` AND b.booking_date <= $${paramIndex}`;
                params.push(endDate);
                paramIndex++;
            }
            const result = await pgdb_1.default.one(query, params);
            return { status: true, message: "Statistiques de revenus récupérées", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques de revenus", code: 500 };
        }
    }
    // Search bookings
    static async search(filters) {
        try {
            let query = `
                SELECT b.* FROM ${table_names_1.kBooking} b
                INNER JOIN ${table_names_1.kTrip} t ON b.trip_id = t.id
                INNER JOIN "${table_names_1.kUsers}" u ON b.customer_id = u.id
                WHERE b.is_deleted = FALSE
            `;
            const params = [];
            let paramIndex = 1;
            if (filters.customerName) {
                query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
                params.push(`%${filters.customerName}%`);
                paramIndex++;
            }
            if (filters.departureCity) {
                query += ` AND t.departure_city ILIKE $${paramIndex}`;
                params.push(`%${filters.departureCity}%`);
                paramIndex++;
            }
            if (filters.arrivalCity) {
                query += ` AND t.arrival_city ILIKE $${paramIndex}`;
                params.push(`%${filters.arrivalCity}%`);
                paramIndex++;
            }
            if (filters.status) {
                query += ` AND b.status = $${paramIndex}`;
                params.push(filters.status);
                paramIndex++;
            }
            if (filters.startDate) {
                query += ` AND b.booking_date >= $${paramIndex}`;
                params.push(filters.startDate);
                paramIndex++;
            }
            if (filters.endDate) {
                query += ` AND b.booking_date <= $${paramIndex}`;
                params.push(filters.endDate);
                paramIndex++;
            }
            if (filters.agencyId) {
                query += ` AND t.agency_id = $${paramIndex}`;
                params.push(filters.agencyId);
                paramIndex++;
            }
            query += ' ORDER BY b.booking_date DESC';
            const bookings = await pgdb_1.default.any(query, params);
            return { status: true, message: "Recherche effectuée", body: bookings, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }
    // Cancel batch bookings
    static async cancelBatch(bookingIds, cancellationReason) {
        try {
            const result = await pgdb_1.default.any(`UPDATE ${table_names_1.kBooking} SET
                    status = 'cancelled',
                    cancellation_reason = $1,
                    cancellation_date = NOW(),
                    updated_at = NOW()
                WHERE id = ANY($2) AND is_deleted = FALSE
                RETURNING *`, [cancellationReason, bookingIds]);
            return { status: true, message: "Réservations annulées", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de l'annulation des réservations", code: 500 };
        }
    }
    // Get recent bookings
    static async findRecent(limit = 10, agencyId) {
        try {
            let query = `
                SELECT b.* FROM ${table_names_1.kBooking} b
            `;
            const params = [];
            if (agencyId) {
                query += `
                    INNER JOIN ${table_names_1.kTrip} t ON b.trip_id = t.id
                    WHERE t.agency_id = $1 AND b.is_deleted = FALSE
                `;
                params.push(agencyId);
            }
            else {
                query += ' WHERE b.is_deleted = FALSE';
            }
            query += ` ORDER BY b.booking_date DESC LIMIT ${limit}`;
            const bookings = await pgdb_1.default.any(query, params);
            return { status: true, message: "Réservations récentes récupérées", body: bookings, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des réservations récentes", code: 500 };
        }
    }
    // Cleanup soft deleted bookings older than specified days
    static async cleanupSoftDeleted(olderThanDays = 30) {
        try {
            const result = await pgdb_1.default.result(`DELETE FROM ${table_names_1.kBooking}
                WHERE is_deleted = TRUE AND deleted_at < NOW() - INTERVAL '${olderThanDays} days'`);
            return {
                status: true,
                message: "Nettoyage effectué",
                body: { deleted_count: result.rowCount },
                code: 200
            };
        }
        catch (error) {
            return { status: false, message: "Erreur lors du nettoyage", code: 500 };
        }
    }
    /**
     * Convert numeric string fields to actual numbers for mobile app compatibility
     * PostgreSQL NUMERIC/DECIMAL types are returned as strings by pg-promise
     */
    static normalizeNumericFields(booking) {
        const normalized = { ...booking };
        // Convert numeric string fields to numbers
        const numericFields = [
            'total_price', 'base_price', 'seat_price_adjustment', 'taxes',
            'discount', 'trip_price', 'loyalty_points', 'wallet_balance'
        ];
        numericFields.forEach(field => {
            if (normalized[field] !== null && normalized[field] !== undefined) {
                const value = normalized[field];
                if (typeof value === 'string') {
                    const parsed = parseFloat(value);
                    normalized[field] = isNaN(parsed) ? value : parsed;
                }
            }
        });
        // Recursively normalize nested customer object
        if (normalized.customer && typeof normalized.customer === 'object') {
            ['loyalty_points', 'wallet_balance'].forEach(field => {
                if (normalized.customer[field] !== null && normalized.customer[field] !== undefined) {
                    const value = normalized.customer[field];
                    if (typeof value === 'string') {
                        const parsed = parseFloat(value);
                        normalized.customer[field] = isNaN(parsed) ? value : parsed;
                    }
                }
            });
        }
        return normalized;
    }
    //********************************************************************************************* */
    // MÉTHODES DE LECTURE AVEC AGENCY
    //********************************************************************************************* */
    static async findByAgency(agencyId) {
        try {
            const bookings = await pgdb_1.default.any(`SELECT 
                    ${this.BASE_SELECT},
                    t.departure_city,
                    t.arrival_city,
                    gt.actual_departure_time AS departure_time,
                    bs.registration_number AS bus_registration_number,
                    u.login AS created_by_name
                ${this.BASE_JOINS}
                LEFT JOIN ${table_names_1.kUsers} u ON u.id = b.created_by
                WHERE t.agency_id = $1 AND b.is_deleted = FALSE
                ORDER BY b.booking_date DESC`, [agencyId]);
            return { status: true, message: "Liste des réservations récupérée", body: bookings, code: 200 };
        }
        catch (error) {
            console.log(`Agency error: ${JSON.stringify(error)}`);
            return {
                status: false,
                message: `Erreur lors de la récupération des réservations par agence: ${error.message || error.toString()}`,
                code: 500,
                exception: error.stack || error
            };
        }
    }
    static async findAll(includeDeleted = false) {
        try {
            const whereClause = includeDeleted ? '' : 'WHERE b.is_deleted = FALSE';
            const bookings = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                ${whereClause} 
                ORDER BY b.booking_date DESC`);
            return { status: true, message: "Liste des réservations récupérée", body: bookings, code: 200 };
        }
        catch (error) {
            return {
                status: false,
                message: `Erreur lors de la récupération de toutes les  réservations: ${error.message || error.toString()}`,
                code: 500,
                exception: error.stack || error
            };
        }
    }
    static async findById(id) {
        try {
            const booking = await pgdb_1.default.oneOrNone(`SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE b.id = $1 AND b.is_deleted = FALSE`, [id]);
            if (!booking) {
                return { status: false, message: "Réservation non trouvée", code: 404 };
            }
            return { status: true, message: "Réservation trouvée", body: booking, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche de la réservation", code: 500 };
        }
    }
    static async findByTrip(tripId) {
        try {
            const bookings = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE b.generated_trip_id = $1 AND b.is_deleted = FALSE
                ORDER BY b.booking_date DESC`, [tripId]);
            return { status: true, message: "Liste des réservations récupérée", body: bookings, code: 200 };
        }
        catch (error) {
            return {
                status: false,
                message: `Erreur lors de la récupération des réservations: ${error.message || error.toString()}`,
                code: 500,
                exception: error.stack || error
            };
        }
    }
    static async findByUser(customerId) {
        try {
            const bookings = await pgdb_1.default.any(`SELECT
                    ${this.BASE_SELECT},
                    t.departure_city,
                    t.arrival_city,
                    gt.actual_departure_time AS departure_time,
                    t.price AS trip_price,
                    bs.registration_number,
                    bs.type AS bus_type
                ${this.BASE_JOINS}
                WHERE b.customer_id = $1 AND b.is_deleted = FALSE
                ORDER BY b.booking_date DESC`, [customerId]);
            // Convert numeric string fields to numbers for mobile compatibility
            const normalizedBookings = bookings.map(booking => this.normalizeNumericFields(booking));
            return { status: true, message: "Liste des réservations récupérée", body: normalizedBookings, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des réservations par utilisateur", code: 500 };
        }
    }
    static async findByGroupId(groupId) {
        try {
            const bookings = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE b.group_id = $1 AND b.is_deleted = FALSE
                ORDER BY b.booking_date DESC`, [groupId]);
            return { status: true, message: "Liste des réservations du groupe récupérée", body: bookings, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des réservations par groupe ", code: 500 };
        }
    }
    static async findByStatus(status) {
        try {
            const bookings = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE b.status = $1 AND b.is_deleted = FALSE
                ORDER BY b.booking_date DESC`, [status]);
            return { status: true, message: "Liste des réservations récupérée", body: bookings, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des réservations par status ", code: 500 };
        }
    }
    static async findByDateRange(startDate, endDate) {
        try {
            const bookings = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE b.booking_date >= $1 AND b.booking_date <= $2 AND b.is_deleted = FALSE
                ORDER BY b.booking_date DESC`, [startDate, endDate]);
            return { status: true, message: "Liste des réservations récupérée", body: bookings, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des réservations par plage de date...", code: 500 };
        }
    }
    static async findAllWithDetails(agencyId) {
        try {
            let query = `
                SELECT 
                    ${this.BASE_SELECT},
                    t.departure_city,
                    t.arrival_city,
                    gt.actual_departure_time AS departure_time,
                    t.price as trip_price,
                    bs.registration_number,
                    bs.type as bus_type
                ${this.BASE_JOINS}
                WHERE b.is_deleted = FALSE
            `;
            const params = [];
            if (agencyId) {
                query += ' AND t.agency_id = $1';
                params.push(agencyId);
            }
            query += ' ORDER BY b.booking_date DESC';
            const bookings = await pgdb_1.default.any(query, params);
            return { status: true, message: "Liste des réservations avec détails récupérée", body: bookings, code: 200 };
        }
        catch (error) {
            console.log(`Error in findAllWithDetails: ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la récupération des réservations avec details ...", code: 500 };
        }
    }
    // Suppression logique de toutes les réservations d'un groupe
    static async softDeleteByGroup(groupId) {
        await pgdb_1.default.none(`UPDATE booking SET is_deleted = TRUE WHERE group_id = $1`, [groupId]);
    }
}
exports.BookingRepository = BookingRepository;
//********************************************************************************************* */
// SÉLECTEURS AMÉLIORÉS AVEC AGENCY
//********************************************************************************************* */
BookingRepository.AGENCY_SELECT = `
        json_build_object(
            'id', ag.id,
            'name', ag.name,
            'address', ag.address,
            'cities_served', ag.cities_served,
            'phone', ag.phone,
            'email', ag.email,
            'logo', ag.logo,
            'opening_hours', ag.opening_hours,
            'custom_hours', ag.custom_hours,
            'is_deleted', ag.is_deleted
        ) AS agency
    `;
BookingRepository.CUSTOMER_SELECT = `
        json_build_object(
            'id', c.id,
            'first_name', c.first_name,
            'last_name', c.last_name,
            'email', c.email,
            'phone', c.phone,
            'date_of_birth', c.date_of_birth,
            'gender', c.gender,
            'address', c.address,
            'city', c.city,
            'id_card_number', c.id_card_number,
            'id_card_type', c.id_card_type,
            'preferred_language', c.preferred_language,
            'notification_enabled', c.notification_enabled,
            'preferred_seat_type', c.preferred_seat_type,
            'loyalty_points', c.loyalty_points,
            'customer_tier', c.customer_tier,
            'account_status', c.account_status,
            'email_verified', c.email_verified,
            'phone_verified', c.phone_verified,
            'profile_picture', c.profile_picture,
            'wallet_balance', c.wallet_balance,
            'fcm_token', c.fcm_token,
            'created_at', c.created_at,
            'updated_at', c.updated_at,
            'last_login', c.last_login,
            'is_deleted', c.is_deleted,
            'deleted_at', c.deleted_at,
            'deleted_by', c.deleted_by
        ) AS customer
    `;
BookingRepository.BUS_SELECT = `
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
        )
    `;
BookingRepository.SEAT_SELECT = `
        json_build_object(
            'id', s.id,
            'bus_id', s.bus_id,
            'seat_number', s.seat_number,
            'seat_type', s.seat_type,
            'is_active', s.is_active
        )
    `;
BookingRepository.GENERATED_TRIP_SELECT = `
        json_build_object(
            'id', gt.id,
            'trip_id', gt.trip_id,
            'original_departure_time', gt.original_departure_time,
            'actual_departure_time', gt.actual_departure_time,
            'actual_arrival_time', gt.actual_arrival_time,
            'available_seats', gt.available_seats,
            'status', gt.status,
            'driver_id', gt.driver_id,
            'conductor_id', gt.conductor_id,
            'bus_id', gt.bus_id,
            'notes', gt.notes,
            'created_at', gt.created_at,
            'bus', ${BookingRepository.BUS_SELECT}
        ) AS generated_trip
    `;
BookingRepository.GENERATED_TRIP_SEAT_SELECT = `
        json_build_object(
            'id', gts.id,
            'generated_trip_id', gts.generated_trip_id,
            'seat_id', gts.seat_id,
            'status', gts.status,
            'price_adjustment', gts.price_adjustment,
            'blocked_reason', gts.blocked_reason,
            'blocked_until', gts.blocked_until,
            'created_at', gts.created_at,
            'updated_at', gts.updated_at,
            'seat', ${BookingRepository.SEAT_SELECT}
        ) AS generated_trip_seat
    `;
BookingRepository.BOOKING_PASSENGER_SELECT = `
        json_build_object(
            'id', bp.id,
            'booking_id', bp.booking_id,
            'name', bp.name,
            'phone', bp.phone,
            'document_type', bp.document_type,
            'document_number', bp.document_number
        ) AS booking_passenger
    `;
BookingRepository.BASE_SELECT = `
        b.*,
        t.agency_id AS agency_id,
        ${BookingRepository.CUSTOMER_SELECT},
        ${BookingRepository.GENERATED_TRIP_SELECT},
        ${BookingRepository.GENERATED_TRIP_SEAT_SELECT},
        ${BookingRepository.AGENCY_SELECT},
        ${BookingRepository.BOOKING_PASSENGER_SELECT}
    `;
BookingRepository.BASE_JOINS = `
        FROM ${table_names_1.kBooking} b
        LEFT JOIN ${table_names_1.kCustomer} c ON b.customer_id = c.id
        LEFT JOIN ${table_names_1.kGeneratedTrip} gt ON b.generated_trip_id = gt.id
        LEFT JOIN ${table_names_1.kGeneratedTripSeat} gts ON b.generated_trip_seat_id = gts.id
        LEFT JOIN ${table_names_1.kBus} bs ON bs.id = gt.bus_id
        LEFT JOIN ${table_names_1.kSeat} s ON s.id = gts.seat_id
        LEFT JOIN ${table_names_1.kTrip} t ON t.id = gt.trip_id
        LEFT JOIN ${table_names_1.kAgency} ag ON ag.id = t.agency_id
        LEFT JOIN booking_passenger bp ON bp.booking_id = b.id
    `;

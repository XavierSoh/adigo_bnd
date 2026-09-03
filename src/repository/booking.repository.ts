// Migrated to Prisma's native model API (prisma.booking.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 2,
// final/most complex file).
//
// BUG FIX APPLIED PER EXPLICIT USER DECISION (not guessed): the original
// getStatisticsByPaymentMethod/getStatistics/getRevenueStatistics/search/
// findRecent all joined on `b.trip_id` — a column that does not exist on
// `booking` at all (the real path is `booking.generated_trip_id ->
// generated_trip.trip_id -> trip`). This was already documented as a
// pre-existing, always-500ing bug in BOOKING_MODULE_NOTES.md. Prisma's
// typed model API cannot reference a nonexistent column (a compile error,
// not a runtime risk), so faithfully reproducing "throws because the
// column doesn't exist" was not an option without reaching for
// $queryRawUnsafe — flagged to the user, who chose to fix the join path
// instead of preserving the crash or keeping these 5 methods on raw SQL.
// `search()` also joined `customer_id` against the `users` table (which
// has no first_name/last_name columns at all — a second, independent
// always-throws bug) — fixed the same way, now correctly joining
// `customer` (the real FK target of booking.customer_id).
import { Prisma } from "@prisma/client";
import prismaDb from "../config/prismaClient";
import { Booking } from "../models/booking.model";
import ResponseModel from "../models/response.model";
import { TierService } from "../services/tier.service";

// --- Reusable nested-select fragments, matching the original's json_build_object field lists exactly ---

const customerSelect = {
    id: true, first_name: true, last_name: true, email: true, phone: true, date_of_birth: true,
    gender: true, address: true, city: true, id_card_number: true, id_card_type: true,
    preferred_language: true, notification_enabled: true, preferred_seat_type: true, loyalty_points: true,
    customer_tier: true, account_status: true, email_verified: true, phone_verified: true,
    profile_picture: true, wallet_balance: true, fcm_token: true, created_at: true, updated_at: true,
    last_login: true, is_deleted: true, deleted_at: true, deleted_by: true,
} satisfies Prisma.customerSelect;

const busSelect = {
    id: true, registration_number: true, capacity: true, type: true, amenities: true, seat_layout: true,
    has_toilet: true, is_active: true, agency_id: true, is_deleted: true, deleted_at: true, deleted_by: true,
    created_by: true,
} satisfies Prisma.busSelect;

const seatSelect = {
    id: true, bus_id: true, seat_number: true, seat_type: true, is_active: true,
} satisfies Prisma.seatSelect;

const agencySelect = {
    id: true, name: true, address: true, cities_served: true, phone: true, email: true, logo: true,
    opening_hours: true, custom_hours: true, is_deleted: true,
} satisfies Prisma.agencySelect;

// `customer` (booking.customer_id) uses this specific relation name because
// the schema has TWO FKs from booking to customer (customer_id and
// created_by) — Prisma disambiguates same-target relations by name.
const bookingInclude = {
    customer_booking_customer_idTocustomer: { select: customerSelect },
    generated_trip: {
        select: {
            id: true, trip_id: true, original_departure_time: true, actual_departure_time: true,
            actual_arrival_time: true, available_seats: true, status: true, driver_id: true,
            conductor_id: true, bus_id: true, notes: true, created_at: true,
            trip: { select: { departure_city: true, arrival_city: true, price: true, agency_id: true, agency: { select: agencySelect } } },
            bus: { select: busSelect },
        },
    },
    generated_trip_seat: {
        select: {
            id: true, generated_trip_id: true, seat_id: true, status: true, price_adjustment: true,
            blocked_reason: true, blocked_until: true, created_at: true, updated_at: true,
            seat: { select: seatSelect },
        },
    },
    // The original's LEFT JOIN booking_passenger (no aggregation) produced
    // ONE flattened json object per row, and would silently DUPLICATE the
    // whole booking row if more than one booking_passenger record existed
    // for it. Prisma's `include` on this one-to-many relation instead
    // returns a proper array, one row — the correct relational shape, and
    // immune to that row-duplication risk. Nothing outside this repository
    // file reads `booking_passenger` (verified via a repo-wide grep), so
    // this shape change is safe. Flagged as a deliberate improvement.
    booking_passenger: true,
} satisfies Prisma.bookingInclude;

type BookingRow = Prisma.bookingGetPayload<{ include: typeof bookingInclude }>;

/** Base flatten: customer/agency/agency_id lifted to top level, matching
 * BASE_SELECT's shape exactly (`agency_id` was always `t.agency_id AS
 * agency_id` at booking top level, `agency` was always its own top-level
 * json key sourced through trip, never nested inside generated_trip). */
function mapBooking(row: BookingRow) {
    const { customer_booking_customer_idTocustomer, generated_trip, ...rest } = row;
    const trip = generated_trip?.trip;
    const { trip: _trip, ...generatedTripRest } = generated_trip ?? ({} as NonNullable<typeof generated_trip>);

    return {
        ...rest,
        agency_id: trip?.agency_id ?? null,
        customer: customer_booking_customer_idTocustomer,
        generated_trip: generated_trip
            ? { ...generatedTripRest, departure_city: trip?.departure_city ?? null, arrival_city: trip?.arrival_city ?? null }
            : null,
        agency: trip?.agency ?? null,
    };
}

/** Extends mapBooking's result with the extra top-level, flattened fields
 * findByAgency/findAll/findByUser/findAllWithDetails each add on top of
 * BASE_SELECT — every field sourced from data already fetched via
 * `bookingInclude`, no extra round trip. */
function mapBookingExtended(row: BookingRow, opts: { busRegistrationKey?: 'bus_registration_number' | 'registration_number'; busType?: boolean; tripPrice?: boolean }) {
    const base = mapBooking(row);
    const trip = row.generated_trip?.trip;
    const bus = row.generated_trip?.bus;
    const extra: Record<string, unknown> = {
        departure_city: trip?.departure_city ?? null,
        arrival_city: trip?.arrival_city ?? null,
        departure_time: row.generated_trip?.actual_departure_time ?? null,
    };
    if (opts.busRegistrationKey) extra[opts.busRegistrationKey] = bus?.registration_number ?? null;
    if (opts.busType) extra.bus_type = bus?.type ?? null;
    // `t.price AS trip_price` — kept as Prisma's native `Decimal` (full
    // precision preserved via its own `.toJSON()`), NOT parsed to a float
    // the way the original's `normalizeNumericFields` post-processing did.
    // Per this migration's standing rule (see prisma-timezone-extension.ts's
    // header comment), that parseFloat step is dropped entirely here — it
    // is unnecessary now (see below) and would reintroduce precision loss.
    if (opts.tripPrice) extra.trip_price = trip?.price ?? null;
    return { ...base, ...extra };
}

export class BookingRepository {

    // Ajout d'un passager à une réservation (nom, téléphone, document)
    static async addPassenger(bookingId: number, name?: string, phone?: string, document_type?: string, document_number?: string): Promise<void> {
        await prismaDb.booking_passenger.create({
            data: {
                booking_id: bookingId,
                name: name || null,
                phone: phone || null,
                document_type: document_type || null,
                document_number: document_number || null,
            },
        });
    }

    static async create(booking: Booking): Promise<ResponseModel> {
        try {
            const generateBookingReference = (): string => {
                const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
                return `BK${random}`; // Ex: "BK042536" (8 caractères)
            };

            const result = await prismaDb.booking.create({
                data: {
                    generated_trip_id: booking.generated_trip_id,
                    customer_id: booking.customer_id,
                    generated_trip_seat_id: booking.generated_trip_seat_id,
                    // `booking.booking_date`, when provided, is an ISO
                    // string from the request body — Prisma accepts it
                    // as-is for a DateTime field, same as Postgres always
                    // did regardless of driver. Only the `new Date()`
                    // fallback is a real Date instance, so only it goes
                    // through the timezone extension's write-side shift
                    // (a string is left untouched by `walkArgs`, matching
                    // the original comment's reasoning exactly).
                    booking_date: booking.booking_date ?? new Date(),
                    status: booking.status ?? 'confirmed',
                    payment_method: booking.payment_method,
                    payment_reference: booking.payment_reference,
                    is_deleted: false,
                    created_by: booking.created_by,
                    booking_reference: generateBookingReference(),
                    total_price: booking.total_price,
                    group_id: booking.group_id || null,
                } as Prisma.bookingUncheckedCreateInput,
            });

            // Add loyalty points for confirmed bookings
            if (result.status === 'confirmed' && result.total_price) {
                await TierService.addLoyaltyPoints(
                    booking.customer_id,
                    result.total_price,
                    `Booking ${result.booking_reference}`
                );
            }

            return { status: true, message: "Réservation créée", body: result, code: 201 };
        } catch (error) {
            console.log(`Erreur de réservation ... ${JSON.stringify(error)}`)
            return { status: false, message: "Erreur lors de la création de la réservation", code: 500, body: error };
        }
    }

    // Update booking
    static async update(id: number, booking: Partial<Booking>): Promise<ResponseModel> {
        try {
            const data: Prisma.bookingUncheckedUpdateInput = { updated_at: new Date() };
            if (booking.generated_trip_id != null) data.generated_trip_id = booking.generated_trip_id;
            if (booking.customer_id != null) data.customer_id = booking.customer_id;
            if (booking.generated_trip_seat_id != null) data.generated_trip_seat_id = booking.generated_trip_seat_id;
            if (booking.status != null) data.status = booking.status;
            if (booking.payment_method != null) data.payment_method = booking.payment_method;
            if (booking.cancellation_date != null) data.cancellation_date = booking.cancellation_date;
            if (booking.cancellation_reason != null) data.cancellation_reason = booking.cancellation_reason;
            if (booking.payment_reference != null) data.payment_reference = booking.payment_reference;

            // Compound `WHERE id = $9 AND is_deleted = FALSE` — updateMany
            // + refetch, the pattern established throughout this migration.
            const updateResult = await prismaDb.booking.updateMany({ where: { id, is_deleted: false }, data });

            if (updateResult.count === 0) {
                return { status: false, message: "Réservation non trouvée", code: 404 };
            }

            const result = await prismaDb.booking.findUnique({ where: { id } });

            return { status: true, message: "Réservation mise à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour de la réservation", code: 500 };
        }
    }

    // Get statistics by payment method
    static async getStatisticsByPaymentMethod(agencyId?: number): Promise<ResponseModel> {
        try {
            const where: Prisma.bookingWhereInput = agencyId
                ? { is_deleted: false, generated_trip: { trip: { agency_id: agencyId } } }
                : { is_deleted: false };

            const groups = await prismaDb.booking.groupBy({
                by: ['payment_method'],
                where,
                _count: { _all: true },
            });

            // No groupBy-with-conditional-SUM equivalent in the model API —
            // one `.count()` per (payment_method, status) pair instead of a
            // single `SUM(CASE WHEN ...)` statement.
            const result = await Promise.all(groups.map(async (g) => {
                const [confirmed, cancelled, completed] = await Promise.all([
                    prismaDb.booking.count({ where: { ...where, payment_method: g.payment_method, status: 'confirmed' } }),
                    prismaDb.booking.count({ where: { ...where, payment_method: g.payment_method, status: 'cancelled' } }),
                    prismaDb.booking.count({ where: { ...where, payment_method: g.payment_method, status: 'completed' } }),
                ]);
                return { payment_method: g.payment_method, total: g._count._all, confirmed, cancelled, completed };
            }));

            return { status: true, message: "Statistiques par méthode de paiement récupérées", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques", code: 500 };
        }
    }

    // Soft delete booking
    static async softDelete(id: number, deletedBy?: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.booking.updateMany({
                where: { id, is_deleted: false },
                data: { is_deleted: true, deleted_at: new Date(), deleted_by: deletedBy, updated_at: new Date() },
            });

            if (result.count === 0) {
                return { status: false, message: "Réservation non trouvée ou déjà supprimée", code: 404 };
            }

            return { status: true, message: "Réservation supprimée", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression de la réservation", code: 500 };
        }
    }

    // Restore soft deleted booking
    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.booking.updateMany({
                where: { id, is_deleted: true },
                data: { is_deleted: false, deleted_at: null, deleted_by: null, updated_at: new Date() },
            });

            if (result.count === 0) {
                return { status: false, message: "Réservation non trouvée ou déjà active", code: 404 };
            }

            const restored = await prismaDb.booking.findUnique({ where: { id } });

            return { status: true, message: "Réservation restaurée", body: restored, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la restauration de la réservation", code: 500 };
        }
    }

    // Hard delete booking
    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.booking.deleteMany({ where: { id } });

            if (result.count === 0) {
                return { status: false, message: "Réservation non trouvée", code: 404 };
            }

            return { status: true, message: "Réservation supprimée définitivement", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression de la réservation", code: 500 };
        }
    }

    // Get bookings by trip and status
    static async findByTripAndStatus(tripId: number, status: string): Promise<ResponseModel> {
        try {
            // `gt.trip_id = $1` in the original — a REAL column on
            // generated_trip, unrelated to the b.trip_id bug fixed
            // elsewhere in this file.
            const rows = await prismaDb.booking.findMany({
                where: { generated_trip: { trip_id: tripId }, status, is_deleted: false },
                include: bookingInclude,
                orderBy: { booking_date: 'desc' },
            });

            return { status: true, message: "Liste des réservations récupérée", body: rows.map(mapBooking), code: 200 };
        } catch (error) {
            console.log(`Error in findByTripAndStatus: ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la récupération des réservations par voyages et status ", code: 500 };
        }
    }

    // Check seat availability for trip
    static async checkSeatAvailability(tripId: number, seatId: number, excludeBookingId?: number): Promise<ResponseModel> {
        try {
            // 'pending' counts as taken too — a seat with an Orange Money
            // charge in flight must not be handed out to a second customer
            // while the first one is still confirming on their phone.
            const count = await prismaDb.booking.count({
                where: {
                    generated_trip_id: tripId,
                    generated_trip_seat_id: seatId,
                    status: { in: ['confirmed', 'pending'] },
                    is_deleted: false,
                    ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
                },
            });

            return { status: true, message: "Disponibilité vérifiée", body: { available: count === 0 }, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la vérification de disponibilité", code: 500 };
        }
    }

    // Get booked seat IDs for a trip
    static async getBookedSeatIds(tripId: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.booking.findMany({
                where: { generated_trip_id: tripId, status: { in: ['confirmed', 'pending'] }, is_deleted: false },
                select: { generated_trip_seat_id: true },
            });

            const seatIds = result.map((row) => row.generated_trip_seat_id);

            return { status: true, message: "Sièges réservés récupérés", body: seatIds, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges réservés", code: 500 };
        }
    }

    // Get booking statistics
    static async getStatistics(agencyId?: number): Promise<ResponseModel> {
        try {
            const where: Prisma.bookingWhereInput = agencyId
                ? { is_deleted: false, generated_trip: { trip: { agency_id: agencyId } } }
                : { is_deleted: false };

            const [total, confirmed, cancelled, completed] = await Promise.all([
                prismaDb.booking.count({ where }),
                prismaDb.booking.count({ where: { ...where, status: 'confirmed' } }),
                prismaDb.booking.count({ where: { ...where, status: 'cancelled' } }),
                prismaDb.booking.count({ where: { ...where, status: 'completed' } }),
            ]);

            return { status: true, message: "Statistiques récupérées", body: { total, confirmed, cancelled, completed }, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques", code: 500 };
        }
    }

    // Get revenue statistics
    static async getRevenueStatistics(agencyId?: number, startDate?: Date, endDate?: Date): Promise<ResponseModel> {
        try {
            const where: Prisma.bookingWhereInput = { is_deleted: false };
            if (agencyId) where.generated_trip = { trip: { agency_id: agencyId } };
            if (startDate || endDate) {
                where.booking_date = {
                    ...(startDate ? { gte: startDate } : {}),
                    ...(endDate ? { lte: endDate } : {}),
                };
            }

            // `SUM(CASE WHEN ... THEN t.price ELSE 0 END)` across a JOIN —
            // `.aggregate()` only sums the CURRENT model's own columns, not
            // a joined table's, so there is no server-side equivalent here.
            // Fetches the matching bookings' status + trip price and sums
            // in JS instead (flagged: N rows over the wire instead of a
            // single SUM — a real perf tradeoff on a large date range, not
            // hidden). Decimal precision preserved throughout via
              // `Prisma.Decimal` arithmetic, never converted to float.
            const rows = await prismaDb.booking.findMany({
                where,
                select: { status: true, generated_trip: { select: { trip: { select: { price: true } } } } },
            });

            let confirmedRevenue = new Prisma.Decimal(0);
            let completedRevenue = new Prisma.Decimal(0);
            let totalPotentialRevenue = new Prisma.Decimal(0);
            for (const row of rows) {
                const price = row.generated_trip?.trip?.price ?? new Prisma.Decimal(0);
                totalPotentialRevenue = totalPotentialRevenue.plus(price);
                if (row.status === 'confirmed') confirmedRevenue = confirmedRevenue.plus(price);
                if (row.status === 'completed') completedRevenue = completedRevenue.plus(price);
            }

            return {
                status: true,
                message: "Statistiques de revenus récupérées",
                body: {
                    confirmed_revenue: confirmedRevenue,
                    completed_revenue: completedRevenue,
                    total_potential_revenue: totalPotentialRevenue,
                },
                code: 200,
            };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques de revenus", code: 500 };
        }
    }

    // Search bookings
    static async search(filters: {
        customerName?: string;
        departureCity?: string;
        arrivalCity?: string;
        status?: string;
        startDate?: Date;
        endDate?: Date;
        agencyId?: number;
    }): Promise<ResponseModel> {
        try {
            const where: Prisma.bookingWhereInput = { is_deleted: false };

            if (filters.customerName) {
                // Fixed alongside the b.trip_id bug (same user decision):
                // the original joined `customer_id` against `users`, which
                // has no first_name/last_name columns at all — a second,
                // independent always-throws bug in this same query. Now
                // correctly filters through `customer`, the real FK target.
                where.customer_booking_customer_idTocustomer = {
                    OR: [
                        { first_name: { contains: filters.customerName, mode: 'insensitive' } },
                        { last_name: { contains: filters.customerName, mode: 'insensitive' } },
                    ],
                };
            }

            const tripFilter: Prisma.tripWhereInput = {};
            if (filters.departureCity) tripFilter.departure_city = { contains: filters.departureCity, mode: 'insensitive' };
            if (filters.arrivalCity) tripFilter.arrival_city = { contains: filters.arrivalCity, mode: 'insensitive' };
            if (filters.agencyId) tripFilter.agency_id = filters.agencyId;
            if (Object.keys(tripFilter).length > 0) {
                where.generated_trip = { trip: tripFilter };
            }

            if (filters.status) where.status = filters.status;
            if (filters.startDate || filters.endDate) {
                where.booking_date = {
                    ...(filters.startDate ? { gte: filters.startDate } : {}),
                    ...(filters.endDate ? { lte: filters.endDate } : {}),
                };
            }

            const bookings = await prismaDb.booking.findMany({ where, orderBy: { booking_date: 'desc' } });

            return { status: true, message: "Recherche effectuée", body: bookings, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    // Cancel batch bookings
    static async cancelBatch(bookingIds: number[], cancellationReason: string): Promise<ResponseModel> {
        try {
            await prismaDb.booking.updateMany({
                where: { id: { in: bookingIds }, is_deleted: false },
                data: { status: 'cancelled', cancellation_reason: cancellationReason, cancellation_date: new Date(), updated_at: new Date() },
            });

            // `RETURNING *` only returns the rows the UPDATE actually
            // matched — refetching with the SAME predicate (status isn't
            // part of it, so it still holds after the write) reproduces
            // that exactly, not "all requested ids regardless of match."
            const result = await prismaDb.booking.findMany({ where: { id: { in: bookingIds }, is_deleted: false } });

            return { status: true, message: "Réservations annulées", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de l'annulation des réservations", code: 500 };
        }
    }

    // Get recent bookings
    static async findRecent(limit: number = 10, agencyId?: number): Promise<ResponseModel> {
        try {
            const where: Prisma.bookingWhereInput = agencyId
                ? { is_deleted: false, generated_trip: { trip: { agency_id: agencyId } } }
                : { is_deleted: false };

            const bookings = await prismaDb.booking.findMany({ where, orderBy: { booking_date: 'desc' }, take: limit });

            return { status: true, message: "Réservations récentes récupérées", body: bookings, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des réservations récentes", code: 500 };
        }
    }

    // Cleanup soft deleted bookings older than specified days
    static async cleanupSoftDeleted(olderThanDays: number = 30): Promise<ResponseModel> {
        try {
            const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
            const result = await prismaDb.booking.deleteMany({
                where: { is_deleted: true, deleted_at: { lt: cutoff } },
            });

            return {
                status: true,
                message: "Nettoyage effectué",
                body: { deleted_count: result.count },
                code: 200
            };
        } catch (error) {
            return { status: false, message: "Erreur lors du nettoyage", code: 500 };
        }
    }

    //********************************************************************************************* */
    // MÉTHODES DE LECTURE AVEC AGENCY
    //********************************************************************************************* */

    /** Batches the `users.login` lookup for `b.created_by` (findByAgency/
     * findAll's `created_by_name`). NOTE: `booking.created_by`'s real FK
     * target per schema.prisma is `customer`, not `users` — the original
     * SQL joined `users` anyway (a silent, pre-existing mismatch that just
     * returns null/wrong data rather than throwing, unlike the b.trip_id
     * bug). Reproduced faithfully as-is (still looking up `users`, not
     * "corrected" to `customer`) using the phantom-FK batch pattern
     * established earlier in this migration (contract_type/staff), since
     * there's no real Prisma relation to `include` through here. */
    private static async batchCreatedByNames(createdByIds: (number | null)[]): Promise<Map<number, string>> {
        const ids = Array.from(new Set(createdByIds.filter((v): v is number => v != null)));
        if (ids.length === 0) return new Map();
        const users = await prismaDb.users.findMany({ where: { id: { in: ids } }, select: { id: true, login: true } });
        return new Map(users.map((u) => [u.id, u.login]));
    }

    static async findByAgency(agencyId: number): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.booking.findMany({
                where: { generated_trip: { trip: { agency_id: agencyId } }, is_deleted: false },
                include: bookingInclude,
                orderBy: { booking_date: 'desc' },
            });

            const createdByNames = await this.batchCreatedByNames(rows.map((r) => r.created_by));
            const bookings = rows.map((row) => ({
                ...mapBookingExtended(row, { busRegistrationKey: 'bus_registration_number' }),
                created_by_name: createdByNames.get(row.created_by) ?? null,
            }));

            return { status: true, message: "Liste des réservations récupérée", body: bookings, code: 200 };
        } catch (error: any) {
            console.log(`Agency error: ${JSON.stringify(error)}`);
            return {
                status: false,
                message: `Erreur lors de la récupération des réservations par agence: ${error.message || error.toString()}`,
                code: 500,
                exception: error.stack || error
            };
        }
    }

    static async findAll(includeDeleted: boolean = false): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.booking.findMany({
                where: includeDeleted ? {} : { is_deleted: false },
                include: bookingInclude,
                orderBy: { booking_date: 'desc' },
            });

            const createdByNames = await this.batchCreatedByNames(rows.map((r) => r.created_by));
            const bookings = rows.map((row) => ({
                ...mapBookingExtended(row, { busRegistrationKey: 'bus_registration_number' }),
                created_by_name: createdByNames.get(row.created_by) ?? null,
            }));

            return { status: true, message: "Liste des réservations récupérée", body: bookings, code: 200 };
        } catch (error: any) {
            return {
                status: false,
                message: `Erreur lors de la récupération de toutes les  réservations: ${error.message || error.toString()}`,
                code: 500,
                exception: error.stack || error
            };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const booking = await prismaDb.booking.findFirst({
                where: { id, is_deleted: false },
                include: bookingInclude,
            });

            if (!booking) {
                return { status: false, message: "Réservation non trouvée", code: 404 };
            }

            return { status: true, message: "Réservation trouvée", body: mapBooking(booking), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche de la réservation", code: 500 };
        }
    }

    static async findByTrip(tripId: number): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.booking.findMany({
                where: { generated_trip_id: tripId, is_deleted: false },
                include: bookingInclude,
                orderBy: { booking_date: 'desc' },
            });

            return { status: true, message: "Liste des réservations récupérée", body: rows.map(mapBooking), code: 200 };
        } catch (error: any) {
            return {
                status: false,
                message: `Erreur lors de la récupération des réservations: ${error.message || error.toString()}`,
                code: 500,
                exception: error.stack || error
            };
        }
    }

    static async findByUser(customerId: number): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.booking.findMany({
                where: { customer_id: customerId, is_deleted: false },
                include: bookingInclude,
                orderBy: { booking_date: 'desc' },
            });

            // Original ran every row through `normalizeNumericFields`
            // (pg-promise-era NUMERIC-as-string cleanup). Under native
            // Prisma, `total_price`/`base_price`/customer `loyalty_points`/
            // `wallet_balance` are genuine `Int` columns (already plain
            // `number`), and `seat_price_adjustment`/`taxes`/`discount`/
            // `trip_price` are `Decimal` — per this migration's standing
            // rule, Decimals stay as Decimal objects, not parsed to float.
            // The whole normalization step is therefore unnecessary now
            // and deliberately dropped, not an oversight.
            const bookings = rows.map((row) => mapBookingExtended(row, { busRegistrationKey: 'registration_number', busType: true, tripPrice: true }));

            return { status: true, message: "Liste des réservations récupérée", body: bookings, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des réservations par utilisateur", code: 500 };
        }
    }

    static async findByGroupId(groupId: string): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.booking.findMany({
                where: { group_id: groupId, is_deleted: false },
                include: bookingInclude,
                orderBy: { booking_date: 'desc' },
            });

            return { status: true, message: "Liste des réservations du groupe récupérée", body: rows.map(mapBooking), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des réservations par groupe ", code: 500 };
        }
    }

    static async findByStatus(status: string): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.booking.findMany({
                where: { status, is_deleted: false },
                include: bookingInclude,
                orderBy: { booking_date: 'desc' },
            });

            return { status: true, message: "Liste des réservations récupérée", body: rows.map(mapBooking), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des réservations par status ", code: 500 };
        }
    }

    static async findByDateRange(startDate: Date, endDate: Date): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.booking.findMany({
                where: { booking_date: { gte: startDate, lte: endDate }, is_deleted: false },
                include: bookingInclude,
                orderBy: { booking_date: 'desc' },
            });

            return { status: true, message: "Liste des réservations récupérée", body: rows.map(mapBooking), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des réservations par plage de date...", code: 500 };
        }
    }

    static async findAllWithDetails(agencyId?: number): Promise<ResponseModel> {
        try {
            const where: Prisma.bookingWhereInput = { is_deleted: false };
            if (agencyId) where.generated_trip = { trip: { agency_id: agencyId } };

            const rows = await prismaDb.booking.findMany({
                where,
                include: bookingInclude,
                orderBy: { booking_date: 'desc' },
            });

            const bookings = rows.map((row) => mapBookingExtended(row, { busRegistrationKey: 'registration_number', busType: true, tripPrice: true }));

            return { status: true, message: "Liste des réservations avec détails récupérée", body: bookings, code: 200 };
        } catch (error) {
            console.log(`Error in findAllWithDetails: ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la récupération des réservations avec details ...", code: 500 };
        }
    }

    // Suppression logique de toutes les réservations d'un groupe
    static async softDeleteByGroup(groupId: string): Promise<void> {
        await prismaDb.booking.updateMany({ where: { group_id: groupId }, data: { is_deleted: true } });
    }
}

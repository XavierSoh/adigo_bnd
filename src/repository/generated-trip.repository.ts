// ============================================
// 2. REPOSITORY - generated-trip.repository.ts
// ============================================
// Migrated to Prisma's native model API (prisma.generated_trip.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 2).
// All FK relations used below (bus, trip, trip.agency, the two staff
// driver/conductor relations, booking.generated_trip_id) are real
// `@relation`s in schema.prisma — no phantom-FK workarounds needed in this
// file, unlike contract_type/staff earlier in the migration.
import { Prisma } from "@prisma/client";
import prismaDb from "../config/prismaClient";
import { GeneratedTripModel } from "../models/generated_trip.model";
import ResponseModel from "../models/response.model";

// `json_build_object('id', b.id, ...) AS bus` selected an EXPLICIT column
// list from `bus`, not `SELECT b.*` — replicated with a matching Prisma
// `select` wherever bus is included, so no extra bus columns leak into the
// response body.
const busSelect = {
    id: true, registration_number: true, capacity: true, type: true,
    amenities: true, seat_layout: true, has_toilet: true, is_active: true,
    agency_id: true, is_deleted: true, deleted_at: true, deleted_by: true,
    created_by: true,
} satisfies Prisma.busSelect;

export class GeneratedTripRepository {
    // Create new generated trip
    static async create(generatedTrip: GeneratedTripModel): Promise<ResponseModel> {
        try {
            const result = await prismaDb.generated_trip.create({
                data: {
                    trip_id: generatedTrip.trip_id,
                    original_departure_time: generatedTrip.original_departure_time,
                    actual_departure_time: generatedTrip.actual_departure_time,
                    actual_arrival_time: generatedTrip.actual_arrival_time,
                    available_seats: generatedTrip.available_seats,
                    status: generatedTrip.status ?? 'scheduled',
                    driver_id: generatedTrip.driver_id,
                    conductor_id: generatedTrip.conductor_id,
                    bus_id: generatedTrip.bus_id,
                    notes: generatedTrip.notes,
                },
            });

            return { status: true, message: "Voyage généré créé", body: result, code: 201 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return { status: false, message: "Ce voyage existe déjà pour cette date/heure", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création du voyage généré", code: 500 };
        }
    }

    // Find by ID
    static async findById(id: number): Promise<ResponseModel> {
        try {
            const generatedTrip = await prismaDb.generated_trip.findUnique({
                where: { id },
                include: { bus: { select: busSelect } },
            });

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
            const data: Prisma.generated_tripUncheckedUpdateInput = { updated_at: new Date() };
            if (generatedTrip.trip_id != null) data.trip_id = generatedTrip.trip_id;
            if (generatedTrip.original_departure_time != null) data.original_departure_time = generatedTrip.original_departure_time;
            if (generatedTrip.actual_departure_time != null) data.actual_departure_time = generatedTrip.actual_departure_time;
            if (generatedTrip.actual_arrival_time != null) data.actual_arrival_time = generatedTrip.actual_arrival_time;
            if (generatedTrip.available_seats != null) data.available_seats = generatedTrip.available_seats;
            if (generatedTrip.status != null) data.status = generatedTrip.status;
            if (generatedTrip.driver_id != null) data.driver_id = generatedTrip.driver_id;
            if (generatedTrip.conductor_id != null) data.conductor_id = generatedTrip.conductor_id;
            if (generatedTrip.bus_id != null) data.bus_id = generatedTrip.bus_id;
            if (generatedTrip.notes != null) data.notes = generatedTrip.notes;

            const result = await prismaDb.generated_trip.update({ where: { id }, data });

            return { status: true, message: "Voyage généré mis à jour", body: result, code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Voyage généré non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la mise à jour du voyage généré", code: 500 };
        }
    }

    // Delete generated trip
    static async delete(id: number): Promise<ResponseModel> {
        try {
            await prismaDb.generated_trip.delete({ where: { id } });
            return { status: true, message: "Voyage généré supprimé", code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Voyage généré non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la suppression du voyage généré", code: 500 };
        }
    }

    // Find all generated trips
    static async findAll(): Promise<ResponseModel> {
        try {
            const generatedTrips = await prismaDb.generated_trip.findMany({
                include: { bus: { select: busSelect } },
                orderBy: { actual_departure_time: 'desc' },
            });

            return { status: true, message: "Liste des voyages générés récupérée", body: generatedTrips, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des voyages générés", code: 500 };
        }
    }

    // Find by trip ID
    static async findByTrip(tripId: number): Promise<ResponseModel> {
        try {
            const generatedTrips = await prismaDb.generated_trip.findMany({
                where: { trip_id: tripId },
                include: { bus: { select: busSelect } },
                orderBy: { actual_departure_time: 'desc' },
            });

            return { status: true, message: "Voyages générés récupérés", body: generatedTrips, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des voyages générés", code: 500 };
        }
    }

    // Find by status
    static async findByStatus(status: string): Promise<ResponseModel> {
        try {
            const generatedTrips = await prismaDb.generated_trip.findMany({
                where: { status },
                include: { bus: { select: busSelect } },
                orderBy: { actual_departure_time: 'desc' },
            });

            return { status: true, message: "Voyages générés récupérés", body: generatedTrips, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des voyages générés", code: 500 };
        }
    }

    // Find by date range
    static async findByDateRange(startDate: Date, endDate: Date): Promise<ResponseModel> {
        try {
            // `INNER JOIN trip` in the original == a required relation here
            // (generated_trip.trip_id is NOT NULL, `trip` is a required
            // `@relation`) — `include: { trip: ... }` always returns it,
            // matching the INNER JOIN's guarantee. Nested `trip.agency` was
            // a LEFT JOIN (`trip.agency_id` is nullable) — Prisma's include
            // on an optional relation returns `null` the same way.
            const rows = await prismaDb.generated_trip.findMany({
                where: {
                    actual_departure_time: { gte: startDate, lte: endDate },
                },
                include: {
                    bus: { select: busSelect },
                    trip: {
                        select: {
                            id: true, departure_city: true, arrival_city: true,
                            departure_time: true, arrival_time: true, price: true,
                            bus_id: true, agency_id: true, is_active: true,
                            valid_from: true, valid_until: true,
                            agency: { select: { id: true, name: true, logo: true, phone: true, email: true, address: true } },
                        },
                    },
                },
                orderBy: { actual_departure_time: 'asc' },
            });

            // `t.price::float` cast — Prisma returns `price` as a `Decimal`
            // object; `Number(...)` reproduces the float cast (this is a
            // read-only display cast, not a stored value, so float
            // precision loss here matches the original's own behavior).
            const generatedTrips = rows.map((row) => ({
                ...row,
                trip: { ...row.trip, price: Number(row.trip.price) },
            }));

            return { status: true, message: "Voyages générés récupérés", body: generatedTrips, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des voyages générés", code: 500 };
        }
    }

    // Find with details (joins)
    static async findAllWithDetails(
        agencyId?: number,
        status?: string,
        startDate?: Date,
        endDate?: Date,
        limit: number = 200,
        offset: number = 0
    ): Promise<ResponseModel> {
        try {
            const where: Prisma.generated_tripWhereInput = {};
            if (agencyId) where.trip = { agency_id: agencyId };
            if (status) where.status = status;
            if (startDate || endDate) {
                where.actual_departure_time = {
                    ...(startDate ? { gte: startDate } : {}),
                    ...(endDate ? { lte: endDate } : {}),
                };
            }

            const rows = await prismaDb.generated_trip.findMany({
                where,
                include: {
                    bus: { select: busSelect },
                    trip: { select: { departure_city: true, arrival_city: true, price: true, agency_id: true } },
                    staff_generated_trip_driver_idTostaff: { select: { first_name: true, last_name: true } },
                    staff_generated_trip_conductor_idTostaff: { select: { first_name: true, last_name: true } },
                },
                orderBy: { actual_departure_time: 'desc' },
                take: limit,
                skip: offset,
            });

            // `gt.available_seats` (a static column, never decremented by
            // bookings) is OVERWRITTEN in the original by a second,
            // same-named `GREATEST(b.capacity - taken, 0)` column derived
            // from real booking counts — Postgres resolves duplicate
            // column names to the last one. Reproduced with a single
          // `booking.groupBy` (one extra round trip, no per-row N+1) whose
            // counts are merged in and overwrite `available_seats` in JS.
            const ids = rows.map((r) => r.id);
            const occupancy = ids.length
                ? await prismaDb.booking.groupBy({
                    by: ['generated_trip_id'],
                    where: {
                        generated_trip_id: { in: ids },
                        status: { in: ['confirmed', 'pending', 'completed'] },
                        is_deleted: false,
                    },
                    _count: { _all: true },
                })
                : [];
            const takenById = new Map(occupancy.map((o) => [o.generated_trip_id, o._count._all]));

            const generatedTrips = rows.map((row) => {
                const { trip, staff_generated_trip_driver_idTostaff, staff_generated_trip_conductor_idTostaff, ...rest } = row;
                const taken = takenById.get(row.id) ?? 0;
                const capacity = row.bus?.capacity ?? 0;
                return {
                    ...rest,
                    departure_city: trip.departure_city,
                    arrival_city: trip.arrival_city,
                    // `t.price::int` — Postgres rounds numeric→int (half
                    // away from zero), reproduced with `Math.round`. Flagged:
                    // not guaranteed bit-identical on an exact .5 boundary,
                    // this is a display cast in a list endpoint, not a
                    // stored/financial value.
                    price: Math.round(Number(trip.price)),
                    agency_id: trip.agency_id,
                    driver_first_name: staff_generated_trip_driver_idTostaff?.first_name ?? null,
                    driver_last_name: staff_generated_trip_driver_idTostaff?.last_name ?? null,
                    conductor_first_name: staff_generated_trip_conductor_idTostaff?.first_name ?? null,
                    conductor_last_name: staff_generated_trip_conductor_idTostaff?.last_name ?? null,
                    available_seats: Math.max(capacity - taken, 0),
                };
            });

            return { status: true, message: "Voyages générés avec détails récupérés", body: generatedTrips, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des voyages générés", code: 500 };
        }
    }

    // Update status
    static async updateStatus(id: number, status: string): Promise<ResponseModel> {
        try {
            const result = await prismaDb.generated_trip.update({
                where: { id },
                data: { status, updated_at: new Date() },
            });

            return { status: true, message: "Statut mis à jour", body: result, code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Voyage généré non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la mise à jour du statut", code: 500 };
        }
    }

    // Get available seats count
    static async getAvailableSeatsCount(id: number): Promise<ResponseModel> {
        try {
            // Original used `pgOne` (throws on 0 rows) — a bad id here
            // fell through to the generic 500 below, not a 404. Reproduced
            // with an explicit throw on `null`, not a "fixed" 404.
            const result = await prismaDb.generated_trip.findUnique({
                where: { id },
                select: { available_seats: true },
            });
            if (!result) {
                throw new Error('Generated trip not found');
            }

            return { status: true, message: "Nombre de sièges disponibles récupéré", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges disponibles", code: 500 };
        }
    }

    // Update available seats
    static async updateAvailableSeats(id: number, availableSeats: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.generated_trip.update({
                where: { id },
                data: { available_seats: availableSeats, updated_at: new Date() },
            });

            return { status: true, message: "Sièges disponibles mis à jour", body: result, code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Voyage généré non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la mise à jour des sièges disponibles", code: 500 };
        }
    }

    // Assign staff (driver/conductor)
    static async assignStaff(id: number, driverId?: number, conductorId?: number): Promise<ResponseModel> {
        try {
            const data: Prisma.generated_tripUncheckedUpdateInput = { updated_at: new Date() };
            if (driverId != null) data.driver_id = driverId;
            if (conductorId != null) data.conductor_id = conductorId;

            const result = await prismaDb.generated_trip.update({ where: { id }, data });

            return { status: true, message: "Personnel assigné", body: result, code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Voyage généré non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de l'assignation du personnel", code: 500 };
        }
    }

    // Get statistics
    static async getStatistics(agencyId?: number): Promise<ResponseModel> {
        try {
            // Same conditional-SUM→multiple-.count()-calls conversion
            // established in customer.repository.ts's getStatistics: no
            // `SUM(CASE WHEN ...)` equivalent in the model API. `_sum` via
            // `.aggregate()` replaces the plain `SUM(available_seats)`.
            const where: Prisma.generated_tripWhereInput = agencyId ? { trip: { agency_id: agencyId } } : {};

            const [total, scheduled, boarding, departed, arrived, cancelled, seatsAgg] = await Promise.all([
                prismaDb.generated_trip.count({ where }),
                prismaDb.generated_trip.count({ where: { ...where, status: 'scheduled' } }),
                prismaDb.generated_trip.count({ where: { ...where, status: 'boarding' } }),
                prismaDb.generated_trip.count({ where: { ...where, status: 'departed' } }),
                prismaDb.generated_trip.count({ where: { ...where, status: 'arrived' } }),
                prismaDb.generated_trip.count({ where: { ...where, status: 'cancelled' } }),
                prismaDb.generated_trip.aggregate({ where, _sum: { available_seats: true } }),
            ]);

            const result = {
                total, scheduled, boarding, departed, arrived, cancelled,
                total_available_seats: seatsAgg._sum.available_seats ?? 0,
            };

            return { status: true, message: "Statistiques récupérées", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques", code: 500 };
        }
    }

    // Get the underlying trip's price for a generated trip — new method,
    // needed by booking.controller.ts's createMultiple() flow, which
    // previously did this itself via a raw
    // `SELECT t.price FROM trip t JOIN generated_trip gt ON gt.trip_id =
    // t.id WHERE gt.id = $1` inline in the controller (no repository
    // method existed for it at all before this conversion).
    static async getTripPrice(generatedTripId: number): Promise<ResponseModel> {
        try {
            const gt = await prismaDb.generated_trip.findUnique({
                where: { id: generatedTripId },
                select: { trip: { select: { price: true } } },
            });

            if (!gt || gt.trip.price == null) {
                return { status: false, message: "Trip not found or price not set", code: 404 };
            }

            return { status: true, message: "Prix du trajet récupéré", body: { price: gt.trip.price }, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération du prix", code: 500 };
        }
    }

    // Flattened generated-trip listing with driver name — new method,
    // needed by tripGeneration.controller.ts's getGeneratedTrips(), which
    // previously did this itself via a raw SQL JOIN inline in the
    // controller (no repository method existed for it before this
    // conversion). Deliberately a different flattened shape from
    // findByDateRange above (no nested trip/agency object, adds
    // driver_name) — matches this specific endpoint's original SELECT.
    static async findWithDriverDetailsByDateRange(startDate: Date, endDate: Date) {
        const rows = await prismaDb.generated_trip.findMany({
            where: { actual_departure_time: { gte: startDate, lte: endDate } },
            include: {
                trip: { select: { departure_city: true, arrival_city: true, price: true } },
                bus: { select: { registration_number: true, capacity: true } },
                staff_generated_trip_driver_idTostaff: { select: { first_name: true, last_name: true } },
            },
            orderBy: { actual_departure_time: 'asc' },
        });

        return rows.map((row) => {
            const { trip, bus, staff_generated_trip_driver_idTostaff, ...rest } = row;
            return {
                ...rest,
                departure_city: trip.departure_city,
                arrival_city: trip.arrival_city,
                price: trip.price,
                registration_number: bus?.registration_number ?? null,
                capacity: bus?.capacity ?? null,
                // `CONCAT(s.first_name, ' ', s.last_name)` — Postgres
                // CONCAT treats NULL as empty string rather than
                // propagating NULL; a trip with no driver yields a single
                // space, not null. Reproduced exactly.
                driver_name: `${staff_generated_trip_driver_idTostaff?.first_name ?? ''} ${staff_generated_trip_driver_idTostaff?.last_name ?? ''}`,
            };
        });
    }

    // Get available cities (unique departure and arrival cities from trips)
    static async getAvailableCities(): Promise<ResponseModel> {
        try {
            // `SELECT DISTINCT city FROM (departure UNION arrival) ORDER BY
            // city` — no UNION in the model API, reproduced with 2 distinct
            // queries merged/deduped/sorted in JS (2 round trips instead of
            // 1, same final set).
            const [departures, arrivals] = await Promise.all([
                prismaDb.trip.findMany({
                    where: { is_active: true },
                    select: { departure_city: true },
                    distinct: ['departure_city'],
                }),
                prismaDb.trip.findMany({
                    where: { is_active: true },
                    select: { arrival_city: true },
                    distinct: ['arrival_city'],
                }),
            ]);

            const citySet = new Set<string>();
            departures.forEach((r) => citySet.add(r.departure_city));
            arrivals.forEach((r) => citySet.add(r.arrival_city));
            const cities = Array.from(citySet).sort((a, b) => a.localeCompare(b));

            return { status: true, message: "Villes disponibles récupérées", body: cities, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des villes disponibles", code: 500 };
        }
    }
}

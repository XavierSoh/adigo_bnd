// Migrated to Prisma's native model API (prisma.trip.*,
// prisma.recurrence_pattern.*), including the real multi-statement
// transactions (create/update/delete) via prisma.$transaction(async (tx) =>
// {...}) — see BOOKING_MODULE_NOTES.md ("Full Prisma relational-API
// migration", tier 2).
//
// VERIFIED (not assumed) before converting this file: `valid_from`/
// `valid_until` are `@db.Date` — prisma-timezone-extension.ts's own header
// comment claims these need no write-side compensation the way naive
// `timestamp` columns do. Ran a live 3-way check (raw SQL insert vs. a read
// through the extended client vs. a create through the extended client
// re-checked via raw SQL) against this exact `trip` table: all three agreed
// bit-for-bit, confirming the extension is a genuine no-op on `@db.Date`
// fields here, not just "safe in theory." `recurrence_pattern.end_date` is
// the same native type (`@db.Date`) and gets the same pass-through treatment.
import { Prisma } from "@prisma/client";
import prismaDb from "../config/prismaClient";
import { TripModel } from "../models/trip.model";
import ResponseModel from "../models/response.model";
import { TripGenerationService } from "../services/tripGeneration.service";

const tripGenerationService = new TripGenerationService();

// `t.*` plus a flattened, JSON-parsed `recurrence_pattern` (or nothing, if
// there was none) — same shape reused by findById/findAllByAgency/findByRoute.
function attachRecurrencePattern<
    T extends {
        recurrence_pattern: {
            type: string; interval: number | null; days_of_week: string | null;
            end_date: Date | null; exceptions: string | null;
        } | null;
    }
>(row: T) {
    const { recurrence_pattern, ...rest } = row;
    if (!recurrence_pattern) return rest as Omit<T, 'recurrence_pattern'>;
    return {
        ...rest,
        recurrence_pattern: {
            type: recurrence_pattern.type,
            interval: recurrence_pattern.interval,
            days_of_week: recurrence_pattern.days_of_week ? JSON.parse(recurrence_pattern.days_of_week) : null,
            end_date: recurrence_pattern.end_date,
            exceptions: recurrence_pattern.exceptions ? JSON.parse(recurrence_pattern.exceptions) : null,
        },
    } as Omit<T, 'recurrence_pattern'> & { recurrence_pattern: any };
}

const recurrencePatternSelect = {
    type: true, interval: true, days_of_week: true, end_date: true, exceptions: true,
} satisfies Prisma.recurrence_patternSelect;

export class TripRepository {
    // NOTE ON ERROR HANDLING (preserved, not an oversight): the original
    // create/update/delete had NO repository-level try/catch around the
    // pgTransaction call itself — any thrown error (including the
    // deliberate `throw new Error(...)` on "not found") propagated all the
    // way to trip.controller.ts's own catch, which returns ITS OWN generic
    // 500 message ("Erreur interne du serveur"), never this repository's
    // message text. That is reproduced exactly below: no top-level
    // try/catch on these three methods. A "not found" on update/delete is
    // therefore a 500 from the controller, not a clean 404 — a real,
    // pre-existing quirk, not something to silently fix here.
    static async create(trip: TripModel): Promise<ResponseModel> {
        return await prismaDb.$transaction(async (tx) => {
            let recurrencePatternId: number | null = null;

            if (trip.recurrence_pattern) {
                const rp = await tx.recurrence_pattern.create({
                    data: {
                        type: trip.recurrence_pattern.type,
                        interval: trip.recurrence_pattern.interval,
                        days_of_week: trip.recurrence_pattern.days_of_week ? JSON.stringify(trip.recurrence_pattern.days_of_week) : null,
                        end_date: trip.recurrence_pattern.end_date,
                        exceptions: trip.recurrence_pattern.exceptions ? JSON.stringify(trip.recurrence_pattern.exceptions) : null,
                    },
                    select: { id: true },
                });
                recurrencePatternId = rp.id;
            }

            trip.departure_time.setSeconds(0, 0);
            trip.arrival_time.setSeconds(0, 0);

            const result = await tx.trip.create({
                data: {
                    departure_city: trip.departure_city,
                    arrival_city: trip.arrival_city,
                    departure_time: trip.departure_time,
                    arrival_time: trip.arrival_time,
                    price: trip.price,
                    bus_id: trip.bus_id,
                    agency_id: trip.agency_id,
                    is_active: trip.is_active ?? true,
                    cancellation_policy: trip.cancellation_policy,
                    is_deleted: trip.is_deleted ?? false,
                    recurrence_pattern_id: recurrencePatternId,
                    valid_from: trip.valid_from,
                    valid_until: trip.valid_until,
                    created_by: trip.created_by,
                },
            });

            return { status: true, message: 'Trip créé', body: result, code: 201 };
        });
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const trip = await prismaDb.trip.findFirst({
                where: { id, is_deleted: false },
                include: { recurrence_pattern: { select: recurrencePatternSelect } },
            });

            if (!trip) {
                return { status: false, message: 'Trip non trouvé', code: 404 };
            }

            return { status: true, message: 'Trip trouvé', body: attachRecurrencePattern(trip), code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la recherche', code: 500 };
        }
    }

    static async update(id: number, trip: Partial<TripModel>): Promise<ResponseModel> {
        return await prismaDb.$transaction(async (tx) => {
            let recurrencePatternId: number | null = null;

            if (trip.recurrence_pattern) {
                const existingTrip = await tx.trip.findUnique({
                    where: { id },
                    select: { recurrence_pattern_id: true },
                });

                if (existingTrip?.recurrence_pattern_id) {
                    const rpData: Prisma.recurrence_patternUpdateInput = {};
                    if (trip.recurrence_pattern.type != null) rpData.type = trip.recurrence_pattern.type;
                    if (trip.recurrence_pattern.interval != null) rpData.interval = trip.recurrence_pattern.interval;
                    if (trip.recurrence_pattern.days_of_week != null) rpData.days_of_week = JSON.stringify(trip.recurrence_pattern.days_of_week);
                    if (trip.recurrence_pattern.end_date != null) rpData.end_date = trip.recurrence_pattern.end_date;
                    if (trip.recurrence_pattern.exceptions != null) rpData.exceptions = JSON.stringify(trip.recurrence_pattern.exceptions);

                    await tx.recurrence_pattern.update({
                        where: { id: existingTrip.recurrence_pattern_id },
                        data: rpData,
                    });
                    recurrencePatternId = existingTrip.recurrence_pattern_id;
                } else {
                    const rp = await tx.recurrence_pattern.create({
                        data: {
                            type: trip.recurrence_pattern.type,
                            interval: trip.recurrence_pattern.interval,
                            days_of_week: trip.recurrence_pattern.days_of_week ? JSON.stringify(trip.recurrence_pattern.days_of_week) : null,
                            end_date: trip.recurrence_pattern.end_date,
                            exceptions: trip.recurrence_pattern.exceptions ? JSON.stringify(trip.recurrence_pattern.exceptions) : null,
                        },
                        select: { id: true },
                    });
                    recurrencePatternId = rp.id;
                }
            }

            const data: Prisma.tripUncheckedUpdateInput = { updated_at: new Date() };
            if (trip.departure_city != null) data.departure_city = trip.departure_city;
            if (trip.arrival_city != null) data.arrival_city = trip.arrival_city;
            if (trip.departure_time != null) data.departure_time = trip.departure_time;
            if (trip.arrival_time != null) data.arrival_time = trip.arrival_time;
            if (trip.price != null) data.price = trip.price;
            if (trip.bus_id != null) data.bus_id = trip.bus_id;
            if (trip.agency_id != null) data.agency_id = trip.agency_id;
            if (trip.is_active != null) data.is_active = trip.is_active;
            if (trip.cancellation_policy != null) data.cancellation_policy = trip.cancellation_policy;
            if (recurrencePatternId != null) data.recurrence_pattern_id = recurrencePatternId;
            if (trip.valid_from != null) data.valid_from = trip.valid_from;
            if (trip.valid_until != null) data.valid_until = trip.valid_until;

            // Compound `WHERE id = $13 AND is_deleted = FALSE` — a single
            // unique-field `.update()` can't express the extra guard, so
            // updateMany+refetch (the pattern established throughout this
            // migration) is used instead.
            const updateResult = await tx.trip.updateMany({ where: { id, is_deleted: false }, data });

            if (updateResult.count === 0) {
                throw new Error('Trip not found or deleted');
            }

            const result = await tx.trip.findUnique({ where: { id } });

            return { status: true, message: 'Trip mis à jour', body: result, code: 200 };
        });
    }

    static async softDelete(id: number, deleted_by: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.trip.updateMany({
                where: { id, is_deleted: false },
                data: { is_deleted: true, deleted_at: new Date(), deleted_by },
            });
            if (result.count === 0) {
                return { status: false, message: 'Trip non trouvé ou déjà supprimé', code: 404 };
            }
            return { status: true, message: 'Trip supprimé temporairement', code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la suppression', code: 500 };
        }
    }

    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.trip.updateMany({
                where: { id, is_deleted: true },
                data: { is_deleted: false, deleted_at: null, deleted_by: null },
            });
            if (result.count === 0) {
                return { status: false, message: 'Trip non trouvé ou déjà restauré', code: 404 };
            }
            return { status: true, message: 'Trip restauré', code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la restauration', code: 500 };
        }
    }

    static async delete(id: number): Promise<ResponseModel> {
        return await prismaDb.$transaction(async (tx) => {
            // Get recurrence pattern id before deleting trip
            const trip = await tx.trip.findUnique({
                where: { id },
                select: { recurrence_pattern_id: true },
            });

            // `deleteMany` (not `.delete()`) so a missing id returns
            // `{count: 0}` instead of throwing P2025 — matches the
            // original's `pgResult` + `rowCount` check exactly.
            const result = await tx.trip.deleteMany({ where: { id } });

            if (result.count === 0) {
                throw new Error('Trip not found');
            }

            if (trip?.recurrence_pattern_id) {
                await tx.recurrence_pattern.delete({ where: { id: trip.recurrence_pattern_id } });
            }

            return { status: true, message: 'Trip supprimé définitivement', code: 200 };
        });
    }

    static async findAllByAgency(agencyId: number, isDeleted: boolean = false): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.trip.findMany({
                where: { agency_id: agencyId, is_deleted: isDeleted },
                select: {
                    id: true, departure_city: true, arrival_city: true, departure_time: true,
                    arrival_time: true, bus_id: true, agency_id: true, is_active: true,
                    cancellation_policy: true, is_deleted: true, deleted_at: true, updated_at: true,
                    deleted_by: true, created_by: true, price: true, valid_from: true, valid_until: true,
                    recurrence_pattern: { select: recurrencePatternSelect },
                    bus: { select: { registration_number: true } },
                },
                orderBy: { departure_time: 'asc' },
            });

            const trips = rows.map((row) => {
                const { bus, price, ...rest } = row;
                return {
                    ...attachRecurrencePattern(rest),
                    // `t.price::INT` — Postgres numeric→int rounding
                    // (half away from zero), reproduced with `Math.round`.
                    price: Math.round(Number(price)),
                    bus_registration_number: bus?.registration_number ?? null,
                };
            });

            return { status: true, message: 'Liste des trips récupérée', body: trips, code: 200 };
        } catch (error) {
            console.log(error)
            return { status: false, message: `Erreur lors de la récupération des trips ${JSON.stringify(error)}`, code: 500, };
        }
    }

    static async findByRoute(
        departureCity: string,
        arrivalCity: string,
        departureDate?: Date,
        minSeats?: number
    ): Promise<ResponseModel> {
        try {
            // Two real, separate bugs here, both flagged live 2026-09-22
            // ("j'ai créé des voyages mais... rien ne s'affiche") against a
            // brand-new route whose service starts tomorrow:
            //
            // 1. `valid_from: { lte: new Date() }` compared a trip's start
            //    of service against *right now*, not against whatever date
            //    is actually being searched for - a trip starting service
            //    tomorrow could never be found today even when explicitly
            //    searching for tomorrow's date. Fixed by comparing against
            //    `departureDate` when one is given.
            // 2. With no date given at all, the old code still silently
            //    demanded "valid right now" - per explicit product
            //    decision, a plain route search (no date picked yet) should
            //    surface every active route regardless of its validity
            //    window, so the customer can see it exists before narrowing
            //    down to a specific day. No valid_from/valid_until filter
            //    at all in that case.
            //
            // The literal `departure_time` day-match this replaced was also
            // wrong for any *recurring* trip (daily/weekly): that column
            // only ever holds the template's own single anchor timestamp,
            // so a search for any day other than that exact anchor date
            // returned nothing even though the trip demonstrably runs that
            // day. Recurrence is now evaluated in JS below, reusing
            // TripGenerationService's own isValidDateForTrip - the same
            // logic that decides which dates actually get generated - so
            // "found by search" and "actually generated/bookable" can never
            // disagree.
            const where: Prisma.tripWhereInput = {
                departure_city: departureCity,
                arrival_city: arrivalCity,
                is_deleted: false,
                is_active: true,
                ...(departureDate
                    ? {
                        valid_from: { lte: departureDate },
                        OR: [{ valid_until: null }, { valid_until: { gte: departureDate } }],
                    }
                    : {}),
            };

            let rows = await prismaDb.trip.findMany({
                where,
                include: { recurrence_pattern: { select: recurrencePatternSelect } },
                orderBy: { departure_time: 'asc' },
            });

            // Remaining-seats-for-that-day, keyed by trip id once computed
            // below - a `trip` template row has no seat concept of its own
            // (capacity lives on the bus assigned to a specific day's
            // generated_trip instance, and occupancy varies day to day with
            // real bookings against that instance), so this can only be
            // known once departureDate narrows the search to one concrete
            // day. Reported live 2026-09-22: "est-ce que la recherche tient
            // compte du nombre de passagers restants" - it didn't at all
            // before this.
            const seatsByTripId = new Map<number, number>();

            if (departureDate) {
                // Same field-flattening TripGenerationService.
                // generateTripsForPeriod itself uses before calling this
                // exact method - isValidDateForTrip has no idea about the
                // nested `recurrence_pattern` shape Prisma's `include`
                // returns.
                const flattenedRows = rows.map((row) => ({
                    row,
                    flattened: {
                        ...row,
                        recurrence_type: row.recurrence_pattern?.type ?? null,
                        interval: row.recurrence_pattern?.interval ?? null,
                        days_of_week: row.recurrence_pattern?.days_of_week ?? null,
                        exceptions: row.recurrence_pattern?.exceptions ?? null,
                    },
                }));

                const matches = flattenedRows.filter(({ flattened }) =>
                    tripGenerationService.isValidDateForTrip(flattened, departureDate)
                );

                // Ensures the concrete day's bookable instance exists (the
                // daily cron only materializes ~7 days ahead - see
                // ensureInstanceExists's doc comment) so "found by search"
                // always has a real generated_trip to check capacity
                // against and to actually book, however far in advance the
                // search is.
                const instances = await Promise.all(
                    matches.map(({ flattened }) => tripGenerationService.ensureInstanceExists(flattened, departureDate))
                );

                const instanceIds = instances.filter((i): i is NonNullable<typeof i> => i != null).map((i) => i.id);
                const occupancy = instanceIds.length
                    ? await prismaDb.booking.groupBy({
                        by: ['generated_trip_id'],
                        where: { generated_trip_id: { in: instanceIds }, status: { in: ['confirmed', 'pending', 'completed'] }, is_deleted: false },
                        _count: { _all: true },
                    })
                    : [];
                const takenByInstanceId = new Map(occupancy.map((o) => [o.generated_trip_id, o._count._all]));

                matches.forEach(({ row }, i) => {
                    const instance = instances[i];
                    if (!instance) return;
                    // `instance.available_seats` is a write-once snapshot of
                    // the assigned bus's capacity at creation time (never
                    // itself decremented - see findAllWithDetails's own
                    // identical comment), so it doubles as "capacity" here;
                    // real remaining seats is that minus bookings actually
                    // taken against this specific instance.
                    const taken = takenByInstanceId.get(instance.id) ?? 0;
                    seatsByTripId.set(row.id, Math.max((instance.available_seats ?? 0) - taken, 0));
                });

                rows = matches
                    .map(({ row }) => row)
                    .filter((row) => minSeats == null || (seatsByTripId.get(row.id) ?? 0) >= minSeats);
            }

            // Original had a defensive `typeof price === 'string' ?
            // parseFloat(price) : price` (a pg-promise-era quirk). Native
            // Prisma returns `price` as a `Decimal` object whose own
            // `.toJSON()`/`.toString()` already preserves full precision —
            // per this migration's established rule (see
            // prisma-timezone-extension.ts's header), that's correct as-is
            // and is NOT converted to a float here; this is a deliberate,
            // positive behavior difference (full precision vs. the
            // original's occasional float), not an oversight.
            const trips = rows.map((row) => ({
                ...attachRecurrencePattern(row),
                // Only present when departureDate was given - a bare route
                // search (no date picked yet) has no single day's capacity
                // to report.
                ...(seatsByTripId.has(row.id) ? { available_seats: seatsByTripId.get(row.id) } : {}),
            }));

            return { status: true, message: 'Trips trouvés', body: trips, code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la recherche de trips', code: 500 };
        }
    }
}

// ============================================
// REPOSITORY - generated-trip-seat.repository.ts
// ============================================
// Migrated to Prisma's native model API (prisma.generated_trip_seat.*) —
// see BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration",
// tier 4).
//
// SCHEMA DISCREPANCY FLAGGED, not silently relied on: `booking
// .generated_trip_seat_id` carries only a PARTIAL unique index (unique
// among confirmed/pending rows only — see schema.prisma's `@unique(map:
// "idx_no_double_booking", where: ...)`), but Prisma's introspection
// modeled the reverse side (`generated_trip_seat.booking`) as a plain
// to-one relation, which assumes global 1:1. If a seat ever has BOTH a
// cancelled booking and a later confirmed one (a realistic sequence:
// book → cancel → rebook), that relation could resolve ambiguously.
// Every "live status"/occupancy lookup below therefore queries `booking`
// directly with its own explicit status/is_deleted filter (exactly
// mirroring the original SQL's JOIN conditions) instead of ever using
// the `generated_trip_seat.booking` relation, sidestepping that risk
// entirely.
import { Prisma } from "@prisma/client";
import prismaDb from "../config/prismaClient";
import ResponseModel from "../models/response.model";

const seatSelect = {
    id: true, bus_id: true, seat_number: true, row_number: true, column_position: true,
    seat_type: true, is_active: true,
} satisfies Prisma.seatSelect;

const busSelect = {
    id: true, registration_number: true, capacity: true, type: true, amenities: true, seat_layout: true,
    has_toilet: true, is_active: true, agency_id: true, is_deleted: true, deleted_at: true, deleted_by: true,
    created_by: true,
} satisfies Prisma.busSelect;

const gtsWithSeat = { seat: { select: seatSelect } } satisfies Prisma.generated_trip_seatInclude;
const gtsWithSeatAndBus = {
    seat: { select: seatSelect },
    generated_trip: { select: { bus: { select: busSelect } } },
} satisfies Prisma.generated_trip_seatInclude;

type GtsWithSeat = Prisma.generated_trip_seatGetPayload<{ include: typeof gtsWithSeat }>;
type GtsWithSeatAndBus = Prisma.generated_trip_seatGetPayload<{ include: typeof gtsWithSeatAndBus }>;

// gts.status is only ever hand-written (blocked/maintenance seats) —
// nothing updates it when a booking is created or cancelled, so it
// silently goes stale the moment a real booking happens. The `booking`
// table is the actual source of truth — derive the seat's live status
// from an active (confirmed/pending, not deleted) booking row instead of
// trusting gts.status for available/reserved/booked.
function liveStatus(rawStatus: string | null, activeBookingStatus?: string): string {
    if (activeBookingStatus === 'confirmed') return 'booked';
    if (activeBookingStatus === 'pending') return 'reserved';
    return rawStatus ?? 'available';
}

function mapSeat(row: GtsWithSeat, activeBookingStatus?: string) {
    const { seat, status, price_adjustment, ...rest } = row;
    return {
        ...rest,
        status: liveStatus(status, activeBookingStatus),
        // `gts.price_adjustment::int` — the original's own explicit SQL
        // cast, reproduced with Math.round (Postgres numeric→int rounds).
        price_adjustment: Math.round(Number(price_adjustment ?? 0)),
        seat,
    };
}

function mapSeatWithBus(row: GtsWithSeatAndBus, activeBookingStatus?: string) {
    const { generated_trip, ...rest } = row;
    return { ...mapSeat(rest as GtsWithSeat, activeBookingStatus), bus: generated_trip?.bus ?? null };
}

/** Batches the "is there an active (confirmed/pending, not deleted)
 * booking for this seat row" lookup across every seat of a trip in one
 * query, instead of one per seat. */
async function activeBookingStatusesByGtsId(generatedTripId: number, gtsIds: number[]): Promise<Map<number, string>> {
    if (gtsIds.length === 0) return new Map();
    const bookings = await prismaDb.booking.findMany({
        where: {
            generated_trip_id: generatedTripId,
            generated_trip_seat_id: { in: gtsIds },
            status: { in: ['confirmed', 'pending'] },
            is_deleted: false,
        },
        select: { generated_trip_seat_id: true, status: true },
    });
    return new Map(bookings.map((b) => [b.generated_trip_seat_id, b.status]));
}

export class GeneratedTripSeatRepository {

    // Find seat by ID
    static async findById(id: number): Promise<ResponseModel> {
        try {
            const gts = await prismaDb.generated_trip_seat.findUnique({ where: { id }, include: gtsWithSeat });
            if (!gts) {
                return { status: false, message: "Siège non trouvé | No seat FOUND", code: 404 };
            }

            const statuses = await activeBookingStatusesByGtsId(gts.generated_trip_id, [id]);

            return { status: true, message: "Siège trouvé", body: mapSeat(gts, statuses.get(id)), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche du siège", code: 500 };
        }
    }

    // Find all seats for a generated trip
    static async findByGeneratedTrip(generatedTripId: number): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.generated_trip_seat.findMany({
                where: { generated_trip_id: generatedTripId },
                include: gtsWithSeatAndBus,
                orderBy: { id: 'asc' },
            });
            const statuses = await activeBookingStatusesByGtsId(generatedTripId, rows.map((r) => r.id));

            const seats = rows.map((r) => mapSeatWithBus(r, statuses.get(r.id)));
            return { status: true, message: "Sièges du voyage généré récupérés", body: seats, code: 200 };
        } catch (error) {
            console.log(`Error ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la récupération des sièges", code: 500 };
        }
    }

    // Find by seat status (available, reserved, booked, blocked) — filters
    // on the same live-derived status BASE_SELECT exposes, not the stale
    // column. No server-side way to filter on a derived value, so this
    // fetches every seat for the trip and filters in JS after computing it.
    static async findByStatus(generatedTripId: number, status: string): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.generated_trip_seat.findMany({
                where: { generated_trip_id: generatedTripId },
                include: gtsWithSeatAndBus,
                orderBy: { id: 'asc' },
            });
            const statuses = await activeBookingStatusesByGtsId(generatedTripId, rows.map((r) => r.id));

            const seats = rows
                .map((r) => mapSeatWithBus(r, statuses.get(r.id)))
                .filter((s) => s.status === status);
            return { status: true, message: "Sièges récupérés par statut", body: seats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges par statut", code: 500 };
        }
    }

    // Count available seats — a seat only counts as available if it isn't
    // blocked/maintenance (gts.status, the raw stored column — NOT the
    // live-derived status other methods use) AND has no active (confirmed
    // or pending, not deleted) booking against it.
    static async countAvailable(generatedTripId: number): Promise<ResponseModel> {
        try {
            const activeBookings = await prismaDb.booking.findMany({
                where: { generated_trip_id: generatedTripId, status: { in: ['confirmed', 'pending'] }, is_deleted: false },
                select: { generated_trip_seat_id: true },
            });
            const bookedIds = activeBookings.map((b) => b.generated_trip_seat_id);

            const available_count = await prismaDb.generated_trip_seat.count({
                where: { generated_trip_id: generatedTripId, status: 'available', id: { notIn: bookedIds } },
            });

            return { status: true, message: "Nombre de sièges disponibles récupéré", body: { available_count }, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors du comptage des sièges disponibles", code: 500 };
        }
    }

    // Find all with seat details (join with seat + bus)
    static async findWithDetails(generatedTripId: number): Promise<ResponseModel> {
        try {
            console.log(`Fetching details for generated trip ID: ${generatedTripId}`);
            const rows = await prismaDb.generated_trip_seat.findMany({
                where: { generated_trip_id: generatedTripId },
                include: gtsWithSeatAndBus,
                orderBy: [{ seat: { row_number: 'asc' } }, { seat: { column_position: 'asc' } }],
            });
            const statuses = await activeBookingStatusesByGtsId(generatedTripId, rows.map((r) => r.id));

            const seats = rows.map((r) => mapSeatWithBus(r, statuses.get(r.id)));
            return { status: true, message: "Détails des sièges récupérés", body: seats, code: 200 };
        } catch (error) {
            console.log(`Error ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la récupération des détails des sièges", code: 500 };
        }
    }

    // Find available seats with details
    static async findAvailableWithDetails(generatedTripId: number): Promise<ResponseModel> {
        try {
            const activeBookings = await prismaDb.booking.findMany({
                where: { generated_trip_id: generatedTripId, status: { in: ['confirmed', 'pending'] }, is_deleted: false },
                select: { generated_trip_seat_id: true },
            });
            const bookedIds = activeBookings.map((b) => b.generated_trip_seat_id);

            const rows = await prismaDb.generated_trip_seat.findMany({
                where: { generated_trip_id: generatedTripId, status: 'available', id: { notIn: bookedIds } },
                include: gtsWithSeatAndBus,
                orderBy: [{ seat: { row_number: 'asc' } }, { seat: { column_position: 'asc' } }],
            });

            const seats = rows.map((r) => mapSeatWithBus(r));
            return { status: true, message: "Sièges disponibles récupérés", body: seats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges disponibles", code: 500 };
        }
    }

    // Find booked seats with details — only CONFIRMED bookings count here
    // (unlike the general "active" confirmed-or-pending filter every other
    // method above uses), matching the original's `bk.status = 'confirmed'`.
    static async findBookedWithDetails(generatedTripId: number): Promise<ResponseModel> {
        try {
            const confirmedBookings = await prismaDb.booking.findMany({
                where: { generated_trip_id: generatedTripId, status: 'confirmed', is_deleted: false },
                select: { generated_trip_seat_id: true },
            });
            const bookedIds = confirmedBookings.map((b) => b.generated_trip_seat_id);

            const rows = await prismaDb.generated_trip_seat.findMany({
                where: { generated_trip_id: generatedTripId, id: { in: bookedIds } },
                include: gtsWithSeatAndBus,
                orderBy: [{ seat: { row_number: 'asc' } }, { seat: { column_position: 'asc' } }],
            });

            const seats = rows.map((r) => mapSeatWithBus(r, 'confirmed'));
            return { status: true, message: "Sièges réservés récupérés", body: seats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges réservés", code: 500 };
        }
    }

    // Read the RAW status column, unfiltered by the live-derived
    // available/reserved/booked logic every other read method above
    // applies — new method, needed by booking.controller.ts's
    // modifySingle() flow (checks the raw column directly before
    // swapping seats), which previously did this itself via a raw
    // `SELECT id, status FROM generated_trip_seat WHERE id = $1 AND
    // generated_trip_id = $2` inline in the controller (no repository
    // method existed for it at all before this conversion). Deliberately
    // distinct from findById(), which derives status from active
    // bookings instead of trusting this column.
    static async findRawStatus(id: number, generatedTripId: number): Promise<{ id: number; status: string | null } | null> {
        return prismaDb.generated_trip_seat.findFirst({
            where: { id, generated_trip_id: generatedTripId },
            select: { id: true, status: true },
        });
    }

    // Set a seat's raw status column directly (blocked/maintenance/manual
    // override, or resetting it back to 'available' after a booking
    // change) — new method, needed by booking.controller.ts's
    // modifySingle() seat-swap flow, which previously wrote this via a
    // raw `UPDATE generated_trip_seat SET status = $1 WHERE id = $2`
    // inline in the controller (no repository method existed for it at
    // all before this conversion).
    static async setStatus(id: number, status: string): Promise<void> {
        await prismaDb.generated_trip_seat.updateMany({ where: { id }, data: { status } });
    }
}

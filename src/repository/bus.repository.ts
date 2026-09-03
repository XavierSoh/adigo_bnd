// Migrated to Prisma's native model API (prisma.bus.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
// Timestamp compensation is handled globally by prisma-timezone-extension.ts
// (applied once in prismaClient.ts), not per-call here.
import prismaDb from "../config/prismaClient";
import { Prisma } from "@prisma/client";
import { BusModel } from "../models/bus.model";
import ResponseModel from "../models/response.model";

export class BusRepository {
    static async create(bus: BusModel): Promise<ResponseModel> {
        try {
            // AMBIGUOUS CASE, flagged not guessed: the original raw INSERT
            // bound every field positionally, so an `undefined` BusModel
            // field was sent to Postgres as an explicit NULL. Prisma's
            // `.create()` instead *omits* an `undefined` field, falling back
            // to the column's schema default. Only matters if a caller ever
            // constructs a BusModel with a field truly left `undefined`
            // (not just falsy) for a nullable column — restructured per
            // instruction, not preserved byte-for-byte.
            const result = await prismaDb.bus.create({
                data: {
                    registration_number: bus.registration_number,
                    capacity: bus.capacity,
                    type: bus.type,
                    amenities: bus.amenities,
                    seat_layout: bus.seat_layout,
                    has_toilet: bus.has_toilet,
                    is_active: bus.is_active,
                    agency_id: bus.agency_id,
                    created_by: bus.created_by,
                },
            });
            return { status: true, message: 'Bus créé', body: result, code: 201 };
        } catch (error) {
            console.log(`Error >>>>>>>>>>>>>> ${JSON.stringify(error)}`)
            return { status: false, message: 'Erreur création bus', code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const bus = await prismaDb.bus.findFirst({
                where: { id, is_deleted: false },
            });
            if (!bus) {
                return { status: false, message: 'Bus non trouvé', code: 404 };
            }
            return { status: true, message: 'Bus trouvé', body: bus, code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la recherche', code: 500 };
        }
    }

    static async update(id: number, bus: Partial<BusModel>): Promise<ResponseModel> {
        try {
            // COALESCE($n, col) in the original == "only touch fields that
            // were actually provided" — Prisma's `.update()` already has
            // that semantics natively: an omitted key in `data` leaves the
            // column untouched (unlike `.create()`, `undefined` values here
            // are stripped by the object-literal construction below, so
            // there's no undefined-vs-null ambiguity for `.update()`).
            // "Unchecked" variant: sets the raw agency_id FK scalar directly,
            // same as the original `agency_id = COALESCE($8, agency_id)` —
            // no relation-connect ceremony, matching prior behavior exactly.
            const data: Prisma.busUncheckedUpdateInput = {};
            if (bus.registration_number !== undefined) data.registration_number = bus.registration_number;
            if (bus.capacity !== undefined) data.capacity = bus.capacity;
            if (bus.type !== undefined) data.type = bus.type;
            if (bus.amenities !== undefined) data.amenities = bus.amenities;
            if (bus.seat_layout !== undefined) data.seat_layout = bus.seat_layout;
            if (bus.has_toilet !== undefined) data.has_toilet = bus.has_toilet;
            if (bus.is_active !== undefined) data.is_active = bus.is_active;
            if (bus.agency_id !== undefined) data.agency_id = bus.agency_id;

            const result = await prismaDb.bus.updateMany({
                where: { id, is_deleted: false },
                data,
            });
            if (result.count === 0) {
                return { status: false, message: 'Bus non trouvé ou supprimé', code: 404 };
            }
            const updated = await prismaDb.bus.findUnique({ where: { id } });
            return { status: true, message: 'Bus mis à jour', body: updated, code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la mise à jour', code: 500 };
        }
    }

    static async softDelete(id: number, deleted_by: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.bus.updateMany({
                where: { id, is_deleted: false },
                data: { is_deleted: true, deleted_at: new Date(), deleted_by },
            });
            if (result.count === 0) {
                return { status: false, message: 'Bus non trouvé ou déjà supprimé', code: 404 };
            }
            return { status: true, message: 'Bus supprimé temporairement', code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la suppression', code: 500 };
        }
    }

    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.bus.updateMany({
                where: { id, is_deleted: true },
                data: { is_deleted: false, deleted_at: null, deleted_by: null },
            });
            if (result.count === 0) {
                return { status: false, message: 'Bus non trouvé ou déjà restauré', code: 404 };
            }
            return { status: true, message: 'Bus restauré', code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la restauration', code: 500 };
        }
    }

    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.bus.deleteMany({ where: { id } });
            if (result.count === 0) {
                return { status: false, message: 'Bus non trouvé', code: 404 };
            }
            return { status: true, message: 'Bus supprimé définitivement', code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la suppression définitive', code: 500 };
        }
    }

    static async findAllByAgency(agencyId: number, isDeleted: boolean): Promise<ResponseModel> {
        try {
            const buses = await prismaDb.bus.findMany({
                where: { agency_id: agencyId, is_deleted: isDeleted },
            });
            return { status: true, message: 'Liste des bus récupérée', body: buses, code: 200 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la récupération des bus', code: 500 };
        }
    }

    static async bulkCreate(buses: BusModel[]): Promise<ResponseModel> {
        if (!buses || buses.length === 0) {
            return { status: false, message: 'Aucun bus à créer', code: 400 };
        }
        try {
            // AMBIGUOUS CASE, flagged not guessed: `createMany()` doesn't
            // return the created rows (Postgres driver limitation Prisma
            // inherits) — the original hand-rolled multi-row INSERT used
            // `RETURNING *`. Restructured into createMany + a follow-up
            // findMany by registration_number (unique) to recover the same
            // response shape; this is 2 round trips instead of 1.
            await prismaDb.bus.createMany({
                data: buses.map((bus) => ({
                    registration_number: bus.registration_number,
                    capacity: bus.capacity,
                    type: bus.type,
                    amenities: bus.amenities,
                    seat_layout: bus.seat_layout,
                    has_toilet: bus.has_toilet,
                    is_active: bus.is_active,
                    agency_id: bus.agency_id,
                    created_by: bus.created_by,
                })),
            });
            const result = await prismaDb.bus.findMany({
                where: { registration_number: { in: buses.map((b) => b.registration_number) } },
            });
            if (result.length === 0) {
                return { status: false, message: 'Erreur lors de la création en masse', code: 500 };
            }
            return { status: true, message: 'Bus créés en masse', body: result, code: 201 };
        } catch (error) {
            return { status: false, message: 'Erreur lors de la création en masse', code: 500 };
        }
    }

}

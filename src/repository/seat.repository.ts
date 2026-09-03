// Migrated to Prisma's native model API (prisma.seat.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
import { Prisma } from "@prisma/client";
import prismaDb from "../config/prismaClient";
import { Seat } from "../models/seat.model";
import ResponseModel from "../models/response.model";

export class SeatRepository {
    static async create(seat: Seat): Promise<ResponseModel> {
        try {
            // AMBIGUOUS CASE, flagged not guessed: the `Seat` TS interface
            // declares seat_number as `string` (e.g. "A1"), but the real DB
            // column (and every seat row already in it) is `Int` — a
            // pre-existing mismatch the raw-SQL path tolerated silently (pg
            // casts a numeric-looking string parameter into an int column).
            // Prisma's typed client won't accept a string here at compile
            // time; coerced with Number() to keep the same runtime behavior.
            const result = await prismaDb.seat.create({
                data: {
                    bus_id: seat.bus_id,
                    seat_number: Number(seat.seat_number),
                    seat_type: seat.seat_type,
                    is_active: seat.is_active ?? true,
                },
            });

            return { status: true, message: "Siège créé", body: result, code: 201 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la création du siège", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const seat = await prismaDb.seat.findFirst({
                where: { id, is_active: true },
            });

            if (!seat) {
                return { status: false, message: "Siège non trouvé", code: 404 };
            }

            return { status: true, message: "Siège trouvé", body: seat, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche du siège", code: 500 };
        }
    }

    static async update(id: number, seat: Partial<Seat>): Promise<ResponseModel> {
        try {
            const data: Prisma.seatUncheckedUpdateInput = {};
            if (seat.bus_id !== undefined) data.bus_id = seat.bus_id;
            if (seat.seat_number !== undefined) data.seat_number = Number(seat.seat_number);
            if (seat.seat_type !== undefined) data.seat_type = seat.seat_type;
            if (seat.is_active !== undefined) data.is_active = seat.is_active;

            const result = await prismaDb.seat.updateMany({ where: { id }, data });

            if (result.count === 0) {
                return { status: false, message: "Siège non trouvé", code: 404 };
            }
            const updated = await prismaDb.seat.findUnique({ where: { id } });

            return { status: true, message: "Siège mis à jour", body: updated, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour du siège", code: 500 };
        }
    }

    static async softDelete(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.seat.updateMany({
                where: { id, is_active: true },
                data: { is_active: false },
            });

            if (result.count === 0) {
                return { status: false, message: "Siège non trouvé ou déjà désactivé", code: 404 };
            }

            return { status: true, message: "Siège désactivé", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la désactivation du siège", code: 500 };
        }
    }

    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.seat.updateMany({
                where: { id, is_active: false },
                data: { is_active: true },
            });

            if (result.count === 0) {
                return { status: false, message: "Siège non trouvé ou déjà actif", code: 404 };
            }

            return { status: true, message: "Siège restauré", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la restauration du siège", code: 500 };
        }
    }

    static async delete(id: number): Promise<ResponseModel> {
        try {
            await prismaDb.seat.delete({ where: { id } });
            return { status: true, message: "Siège supprimé définitivement", code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Siège non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la suppression du siège", code: 500 };
        }
    }

    static async findAllByBus(busId: number): Promise<ResponseModel> {
        try {
            const seats = await prismaDb.seat.findMany({
                where: { bus_id: busId },
                orderBy: { seat_number: 'asc' },
            });

            return { status: true, message: "Liste des sièges récupérée", body: seats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des sièges", code: 500 };
        }
    }

}

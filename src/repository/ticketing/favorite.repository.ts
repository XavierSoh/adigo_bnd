// Migrated to Prisma's native model API (prisma.event_favorite.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import ResponseModel from "../../models/response.model";

export class FavoriteRepository {

    static async findByCustomerId(customerId: number): Promise<ResponseModel> {
        try {
            // `row_to_json(e) as event` in the original == exactly what
            // `include: { event: true }` produces here (the full nested
            // event row under an `event` key) — a clean 1:1 conversion.
            const result = await prismaDb.event_favorite.findMany({
                where: { customer_id: customerId },
                include: { event: true },
                orderBy: { created_at: 'desc' },
            });
            return { status: true, message: "Favoris récupérés", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async isFavorite(customerId: number, eventId: number): Promise<boolean> {
        const result = await prismaDb.event_favorite.findUnique({
            where: { customer_id_event_id: { customer_id: customerId, event_id: eventId } },
        });
        return !!result;
    }

    static async add(customerId: number, eventId: number): Promise<ResponseModel> {
        try {
            // BEHAVIOR PRESERVED, not accidentally fixed: the original used
            // `pgOne` (not `pgOneOrNone`) on an `ON CONFLICT DO NOTHING
            // RETURNING *` insert — on a duplicate favorite, that insert
            // returns 0 rows and `pgOne` *throws* (it requires exactly 1),
            // landing in the catch block below as a generic 500, not a
            // clean 409/idempotent no-op. Plain `.create()` (no
            // upsert/skipDuplicates) reproduces exactly that: it throws
            // P2002 on the same duplicate, caught the same way.
            const result = await prismaDb.event_favorite.create({
                data: { customer_id: customerId, event_id: eventId },
            });
            return { status: true, message: "Ajouté aux favoris", body: result, code: 201 };
        } catch (error) {
            return { status: false, message: "Erreur lors de l'ajout", code: 500 };
        }
    }

    static async remove(customerId: number, eventId: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_favorite.deleteMany({
                where: { customer_id: customerId, event_id: eventId },
            });
            if (result.count === 0) {
                return { status: false, message: "Favori non trouvé", code: 404 };
            }
            return { status: true, message: "Retiré des favoris", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }

    static async toggle(customerId: number, eventId: number): Promise<ResponseModel> {
        const exists = await this.isFavorite(customerId, eventId);
        if (exists) {
            return this.remove(customerId, eventId);
        } else {
            return this.add(customerId, eventId);
        }
    }
}

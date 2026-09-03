// Migrated to Prisma's native model API (prisma.event_review.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import { ReviewCreateDto, ReviewUpdateDto } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";

export class ReviewRepository {

    static async findByEventId(eventId: number): Promise<ResponseModel> {
        try {
            // BEHAVIOR CHANGE, not a silent guess: the original selected
            // `c.name`, a column that doesn't exist on `customer`
            // (first_name/last_name only) — a pre-existing bug, already
            // flagged in BOOKING_MODULE_NOTES.md, that made this endpoint
            // 500 unconditionally. Prisma's typed `select` can't even
            // reference a nonexistent column (compile error, not a runtime
            // 500), so there's no way to reproduce that bug through this
            // API — fixed to actually return the customer's name instead of
            // silently trying to preserve a bug that can no longer be
            // expressed. Flagged here per the "restructure, don't guess"
            // instruction; worth a product sign-off if the 500 was somehow
            // relied upon.
            const rows = await prismaDb.event_review.findMany({
                where: { event_id: eventId, is_approved: true },
                include: { customer: { select: { first_name: true, last_name: true } } },
                orderBy: { created_at: 'desc' },
            });
            const result = rows.map(({ customer, ...r }) => ({
                ...r,
                customer_name: customer ? `${customer.first_name} ${customer.last_name ?? ''}`.trim() : null,
            }));
            return { status: true, message: "Avis récupérés", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async getEventStats(eventId: number): Promise<{ average: number; count: number }> {
        const result = await prismaDb.event_review.aggregate({
            where: { event_id: eventId, is_approved: true },
            _avg: { rating: true },
            _count: true,
        });
        return { average: result._avg.rating ?? 0, count: result._count };
    }

    static async create(data: ReviewCreateDto): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_review.create({
                data: {
                    event_id: data.event_id,
                    customer_id: data.customer_id,
                    rating: data.rating,
                    comment: data.comment,
                },
            });
            return { status: true, message: "Avis créé", body: result, code: 201 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return { status: false, message: "Vous avez déjà noté cet événement", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }

    static async update(id: number, customerId: number, data: ReviewUpdateDto): Promise<ResponseModel> {
        try {
            const updateData: Prisma.event_reviewUpdateInput = {};
            if (data.rating !== undefined) updateData.rating = data.rating;
            if (data.comment !== undefined) updateData.comment = data.comment;

            // `.update()` can only filter by a unique field (id) — the
            // original's compound `WHERE id=$1 AND customer_id=$2` (so a
            // customer can only edit their own review) needs updateMany.
            const result = await prismaDb.event_review.updateMany({
                where: { id, customer_id: customerId },
                data: updateData,
            });
            if (result.count === 0) return { status: false, message: "Avis non trouvé", code: 404 };
            const updated = await prismaDb.event_review.findUnique({ where: { id } });
            return { status: true, message: "Avis mis à jour", body: updated, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }

    static async delete(id: number, customerId: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_review.deleteMany({ where: { id, customer_id: customerId } });
            if (result.count === 0) return { status: false, message: "Avis non trouvé", code: 404 };
            return { status: true, message: "Avis supprimé", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }

    static async approve(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_review.update({
                where: { id },
                data: { is_approved: true },
            });
            return { status: true, message: "Avis approuvé", body: result, code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Avis non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de l'approbation", code: 500 };
        }
    }
}

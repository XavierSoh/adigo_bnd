// Migrated to Prisma's native model API (prisma.event_ticket_type.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import { TicketTypeCreateDto, TicketTypeUpdateDto } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";

// `available = quantity - sold` is a computed column in the original SQL
// (not a stored field) — Prisma's query API can't compute expressions
// server-side, so every read here adds it in JS instead, keeping the exact
// same flat shape (a sibling field, not a nested object).
function withAvailable<T extends { quantity: number; sold: number | null }>(row: T) {
    return { ...row, available: row.quantity - (row.sold ?? 0) };
}

export class TicketTypeRepository {

    static async findByEventId(eventId: number): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.event_ticket_type.findMany({
                where: { event_id: eventId },
                orderBy: { price: 'asc' },
            });
            return { status: true, message: "Types de tickets récupérés", body: rows.map(withAvailable), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_ticket_type.findUnique({ where: { id } });
            if (!result) return { status: false, message: "Type de ticket non trouvé", code: 404 };
            return { status: true, message: "Type trouvé", body: withAvailable(result), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async create(data: TicketTypeCreateDto): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_ticket_type.create({
                data: {
                    event_id: data.event_id,
                    name: data.name,
                    description: data.description,
                    price: data.price,
                    quantity: data.quantity,
                    sale_start: data.sale_start,
                    sale_end: data.sale_end,
                    max_per_order: data.max_per_order ?? 10,
                },
            });
            return { status: true, message: "Type de ticket créé", body: result, code: 201 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return { status: false, message: "Ce type existe déjà pour cet événement", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }

    static async update(id: number, data: TicketTypeUpdateDto): Promise<ResponseModel> {
        try {
            const updateData: Prisma.event_ticket_typeUpdateInput = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.price !== undefined) updateData.price = data.price;
            if (data.quantity !== undefined) updateData.quantity = data.quantity;
            if (data.sale_start !== undefined) updateData.sale_start = data.sale_start;
            if (data.sale_end !== undefined) updateData.sale_end = data.sale_end;
            if (data.max_per_order !== undefined) updateData.max_per_order = data.max_per_order;
            if (data.is_active !== undefined) updateData.is_active = data.is_active;

            const result = await prismaDb.event_ticket_type.update({ where: { id }, data: updateData });
            return { status: true, message: "Type mis à jour", body: result, code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Type non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }

    static async incrementSold(id: number, quantity: number): Promise<void> {
        await prismaDb.event_ticket_type.update({
            where: { id },
            data: { sold: { increment: quantity } },
        });
    }

    static async delete(id: number): Promise<ResponseModel> {
        try {
            await prismaDb.event_ticket_type.delete({ where: { id } });
            return { status: true, message: "Type supprimé", code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Type non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }
}

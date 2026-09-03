// Migrated to Prisma's native model API (prisma.event_organizer.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import { OrganizerCreateDto, OrganizerUpdateDto } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";

export class OrganizerRepository {

    static async findAll(): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_organizer.findMany({ orderBy: { created_at: 'desc' } });
            return { status: true, message: "Organisateurs récupérés", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_organizer.findUnique({ where: { id } });
            if (!result) return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur trouvé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async findByCustomerId(customerId: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_organizer.findUnique({ where: { customer_id: customerId } });
            if (!result) return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur trouvé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async create(data: OrganizerCreateDto): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_organizer.create({
                data: {
                    customer_id: data.customer_id,
                    name: data.name,
                    type: data.type ?? 'individual',
                    phone: data.phone,
                    email: data.email,
                    logo: data.logo,
                    description: data.description,
                },
            });
            return { status: true, message: "Organisateur créé", body: result, code: 201 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return { status: false, message: "Ce client est déjà organisateur", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }

    static async update(id: number, data: OrganizerUpdateDto): Promise<ResponseModel> {
        try {
            const updateData: Prisma.event_organizerUpdateInput = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.type !== undefined) updateData.type = data.type;
            if (data.phone !== undefined) updateData.phone = data.phone;
            if (data.email !== undefined) updateData.email = data.email;
            if (data.logo !== undefined) updateData.logo = data.logo;
            if (data.description !== undefined) updateData.description = data.description;

            const result = await prismaDb.event_organizer.update({ where: { id }, data: updateData });
            return { status: true, message: "Organisateur mis à jour", body: result, code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }

    static async verify(id: number, verifiedBy: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_organizer.update({
                where: { id },
                data: { is_verified: true, verified_at: new Date(), verified_by: verifiedBy },
            });
            return { status: true, message: "Organisateur vérifié", body: result, code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la vérification", code: 500 };
        }
    }

    static async delete(id: number): Promise<ResponseModel> {
        try {
            await prismaDb.event_organizer.delete({ where: { id } });
            return { status: true, message: "Organisateur supprimé", code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }
}

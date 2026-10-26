// Lecture des fiches organisateur (routes historiques, admin). Migrated to
// Prisma's native model API (prisma.event_organizer.*) — see
// BOOKING_MODULE_NOTES.md. Création / modification / suppression :
// src/ticketing/services/admin-organizers.service.ts.
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import ResponseModel from "../../models/response.model";
import { decimalToNumber } from "../../ticketing/utils/ticketing-rules";

function serialize<T extends { commission_rate: unknown }>(row: T) {
    return { ...row, commission_rate: decimalToNumber(row.commission_rate) };
}

export class OrganizerRepository {

    static async findAll(): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_organizer.findMany({ where: { is_deleted: false }, orderBy: { created_at: 'desc' } });
            return { status: true, message: "Organisateurs récupérés", body: result.map(serialize), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_organizer.findUnique({ where: { id } });
            if (!result) return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur trouvé", body: serialize(result), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async findByCustomerId(customerId: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_organizer.findUnique({ where: { customer_id: customerId } });
            if (!result) return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur trouvé", body: serialize(result), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async verify(id: number, verifiedBy: number | undefined): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_organizer.update({
                where: { id },
                data: { is_verified: true, verification_status: 'verified', verified_at: new Date(), verified_by: verifiedBy ?? null },
            });
            return { status: true, message: "Organisateur vérifié", body: serialize(result), code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la vérification", code: 500 };
        }
    }
}

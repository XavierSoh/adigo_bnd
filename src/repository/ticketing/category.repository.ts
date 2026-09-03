// Migrated to Prisma's native model API (prisma.event_category.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import { CategoryCreateDto, CategoryUpdateDto } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";

export class CategoryRepository {

    static async findAll(activeOnly = true): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_category.findMany({
                where: activeOnly ? { is_active: true } : {},
                orderBy: { display_order: 'asc' },
            });
            return { status: true, message: "Catégories récupérées", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_category.findUnique({ where: { id } });
            if (!result) return { status: false, message: "Catégorie non trouvée", code: 404 };
            return { status: true, message: "Catégorie trouvée", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async create(data: CategoryCreateDto): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_category.create({
                data: {
                    name: data.name,
                    name_fr: data.name_fr,
                    name_en: data.name_en,
                    icon: data.icon,
                    color: data.color,
                    display_order: data.display_order ?? 0,
                },
            });
            return { status: true, message: "Catégorie créée", body: result, code: 201 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return { status: false, message: "Cette catégorie existe déjà", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }

    static async update(id: number, data: CategoryUpdateDto): Promise<ResponseModel> {
        try {
            const updateData: Prisma.event_categoryUpdateInput = {};
            if (data.name !== undefined) updateData.name = data.name;
            if (data.name_fr !== undefined) updateData.name_fr = data.name_fr;
            if (data.name_en !== undefined) updateData.name_en = data.name_en;
            if (data.icon !== undefined) updateData.icon = data.icon;
            if (data.color !== undefined) updateData.color = data.color;
            if (data.is_active !== undefined) updateData.is_active = data.is_active;
            if (data.display_order !== undefined) updateData.display_order = data.display_order;

            const result = await prismaDb.event_category.update({ where: { id }, data: updateData });
            return { status: true, message: "Catégorie mise à jour", body: result, code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Catégorie non trouvée", code: 404 };
            }
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }

    static async delete(id: number): Promise<ResponseModel> {
        try {
            await prismaDb.event_category.delete({ where: { id } });
            return { status: true, message: "Catégorie supprimée", code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') return { status: false, message: "Catégorie non trouvée", code: 404 };
                if (error.code === 'P2003') return { status: false, message: "Catégorie utilisée par des événements", code: 409 };
            }
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }
}

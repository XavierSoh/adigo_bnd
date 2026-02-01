import pgpDb from "../../config/pgdb";
import { CategoryCreateDto, CategoryUpdateDto, EventCategory } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";
import { kEventCategory } from "../../utils/table_names";

export class CategoryRepository {

    static async findAll(activeOnly = true): Promise<ResponseModel> {
        try {
            const where = activeOnly ? 'WHERE is_active = TRUE' : '';
            const result = await pgpDb.any(
                `SELECT * FROM ${kEventCategory} ${where} ORDER BY display_order ASC`
            );
            return { status: true, message: "Catégories récupérées", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `SELECT * FROM ${kEventCategory} WHERE id = $1`, [id]
            );
            if (!result) return { status: false, message: "Catégorie non trouvée", code: 404 };
            return { status: true, message: "Catégorie trouvée", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async create(data: CategoryCreateDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.one(
                `INSERT INTO ${kEventCategory} (name, name_fr, name_en, icon, color, display_order)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [data.name, data.name_fr, data.name_en, data.icon, data.color, data.display_order ?? 0]
            );
            return { status: true, message: "Catégorie créée", body: result, code: 201 };
        } catch (error: any) {
            if (error.code === '23505') {
                return { status: false, message: "Cette catégorie existe déjà", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }

    static async update(id: number, data: CategoryUpdateDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventCategory} SET
                    name = COALESCE($1, name),
                    name_fr = COALESCE($2, name_fr),
                    name_en = COALESCE($3, name_en),
                    icon = COALESCE($4, icon),
                    color = COALESCE($5, color),
                    is_active = COALESCE($6, is_active),
                    display_order = COALESCE($7, display_order)
                 WHERE id = $8 RETURNING *`,
                [data.name, data.name_fr, data.name_en, data.icon, data.color, data.is_active, data.display_order, id]
            );
            if (!result) return { status: false, message: "Catégorie non trouvée", code: 404 };
            return { status: true, message: "Catégorie mise à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }

    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(`DELETE FROM ${kEventCategory} WHERE id = $1`, [id]);
            if (result.rowCount === 0) return { status: false, message: "Catégorie non trouvée", code: 404 };
            return { status: true, message: "Catégorie supprimée", code: 200 };
        } catch (error: any) {
            if (error.code === '23503') {
                return { status: false, message: "Catégorie utilisée par des événements", code: 409 };
            }
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }
}

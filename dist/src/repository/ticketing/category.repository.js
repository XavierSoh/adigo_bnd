"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryRepository = void 0;
const pgdb_1 = __importDefault(require("../../config/pgdb"));
const table_names_1 = require("../../utils/table_names");
class CategoryRepository {
    static async findAll(activeOnly = true) {
        try {
            const where = activeOnly ? 'WHERE is_active = TRUE' : '';
            const result = await pgdb_1.default.any(`SELECT * FROM ${table_names_1.kEventCategory} ${where} ORDER BY display_order ASC`);
            return { status: true, message: "Catégories récupérées", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }
    static async findById(id) {
        try {
            const result = await pgdb_1.default.oneOrNone(`SELECT * FROM ${table_names_1.kEventCategory} WHERE id = $1`, [id]);
            if (!result)
                return { status: false, message: "Catégorie non trouvée", code: 404 };
            return { status: true, message: "Catégorie trouvée", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }
    static async create(data) {
        try {
            const result = await pgdb_1.default.one(`INSERT INTO ${table_names_1.kEventCategory} (name, name_fr, name_en, icon, color, display_order)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [data.name, data.name_fr, data.name_en, data.icon, data.color, data.display_order ?? 0]);
            return { status: true, message: "Catégorie créée", body: result, code: 201 };
        }
        catch (error) {
            if (error.code === '23505') {
                return { status: false, message: "Cette catégorie existe déjà", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }
    static async update(id, data) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEventCategory} SET
                    name = COALESCE($1, name),
                    name_fr = COALESCE($2, name_fr),
                    name_en = COALESCE($3, name_en),
                    icon = COALESCE($4, icon),
                    color = COALESCE($5, color),
                    is_active = COALESCE($6, is_active),
                    display_order = COALESCE($7, display_order)
                 WHERE id = $8 RETURNING *`, [data.name, data.name_fr, data.name_en, data.icon, data.color, data.is_active, data.display_order, id]);
            if (!result)
                return { status: false, message: "Catégorie non trouvée", code: 404 };
            return { status: true, message: "Catégorie mise à jour", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }
    static async delete(id) {
        try {
            const result = await pgdb_1.default.result(`DELETE FROM ${table_names_1.kEventCategory} WHERE id = $1`, [id]);
            if (result.rowCount === 0)
                return { status: false, message: "Catégorie non trouvée", code: 404 };
            return { status: true, message: "Catégorie supprimée", code: 200 };
        }
        catch (error) {
            if (error.code === '23503') {
                return { status: false, message: "Catégorie utilisée par des événements", code: 409 };
            }
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }
}
exports.CategoryRepository = CategoryRepository;

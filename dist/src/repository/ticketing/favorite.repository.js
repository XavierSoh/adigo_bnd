"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteRepository = void 0;
const pgdb_1 = __importDefault(require("../../config/pgdb"));
const table_names_1 = require("../../utils/table_names");
class FavoriteRepository {
    static async findByCustomerId(customerId) {
        try {
            const result = await pgdb_1.default.any(`SELECT f.*, row_to_json(e) as event
                 FROM ${table_names_1.kEventFavorite} f
                 LEFT JOIN ${table_names_1.kEvent} e ON f.event_id = e.id
                 WHERE f.customer_id = $1
                 ORDER BY f.created_at DESC`, [customerId]);
            return { status: true, message: "Favoris récupérés", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }
    static async isFavorite(customerId, eventId) {
        const result = await pgdb_1.default.oneOrNone(`SELECT 1 FROM ${table_names_1.kEventFavorite} WHERE customer_id = $1 AND event_id = $2`, [customerId, eventId]);
        return !!result;
    }
    static async add(customerId, eventId) {
        try {
            const result = await pgdb_1.default.one(`INSERT INTO ${table_names_1.kEventFavorite} (customer_id, event_id)
                 VALUES ($1, $2)
                 ON CONFLICT (customer_id, event_id) DO NOTHING
                 RETURNING *`, [customerId, eventId]);
            return { status: true, message: "Ajouté aux favoris", body: result, code: 201 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de l'ajout", code: 500 };
        }
    }
    static async remove(customerId, eventId) {
        try {
            const result = await pgdb_1.default.result(`DELETE FROM ${table_names_1.kEventFavorite} WHERE customer_id = $1 AND event_id = $2`, [customerId, eventId]);
            if (result.rowCount === 0) {
                return { status: false, message: "Favori non trouvé", code: 404 };
            }
            return { status: true, message: "Retiré des favoris", code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }
    static async toggle(customerId, eventId) {
        const exists = await this.isFavorite(customerId, eventId);
        if (exists) {
            return this.remove(customerId, eventId);
        }
        else {
            return this.add(customerId, eventId);
        }
    }
}
exports.FavoriteRepository = FavoriteRepository;

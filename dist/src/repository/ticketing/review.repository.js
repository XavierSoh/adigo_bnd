"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewRepository = void 0;
const pgdb_1 = __importDefault(require("../../config/pgdb"));
const table_names_1 = require("../../utils/table_names");
class ReviewRepository {
    static async findByEventId(eventId) {
        try {
            const result = await pgdb_1.default.any(`SELECT r.*, c.name as customer_name
                 FROM ${table_names_1.kEventReview} r
                 LEFT JOIN ${table_names_1.kCustomer} c ON r.customer_id = c.id
                 WHERE r.event_id = $1 AND r.is_approved = TRUE
                 ORDER BY r.created_at DESC`, [eventId]);
            return { status: true, message: "Avis récupérés", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }
    static async getEventStats(eventId) {
        const result = await pgdb_1.default.one(`SELECT COALESCE(AVG(rating), 0) as average, COUNT(*) as count
             FROM ${table_names_1.kEventReview}
             WHERE event_id = $1 AND is_approved = TRUE`, [eventId]);
        return { average: parseFloat(result.average), count: parseInt(result.count) };
    }
    static async create(data) {
        try {
            const result = await pgdb_1.default.one(`INSERT INTO ${table_names_1.kEventReview} (event_id, customer_id, rating, comment)
                 VALUES ($1, $2, $3, $4) RETURNING *`, [data.event_id, data.customer_id, data.rating, data.comment]);
            return { status: true, message: "Avis créé", body: result, code: 201 };
        }
        catch (error) {
            if (error.code === '23505') {
                return { status: false, message: "Vous avez déjà noté cet événement", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }
    static async update(id, customerId, data) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEventReview} SET
                    rating = COALESCE($1, rating),
                    comment = COALESCE($2, comment)
                 WHERE id = $3 AND customer_id = $4 RETURNING *`, [data.rating, data.comment, id, customerId]);
            if (!result)
                return { status: false, message: "Avis non trouvé", code: 404 };
            return { status: true, message: "Avis mis à jour", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }
    static async delete(id, customerId) {
        try {
            const result = await pgdb_1.default.result(`DELETE FROM ${table_names_1.kEventReview} WHERE id = $1 AND customer_id = $2`, [id, customerId]);
            if (result.rowCount === 0)
                return { status: false, message: "Avis non trouvé", code: 404 };
            return { status: true, message: "Avis supprimé", code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }
    static async approve(id) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEventReview} SET is_approved = TRUE WHERE id = $1 RETURNING *`, [id]);
            if (!result)
                return { status: false, message: "Avis non trouvé", code: 404 };
            return { status: true, message: "Avis approuvé", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de l'approbation", code: 500 };
        }
    }
}
exports.ReviewRepository = ReviewRepository;

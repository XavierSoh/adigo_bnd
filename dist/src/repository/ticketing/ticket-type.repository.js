"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketTypeRepository = void 0;
const pgdb_1 = __importDefault(require("../../config/pgdb"));
const table_names_1 = require("../../utils/table_names");
class TicketTypeRepository {
    static async findByEventId(eventId) {
        try {
            const result = await pgdb_1.default.any(`SELECT *, (quantity - sold) as available
                 FROM ${table_names_1.kEventTicketType} WHERE event_id = $1 ORDER BY price ASC`, [eventId]);
            return { status: true, message: "Types de tickets récupérés", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }
    static async findById(id) {
        try {
            const result = await pgdb_1.default.oneOrNone(`SELECT *, (quantity - sold) as available FROM ${table_names_1.kEventTicketType} WHERE id = $1`, [id]);
            if (!result)
                return { status: false, message: "Type de ticket non trouvé", code: 404 };
            return { status: true, message: "Type trouvé", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }
    static async create(data) {
        try {
            const result = await pgdb_1.default.one(`INSERT INTO ${table_names_1.kEventTicketType}
                    (event_id, name, description, price, quantity, sale_start, sale_end, max_per_order)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [data.event_id, data.name, data.description, data.price, data.quantity,
                data.sale_start, data.sale_end, data.max_per_order ?? 10]);
            return { status: true, message: "Type de ticket créé", body: result, code: 201 };
        }
        catch (error) {
            if (error.code === '23505') {
                return { status: false, message: "Ce type existe déjà pour cet événement", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }
    static async update(id, data) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEventTicketType} SET
                    name = COALESCE($1, name),
                    description = COALESCE($2, description),
                    price = COALESCE($3, price),
                    quantity = COALESCE($4, quantity),
                    sale_start = COALESCE($5, sale_start),
                    sale_end = COALESCE($6, sale_end),
                    max_per_order = COALESCE($7, max_per_order),
                    is_active = COALESCE($8, is_active)
                 WHERE id = $9 RETURNING *`, [data.name, data.description, data.price, data.quantity,
                data.sale_start, data.sale_end, data.max_per_order, data.is_active, id]);
            if (!result)
                return { status: false, message: "Type non trouvé", code: 404 };
            return { status: true, message: "Type mis à jour", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }
    static async incrementSold(id, quantity) {
        await pgdb_1.default.none(`UPDATE ${table_names_1.kEventTicketType} SET sold = sold + $1 WHERE id = $2`, [quantity, id]);
    }
    static async delete(id) {
        try {
            const result = await pgdb_1.default.result(`DELETE FROM ${table_names_1.kEventTicketType} WHERE id = $1`, [id]);
            if (result.rowCount === 0)
                return { status: false, message: "Type non trouvé", code: 404 };
            return { status: true, message: "Type supprimé", code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }
}
exports.TicketTypeRepository = TicketTypeRepository;

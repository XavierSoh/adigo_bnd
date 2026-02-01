"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventRepository = void 0;
const pgdb_1 = __importDefault(require("../../config/pgdb"));
const table_names_1 = require("../../utils/table_names");
class EventRepository {
    static async findAll(limit = 50, offset = 0) {
        try {
            const result = await pgdb_1.default.any(`${this.SELECT_WITH_JOINS} ORDER BY e.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
            return { status: true, message: "Événements récupérés", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }
    static async findById(id) {
        try {
            const result = await pgdb_1.default.oneOrNone(`${this.SELECT_WITH_JOINS} WHERE e.id = $1`, [id]);
            if (!result)
                return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Événement trouvé", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }
    static async findByCode(code) {
        try {
            const result = await pgdb_1.default.oneOrNone(`${this.SELECT_WITH_JOINS} WHERE e.code = $1`, [code]);
            if (!result)
                return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Événement trouvé", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }
    static async search(params) {
        try {
            let query = this.SELECT_WITH_JOINS + ' WHERE 1=1';
            const values = [];
            let idx = 1;
            if (params.search) {
                query += ` AND (e.title ILIKE $${idx} OR e.description ILIKE $${idx})`;
                values.push(`%${params.search}%`);
                idx++;
            }
            if (params.category_id) {
                query += ` AND e.category_id = $${idx}`;
                values.push(params.category_id);
                idx++;
            }
            if (params.city) {
                query += ` AND e.city ILIKE $${idx}`;
                values.push(`%${params.city}%`);
                idx++;
            }
            if (params.status) {
                query += ` AND e.status = $${idx}`;
                values.push(params.status);
                idx++;
            }
            if (params.organizer_id) {
                query += ` AND e.organizer_id = $${idx}`;
                values.push(params.organizer_id);
                idx++;
            }
            if (params.is_featured) {
                query += ` AND e.is_featured = TRUE`;
            }
            if (params.start_date) {
                query += ` AND e.event_date >= $${idx}`;
                values.push(params.start_date);
                idx++;
            }
            if (params.end_date) {
                query += ` AND e.event_date <= $${idx}`;
                values.push(params.end_date);
                idx++;
            }
            query += ` ORDER BY e.event_date ASC LIMIT $${idx} OFFSET $${idx + 1}`;
            values.push(params.limit ?? 20, params.offset ?? 0);
            const result = await pgdb_1.default.any(query, values);
            return { status: true, message: "Recherche effectuée", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }
    static async create(data) {
        try {
            const result = await pgdb_1.default.one(`INSERT INTO ${table_names_1.kEvent} (title, description, category_id, organizer_id, cover_image,
                    event_date, event_end_date, venue_name, venue_address, city, maps_link)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`, [data.title, data.description, data.category_id, data.organizer_id, data.cover_image,
                data.event_date, data.event_end_date, data.venue_name, data.venue_address, data.city, data.maps_link]);
            return { status: true, message: "Événement créé", body: result, code: 201 };
        }
        catch (error) {
            console.error('Event creation error:', error);
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }
    static async update(id, data) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEvent} SET
                    title = COALESCE($1, title),
                    description = COALESCE($2, description),
                    category_id = COALESCE($3, category_id),
                    cover_image = COALESCE($4, cover_image),
                    event_date = COALESCE($5, event_date),
                    event_end_date = COALESCE($6, event_end_date),
                    venue_name = COALESCE($7, venue_name),
                    venue_address = COALESCE($8, venue_address),
                    city = COALESCE($9, city),
                    maps_link = COALESCE($10, maps_link)
                 WHERE id = $11 RETURNING *`, [data.title, data.description, data.category_id, data.cover_image, data.event_date,
                data.event_end_date, data.venue_name, data.venue_address, data.city, data.maps_link, id]);
            if (!result)
                return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Événement mis à jour", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }
    static async updateStatus(id, status) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEvent} SET status = $1 WHERE id = $2 RETURNING *`, [status, id]);
            if (!result)
                return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Statut mis à jour", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }
    static async incrementViews(id) {
        await pgdb_1.default.none(`UPDATE ${table_names_1.kEvent} SET views_count = views_count + 1 WHERE id = $1`, [id]);
    }
    static async delete(id) {
        try {
            const result = await pgdb_1.default.result(`DELETE FROM ${table_names_1.kEvent} WHERE id = $1`, [id]);
            if (result.rowCount === 0)
                return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Événement supprimé", code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }
}
exports.EventRepository = EventRepository;
EventRepository.SELECT_WITH_JOINS = `
        SELECT e.*,
            row_to_json(c) as category,
            row_to_json(o) as organizer
        FROM ${table_names_1.kEvent} e
        LEFT JOIN ${table_names_1.kEventCategory} c ON e.category_id = c.id
        LEFT JOIN ${table_names_1.kEventOrganizer} o ON e.organizer_id = o.id
    `;

import pgpDb from "../../config/pgdb";
import { EventCreateDto, EventUpdateDto, EventSearchParams, EventStatus } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";
import { kEvent, kEventCategory, kEventOrganizer } from "../../utils/table_names";

export class EventRepository {

    private static readonly SELECT_WITH_JOINS = `
        SELECT e.*,
            row_to_json(c) as category,
            row_to_json(o) as organizer
        FROM ${kEvent} e
        LEFT JOIN ${kEventCategory} c ON e.category_id = c.id
        LEFT JOIN ${kEventOrganizer} o ON e.organizer_id = o.id
    `;

    static async findAll(limit = 50, offset = 0): Promise<ResponseModel> {
        try {
            const result = await pgpDb.any(
                `${this.SELECT_WITH_JOINS} ORDER BY e.created_at DESC LIMIT $1 OFFSET $2`,
                [limit, offset]
            );
            return { status: true, message: "Événements récupérés", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(`${this.SELECT_WITH_JOINS} WHERE e.id = $1`, [id]);
            if (!result) return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Événement trouvé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async findByCode(code: string): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(`${this.SELECT_WITH_JOINS} WHERE e.code = $1`, [code]);
            if (!result) return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Événement trouvé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async search(params: EventSearchParams): Promise<ResponseModel> {
        try {
            let query = this.SELECT_WITH_JOINS + ' WHERE 1=1';
            const values: any[] = [];
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

            const result = await pgpDb.any(query, values);
            return { status: true, message: "Recherche effectuée", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async create(data: EventCreateDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.one(
                `INSERT INTO ${kEvent} (title, description, category_id, organizer_id, cover_image,
                    event_date, event_end_date, venue_name, venue_address, city, maps_link)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [data.title, data.description, data.category_id, data.organizer_id, data.cover_image,
                 data.event_date, data.event_end_date, data.venue_name, data.venue_address, data.city, data.maps_link]
            );
            return { status: true, message: "Événement créé", body: result, code: 201 };
        } catch (error) {
            console.error('Event creation error:', error);
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }

    static async update(id: number, data: EventUpdateDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEvent} SET
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
                 WHERE id = $11 RETURNING *`,
                [data.title, data.description, data.category_id, data.cover_image, data.event_date,
                 data.event_end_date, data.venue_name, data.venue_address, data.city, data.maps_link, id]
            );
            if (!result) return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Événement mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }

    static async updateStatus(id: number, status: EventStatus): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEvent} SET status = $1 WHERE id = $2 RETURNING *`,
                [status, id]
            );
            if (!result) return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Statut mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }

    static async incrementViews(id: number): Promise<void> {
        await pgpDb.none(`UPDATE ${kEvent} SET views_count = views_count + 1 WHERE id = $1`, [id]);
    }

    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(`DELETE FROM ${kEvent} WHERE id = $1`, [id]);
            if (result.rowCount === 0) return { status: false, message: "Événement non trouvé", code: 404 };
            return { status: true, message: "Événement supprimé", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }
}

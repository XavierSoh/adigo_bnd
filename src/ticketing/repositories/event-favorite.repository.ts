import pgpDb from "../../config/pgdb";
import { EventFavorite, EventFavoriteCreateDto } from "../models/event-favorite.model";
import ResponseModel from "../../models/response.model";
import { kEventFavorite, kEvent, kCustomer, kEventCategory } from "../../utils/table_names";

export class EventFavoriteRepository {

    private static readonly BASE_SELECT = `
        f.*,
        json_build_object(
            'id', e.id,
            'title', e.title,
            'event_code', e.event_code,
            'event_date', e.event_date,
            'venue_name', e.venue_name,
            'city', e.city,
            'cover_image', e.cover_image,
            'ticket_price', e.ticket_price,
            'available_tickets', e.available_tickets,
            'average_rating', e.average_rating,
            'category', json_build_object(
                'id', cat.id,
                'name_en', cat.name_en,
                'name_fr', cat.name_fr,
                'icon', cat.icon,
                'color', cat.color
            )
        ) AS event
    `;

    private static readonly BASE_JOINS = `
        FROM ${kEventFavorite} f
        LEFT JOIN ${kEvent} e ON f.event_id = e.id
        LEFT JOIN ${kEventCategory} cat ON e.category_id = cat.id
    `;

    // Create new favorite
    static async create(favorite: EventFavoriteCreateDto): Promise<ResponseModel> {
        try {
            // Check if already favorited
            const existing = await pgpDb.oneOrNone(
                `SELECT id FROM ${kEventFavorite}
                WHERE customer_id = $1 AND event_id = $2`,
                [favorite.customer_id, favorite.event_id]
            );

            if (existing) {
                return { status: false, message: "Événement déjà ajouté aux favoris", code: 409 };
            }

            const result = await pgpDb.one(
                `INSERT INTO ${kEventFavorite} (customer_id, event_id, created_at)
                VALUES ($1, $2, NOW())
                RETURNING *`,
                [favorite.customer_id, favorite.event_id]
            );

            return { status: true, message: "Événement ajouté aux favoris", body: result, code: 201 };
        } catch (error: any) {
            console.log(`Erreur ajout favori: ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de l'ajout aux favoris", code: 500 };
        }
    }

    // Remove favorite
    static async remove(customerId: number, eventId: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `DELETE FROM ${kEventFavorite}
                WHERE customer_id = $1 AND event_id = $2`,
                [customerId, eventId]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Favori non trouvé", code: 404 };
            }

            return { status: true, message: "Événement retiré des favoris", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression du favori", code: 500 };
        }
    }

    // Toggle favorite (add if not exists, remove if exists)
    static async toggle(customerId: number, eventId: number): Promise<ResponseModel> {
        try {
            const existing = await pgpDb.oneOrNone(
                `SELECT id FROM ${kEventFavorite}
                WHERE customer_id = $1 AND event_id = $2`,
                [customerId, eventId]
            );

            if (existing) {
                // Remove favorite
                await pgpDb.none(
                    `DELETE FROM ${kEventFavorite}
                    WHERE customer_id = $1 AND event_id = $2`,
                    [customerId, eventId]
                );

                return { status: true, message: "Événement retiré des favoris", body: { is_favorited: false }, code: 200 };
            } else {
                // Add favorite
                const result = await pgpDb.one(
                    `INSERT INTO ${kEventFavorite} (customer_id, event_id, created_at)
                    VALUES ($1, $2, NOW())
                    RETURNING *`,
                    [customerId, eventId]
                );

                return { status: true, message: "Événement ajouté aux favoris", body: { is_favorited: true, ...result }, code: 201 };
            }
        } catch (error) {
            return { status: false, message: "Erreur lors de la modification du favori", code: 500 };
        }
    }

    // Find by customer
    static async findByCustomer(customerId: number): Promise<ResponseModel> {
        try {
            const favorites = await pgpDb.any(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE f.customer_id = $1 AND e.is_deleted = FALSE
                ORDER BY f.created_at DESC`,
                [customerId]
            );

            return { status: true, message: "Favoris récupérés", body: favorites, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des favoris", code: 500 };
        }
    }

    // Find by event (all customers who favorited this event)
    static async findByEvent(eventId: number): Promise<ResponseModel> {
        try {
            const favorites = await pgpDb.any(
                `SELECT
                    f.*,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'email', c.email,
                        'phone', c.phone
                    ) AS customer
                FROM ${kEventFavorite} f
                LEFT JOIN ${kCustomer} c ON f.customer_id = c.id
                WHERE f.event_id = $1
                ORDER BY f.created_at DESC`,
                [eventId]
            );

            return { status: true, message: "Favoris de l'événement récupérés", body: favorites, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des favoris", code: 500 };
        }
    }

    // Check if event is favorited by customer
    static async isFavorited(customerId: number, eventId: number): Promise<ResponseModel> {
        try {
            const favorite = await pgpDb.oneOrNone(
                `SELECT id FROM ${kEventFavorite}
                WHERE customer_id = $1 AND event_id = $2`,
                [customerId, eventId]
            );

            const isFavorited = !!favorite;

            return {
                status: true,
                message: isFavorited ? "Événement dans les favoris" : "Événement non favori",
                body: { is_favorited: isFavorited },
                code: 200
            };
        } catch (error) {
            return { status: false, message: "Erreur lors de la vérification", code: 500 };
        }
    }

    // Get favorite count for event
    static async getCountByEvent(eventId: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.one(
                `SELECT COUNT(*) as favorite_count
                FROM ${kEventFavorite}
                WHERE event_id = $1`,
                [eventId]
            );

            return { status: true, message: "Nombre de favoris récupéré", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors du comptage", code: 500 };
        }
    }

    // Get most favorited events
    static async getMostFavorited(limit: number = 10): Promise<ResponseModel> {
        try {
            const events = await pgpDb.any(
                `SELECT
                    e.id,
                    e.title,
                    e.event_code,
                    e.event_date,
                    e.venue_name,
                    e.city,
                    e.cover_image,
                    e.ticket_price,
                    e.available_tickets,
                    COUNT(f.id) as favorite_count
                FROM ${kEvent} e
                LEFT JOIN ${kEventFavorite} f ON e.id = f.event_id
                WHERE e.status = 'published' AND e.is_deleted = FALSE
                GROUP BY e.id
                ORDER BY favorite_count DESC, e.event_date ASC
                LIMIT $1`,
                [limit]
            );

            return { status: true, message: "Événements les plus favoris récupérés", body: events, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    // Get statistics
    static async getStatistics(customerId?: number): Promise<ResponseModel> {
        try {
            let query = `
                SELECT
                    COUNT(*) as total_favorites
                FROM ${kEventFavorite} f
            `;

            const params: any[] = [];

            if (customerId) {
                query += ' WHERE f.customer_id = $1';
                params.push(customerId);
            }

            const stats = await pgpDb.one(query, params);

            return { status: true, message: "Statistiques récupérées", body: stats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques", code: 500 };
        }
    }

    // Remove all favorites for customer
    static async removeAllByCustomer(customerId: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `DELETE FROM ${kEventFavorite} WHERE customer_id = $1`,
                [customerId]
            );

            return {
                status: true,
                message: "Tous les favoris supprimés",
                body: { deleted_count: result.rowCount },
                code: 200
            };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression des favoris", code: 500 };
        }
    }

    // Remove all favorites for event
    static async removeAllByEvent(eventId: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `DELETE FROM ${kEventFavorite} WHERE event_id = $1`,
                [eventId]
            );

            return {
                status: true,
                message: "Tous les favoris de l'événement supprimés",
                body: { deleted_count: result.rowCount },
                code: 200
            };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression des favoris", code: 500 };
        }
    }
}

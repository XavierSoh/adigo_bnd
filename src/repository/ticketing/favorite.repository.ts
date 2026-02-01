import pgpDb from "../../config/pgdb";
import ResponseModel from "../../models/response.model";
import { kEventFavorite, kEvent, kEventCategory } from "../../utils/table_names";

export class FavoriteRepository {

    static async findByCustomerId(customerId: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.any(
                `SELECT f.*, row_to_json(e) as event
                 FROM ${kEventFavorite} f
                 LEFT JOIN ${kEvent} e ON f.event_id = e.id
                 WHERE f.customer_id = $1
                 ORDER BY f.created_at DESC`,
                [customerId]
            );
            return { status: true, message: "Favoris récupérés", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async isFavorite(customerId: number, eventId: number): Promise<boolean> {
        const result = await pgpDb.oneOrNone(
            `SELECT 1 FROM ${kEventFavorite} WHERE customer_id = $1 AND event_id = $2`,
            [customerId, eventId]
        );
        return !!result;
    }

    static async add(customerId: number, eventId: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.one(
                `INSERT INTO ${kEventFavorite} (customer_id, event_id)
                 VALUES ($1, $2)
                 ON CONFLICT (customer_id, event_id) DO NOTHING
                 RETURNING *`,
                [customerId, eventId]
            );
            return { status: true, message: "Ajouté aux favoris", body: result, code: 201 };
        } catch (error) {
            return { status: false, message: "Erreur lors de l'ajout", code: 500 };
        }
    }

    static async remove(customerId: number, eventId: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `DELETE FROM ${kEventFavorite} WHERE customer_id = $1 AND event_id = $2`,
                [customerId, eventId]
            );
            if (result.rowCount === 0) {
                return { status: false, message: "Favori non trouvé", code: 404 };
            }
            return { status: true, message: "Retiré des favoris", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }

    static async toggle(customerId: number, eventId: number): Promise<ResponseModel> {
        const exists = await this.isFavorite(customerId, eventId);
        if (exists) {
            return this.remove(customerId, eventId);
        } else {
            return this.add(customerId, eventId);
        }
    }
}

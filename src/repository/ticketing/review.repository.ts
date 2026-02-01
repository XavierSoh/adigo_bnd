import pgpDb from "../../config/pgdb";
import { ReviewCreateDto, ReviewUpdateDto } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";
import { kEventReview, kCustomer } from "../../utils/table_names";

export class ReviewRepository {

    static async findByEventId(eventId: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.any(
                `SELECT r.*, c.name as customer_name
                 FROM ${kEventReview} r
                 LEFT JOIN ${kCustomer} c ON r.customer_id = c.id
                 WHERE r.event_id = $1 AND r.is_approved = TRUE
                 ORDER BY r.created_at DESC`,
                [eventId]
            );
            return { status: true, message: "Avis récupérés", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async getEventStats(eventId: number): Promise<{ average: number; count: number }> {
        const result = await pgpDb.one(
            `SELECT COALESCE(AVG(rating), 0) as average, COUNT(*) as count
             FROM ${kEventReview}
             WHERE event_id = $1 AND is_approved = TRUE`,
            [eventId]
        );
        return { average: parseFloat(result.average), count: parseInt(result.count) };
    }

    static async create(data: ReviewCreateDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.one(
                `INSERT INTO ${kEventReview} (event_id, customer_id, rating, comment)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [data.event_id, data.customer_id, data.rating, data.comment]
            );
            return { status: true, message: "Avis créé", body: result, code: 201 };
        } catch (error: any) {
            if (error.code === '23505') {
                return { status: false, message: "Vous avez déjà noté cet événement", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }

    static async update(id: number, customerId: number, data: ReviewUpdateDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventReview} SET
                    rating = COALESCE($1, rating),
                    comment = COALESCE($2, comment)
                 WHERE id = $3 AND customer_id = $4 RETURNING *`,
                [data.rating, data.comment, id, customerId]
            );
            if (!result) return { status: false, message: "Avis non trouvé", code: 404 };
            return { status: true, message: "Avis mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }

    static async delete(id: number, customerId: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `DELETE FROM ${kEventReview} WHERE id = $1 AND customer_id = $2`,
                [id, customerId]
            );
            if (result.rowCount === 0) return { status: false, message: "Avis non trouvé", code: 404 };
            return { status: true, message: "Avis supprimé", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }

    static async approve(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventReview} SET is_approved = TRUE WHERE id = $1 RETURNING *`,
                [id]
            );
            if (!result) return { status: false, message: "Avis non trouvé", code: 404 };
            return { status: true, message: "Avis approuvé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de l'approbation", code: 500 };
        }
    }
}

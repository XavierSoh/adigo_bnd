"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventReviewRepository = void 0;
const pgdb_1 = __importDefault(require("../../config/pgdb"));
const table_names_1 = require("../../utils/table_names");
class EventReviewRepository {
    // Create new review
    static async create(review) {
        try {
            // Check if customer already reviewed this event
            const existing = await pgdb_1.default.oneOrNone(`SELECT id FROM ${table_names_1.kEventReview}
                WHERE customer_id = $1 AND event_id = $2 AND is_deleted = FALSE`, [review.customer_id, review.event_id]);
            if (existing) {
                return { status: false, message: "Vous avez déjà évalué cet événement", code: 409 };
            }
            // Check if customer has a ticket for this event (for verified attendee)
            const hasTicket = await pgdb_1.default.oneOrNone(`SELECT id FROM event_ticket_purchase
                WHERE customer_id = $1 AND event_id = $2 AND status IN ('confirmed', 'used')`, [review.customer_id, review.event_id]);
            const result = await pgdb_1.default.one(`INSERT INTO ${table_names_1.kEventReview} (
                    event_id, customer_id, ticket_purchase_id,
                    rating, title, comment,
                    is_verified_attendee, is_approved,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                RETURNING *`, [
                review.event_id,
                review.customer_id,
                review.ticket_purchase_id,
                review.rating,
                review.title,
                review.comment,
                !!hasTicket, // is_verified_attendee
                true // is_approved - auto-approve for now
            ]);
            return { status: true, message: "Évaluation créée", body: result, code: 201 };
        }
        catch (error) {
            console.log(`Erreur création évaluation: ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la création de l'évaluation", code: 500 };
        }
    }
    // Find by ID
    static async findById(id) {
        try {
            const review = await pgdb_1.default.oneOrNone(`SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE r.id = $1 AND r.is_deleted = FALSE`, [id]);
            if (!review) {
                return { status: false, message: "Évaluation non trouvée", code: 404 };
            }
            return { status: true, message: "Évaluation trouvée", body: review, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche de l'évaluation", code: 500 };
        }
    }
    // Find by event
    static async findByEvent(eventId, approvedOnly = true) {
        try {
            let query = `
                SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE r.event_id = $1 AND r.is_deleted = FALSE
            `;
            if (approvedOnly) {
                query += ' AND r.is_approved = TRUE AND r.is_flagged = FALSE';
            }
            query += ' ORDER BY r.is_verified_attendee DESC, r.created_at DESC';
            const reviews = await pgdb_1.default.any(query, [eventId]);
            return { status: true, message: "Évaluations de l'événement récupérées", body: reviews, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des évaluations", code: 500 };
        }
    }
    // Find by customer
    static async findByCustomer(customerId) {
        try {
            const reviews = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE r.customer_id = $1 AND r.is_deleted = FALSE
                ORDER BY r.created_at DESC`, [customerId]);
            return { status: true, message: "Évaluations du client récupérées", body: reviews, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des évaluations", code: 500 };
        }
    }
    // Update review
    static async update(id, review) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEventReview} SET
                    rating = COALESCE($1, rating),
                    title = COALESCE($2, title),
                    comment = COALESCE($3, comment),
                    updated_at = NOW()
                WHERE id = $4 AND is_deleted = FALSE
                RETURNING *`, [review.rating, review.title, review.comment, id]);
            if (!result) {
                return { status: false, message: "Évaluation non trouvée", code: 404 };
            }
            return { status: true, message: "Évaluation mise à jour", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour de l'évaluation", code: 500 };
        }
    }
    // Approve review (admin)
    static async approve(id) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEventReview} SET
                    is_approved = TRUE,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = FALSE
                RETURNING *`, [id]);
            if (!result) {
                return { status: false, message: "Évaluation non trouvée", code: 404 };
            }
            return { status: true, message: "Évaluation approuvée", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de l'approbation de l'évaluation", code: 500 };
        }
    }
    // Flag review (admin or user)
    static async flag(id, flagReason) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEventReview} SET
                    is_flagged = TRUE,
                    flag_reason = $1,
                    updated_at = NOW()
                WHERE id = $2 AND is_deleted = FALSE
                RETURNING *`, [flagReason, id]);
            if (!result) {
                return { status: false, message: "Évaluation non trouvée", code: 404 };
            }
            return { status: true, message: "Évaluation signalée", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors du signalement de l'évaluation", code: 500 };
        }
    }
    // Unflag review
    static async unflag(id) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEventReview} SET
                    is_flagged = FALSE,
                    flag_reason = NULL,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = FALSE
                RETURNING *`, [id]);
            if (!result) {
                return { status: false, message: "Évaluation non trouvée", code: 404 };
            }
            return { status: true, message: "Signalement retiré", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors du retrait du signalement", code: 500 };
        }
    }
    // Get statistics by event
    static async getStatisticsByEvent(eventId) {
        try {
            const stats = await pgdb_1.default.one(`SELECT
                    COUNT(*) as total_reviews,
                    AVG(rating) as average_rating,
                    SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_stars,
                    SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_stars,
                    SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_stars,
                    SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_stars,
                    SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star,
                    SUM(CASE WHEN is_verified_attendee = TRUE THEN 1 ELSE 0 END) as verified_reviews
                FROM ${table_names_1.kEventReview}
                WHERE event_id = $1 AND is_deleted = FALSE AND is_approved = TRUE AND is_flagged = FALSE`, [eventId]);
            // Round average rating to 1 decimal place
            if (stats.average_rating) {
                stats.average_rating = Math.round(parseFloat(stats.average_rating) * 10) / 10;
            }
            return { status: true, message: "Statistiques récupérées", body: stats, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques", code: 500 };
        }
    }
    // Get top-rated events
    static async getTopRated(limit = 10, minReviews = 3) {
        try {
            const events = await pgdb_1.default.any(`SELECT
                    e.id,
                    e.title,
                    e.event_code,
                    e.event_date,
                    e.cover_image,
                    COUNT(r.id) as review_count,
                    AVG(r.rating) as average_rating
                FROM ${table_names_1.kEvent} e
                INNER JOIN ${table_names_1.kEventReview} r ON e.id = r.event_id
                WHERE e.status = 'published' AND e.is_deleted = FALSE
                    AND r.is_deleted = FALSE AND r.is_approved = TRUE AND r.is_flagged = FALSE
                GROUP BY e.id
                HAVING COUNT(r.id) >= $1
                ORDER BY average_rating DESC, review_count DESC
                LIMIT $2`, [minReviews, limit]);
            // Round average ratings
            events.forEach(event => {
                if (event.average_rating) {
                    event.average_rating = Math.round(parseFloat(event.average_rating) * 10) / 10;
                }
            });
            return { status: true, message: "Événements les mieux notés récupérés", body: events, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }
    // Get pending reviews (for moderation)
    static async getPending() {
        try {
            const reviews = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE r.is_approved = FALSE AND r.is_deleted = FALSE
                ORDER BY r.created_at ASC`);
            return { status: true, message: "Évaluations en attente récupérées", body: reviews, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des évaluations", code: 500 };
        }
    }
    // Get flagged reviews
    static async getFlagged() {
        try {
            const reviews = await pgdb_1.default.any(`SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE r.is_flagged = TRUE AND r.is_deleted = FALSE
                ORDER BY r.created_at DESC`);
            return { status: true, message: "Évaluations signalées récupérées", body: reviews, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération des évaluations signalées", code: 500 };
        }
    }
    // Soft delete review
    static async softDelete(id, deletedBy) {
        try {
            const result = await pgdb_1.default.result(`UPDATE ${table_names_1.kEventReview} SET
                    is_deleted = TRUE,
                    deleted_at = NOW(),
                    deleted_by = $2,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = FALSE`, [id, deletedBy]);
            if (result.rowCount === 0) {
                return { status: false, message: "Évaluation non trouvée ou déjà supprimée", code: 404 };
            }
            return { status: true, message: "Évaluation supprimée", code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la suppression de l'évaluation", code: 500 };
        }
    }
    // Restore soft deleted review
    static async restore(id) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEventReview} SET
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = TRUE
                RETURNING *`, [id]);
            if (!result) {
                return { status: false, message: "Évaluation non trouvée", code: 404 };
            }
            return { status: true, message: "Évaluation restaurée", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la restauration de l'évaluation", code: 500 };
        }
    }
    // Hard delete review
    static async delete(id) {
        try {
            const result = await pgdb_1.default.result(`DELETE FROM ${table_names_1.kEventReview} WHERE id = $1`, [id]);
            if (result.rowCount === 0) {
                return { status: false, message: "Évaluation non trouvée", code: 404 };
            }
            return { status: true, message: "Évaluation supprimée définitivement", code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la suppression de l'évaluation", code: 500 };
        }
    }
}
exports.EventReviewRepository = EventReviewRepository;
EventReviewRepository.BASE_SELECT = `
        r.*,
        json_build_object(
            'id', e.id,
            'title', e.title,
            'event_code', e.event_code,
            'event_date', e.event_date,
            'cover_image', e.cover_image
        ) AS event,
        json_build_object(
            'id', c.id,
            'first_name', c.first_name,
            'last_name', c.last_name,
            'profile_picture', c.profile_picture
        ) AS customer
    `;
EventReviewRepository.BASE_JOINS = `
        FROM ${table_names_1.kEventReview} r
        LEFT JOIN ${table_names_1.kEvent} e ON r.event_id = e.id
        LEFT JOIN ${table_names_1.kCustomer} c ON r.customer_id = c.id
    `;

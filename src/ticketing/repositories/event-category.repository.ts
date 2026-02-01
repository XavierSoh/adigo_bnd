import pgpDb from "../../config/pgdb";
import { EventCategory, EventCategoryCreateDto, EventCategoryUpdateDto } from "../models/event-category.model";
import { EventCreateDto } from "../models/event.model";
import ResponseModel from "../../models/response.model";
import { kEvent, kEventCategory } from "../../utils/table_names";

export class EventCategoryRepository {

    // Create new event category
    // Create new event
static async create(event: EventCreateDto, createdBy?: number): Promise<ResponseModel> {
    try {
        const result = await pgpDb.one(
            `INSERT INTO ${kEvent} (
                title, description, category_id, organizer_id,
                event_date, event_end_date, registration_deadline,
                venue_name, venue_address, venue_city, venue_map_link,
                cover_image, gallery_images,
                total_tickets, ticket_price, currency,
                early_bird_price, early_bird_deadline,
                min_ticket_per_order, max_tickets_per_customer,
                terms_and_conditions, cancellation_policy, refund_policy,
                has_premium_design, has_boost, has_featured_placement,
                boost_start_date, boost_end_date, featured_placement_duration,
                premium_design_amount, boost_amount, featured_placement_amount,
                contact_name, contact_phone, contact_email,
                status, validation_status, created_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
                $31, $32, $33, $34, $35, $36, $37, $38
            ) RETURNING *`,
            [
                event.title,                                    // $1
                event.description,                              // $2
                event.category_id,                              // $3
                event.organizer_id,                             // $4
                event.event_date,                               // $5
                event.event_end_date,                           // $6
                event.registration_deadline,                    // $7
                event.venue_name,                               // $8
                event.venue_address,                            // $9
                event.venue_city ?? event.city,                 // $10 - accepte les deux
                event.venue_map_link,                           // $11
                event.cover_image,                              // $12
                event.gallery_images,                           // $13
                event.total_tickets,                            // $14
                event.ticket_price,                             // $15
                event.currency ?? 'XAF',                        // $16
                event.early_bird_price,                         // $17
                event.early_bird_deadline,                      // $18
                event.min_ticket_per_order ?? 1,                // $19
                event.max_tickets_per_customer,                 // $20
                event.terms_and_conditions,                     // $21
                event.cancellation_policy,                      // $22
                event.refund_policy,                            // $23
                event.has_premium_design ?? false,              // $24
                event.has_boost ?? false,                       // $25
                event.has_featured_placement ?? false,          // $26
                event.boost_start_date,                         // $27
                event.boost_end_date,                           // $28
                event.featured_placement_duration,              // $29
                event.premium_design_amount ?? 0,               // $30
                event.boost_amount ?? 0,                        // $31
                event.featured_placement_amount ?? 0,           // $32
                event.contact_name,                             // $33
                event.contact_phone,                            // $34
                event.contact_email,                            // $35
                'draft',                                        // $36
                'pending',                                      // $37
                createdBy ?? event.created_by ?? null           // $38
            ]
        );

        return { status: true, message: "Événement créé", body: result, code: 201 };

    } catch (error: any) {
        console.log(`Erreur création événement: ${JSON.stringify(error)}`);
        return { status: false, message: "Erreur lors de la création de l'événement", code: 500, body: error };
    }
}

    // Find by ID
    static async findById(id: number): Promise<ResponseModel> {
        try {
            const category = await pgpDb.oneOrNone(
                `SELECT * FROM ${kEventCategory} WHERE id = $1 AND is_deleted = FALSE`,
                [id]
            );

            if (!category) {
                return { status: false, message: "Catégorie non trouvée", code: 404 };
            }

            return { status: true, message: "Catégorie trouvée", body: category, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche de la catégorie", code: 500 };
        }
    }

    // Find all categories
    static async findAll(includeDeleted: boolean = false, activeOnly: boolean = true): Promise<ResponseModel> {
        try {
            let query = `SELECT * FROM ${kEventCategory}`;
            const conditions: string[] = [];

            if (!includeDeleted) {
                conditions.push('is_deleted = FALSE');
            }

            if (activeOnly) {
                conditions.push('is_active = TRUE');
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY display_order ASC, name_en ASC';

            const categories = await pgpDb.any(query);

            return { status: true, message: "Liste des catégories récupérée", body: categories, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des catégories", code: 500 };
        }
    }

    // Update category
    static async update(id: number, category: EventCategoryUpdateDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventCategory} SET
                    name_en = COALESCE($1, name_en),
                    name_fr = COALESCE($2, name_fr),
                    description_en = COALESCE($3, description_en),
                    description_fr = COALESCE($4, description_fr),
                    icon = COALESCE($5, icon),
                    color = COALESCE($6, color),
                    display_order = COALESCE($7, display_order),
                    is_active = COALESCE($8, is_active),
                    updated_at = NOW()
                WHERE id = $9 AND is_deleted = FALSE
                RETURNING *`,
                [
                    category.name_en,
                    category.name_fr,
                    category.description_en,
                    category.description_fr,
                    category.icon,
                    category.color,
                    category.display_order,
                    category.is_active,
                    id
                ]
            );

            if (!result) {
                return { status: false, message: "Catégorie non trouvée", code: 404 };
            }

            return { status: true, message: "Catégorie mise à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour de la catégorie", code: 500 };
        }
    }

    // Soft delete category
    static async softDelete(id: number, deletedBy?: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `UPDATE ${kEventCategory} SET
                    is_deleted = TRUE,
                    deleted_at = NOW(),
                    deleted_by = $2,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = FALSE`,
                [id, deletedBy]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Catégorie non trouvée ou déjà supprimée", code: 404 };
            }

            return { status: true, message: "Catégorie supprimée", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression de la catégorie", code: 500 };
        }
    }

    // Restore soft deleted category
    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventCategory} SET
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = TRUE
                RETURNING *`,
                [id]
            );

            if (!result) {
                return { status: false, message: "Catégorie non trouvée", code: 404 };
            }

            return { status: true, message: "Catégorie restaurée", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la restauration de la catégorie", code: 500 };
        }
    }

    // Hard delete category
    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `DELETE FROM ${kEventCategory} WHERE id = $1`,
                [id]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Catégorie non trouvée", code: 404 };
            }

            return { status: true, message: "Catégorie supprimée définitivement", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression de la catégorie", code: 500 };
        }
    }

    // Get category statistics (number of events per category)
    static async getStatistics(): Promise<ResponseModel> {
        try {
            const stats = await pgpDb.any(
                `SELECT
                    c.id,
                    c.name_en,
                    c.name_fr,
                    c.icon,
                    c.color,
                    COUNT(e.id) as event_count,
                    COUNT(CASE WHEN e.status = 'published' THEN 1 END) as published_count
                FROM ${kEventCategory} c
                LEFT JOIN event e ON e.category_id = c.id AND e.is_deleted = FALSE
                WHERE c.is_deleted = FALSE AND c.is_active = TRUE
                GROUP BY c.id, c.name_en, c.name_fr, c.icon, c.color
                ORDER BY event_count DESC, c.name_en ASC`
            );

            return { status: true, message: "Statistiques des catégories récupérées", body: stats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques", code: 500 };
        }
    }

    // Reorder categories
    static async reorder(categoryOrders: { id: number; display_order: number }[]): Promise<ResponseModel> {
        try {
            // Update display_order for each category
            for (const item of categoryOrders) {
                await pgpDb.none(
                    `UPDATE ${kEventCategory} SET display_order = $1, updated_at = NOW() WHERE id = $2`,
                    [item.display_order, item.id]
                );
            }

            return { status: true, message: "Ordre des catégories mis à jour", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la réorganisation des catégories", code: 500 };
        }
    }
}

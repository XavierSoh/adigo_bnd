import pgpDb from "../../config/pgdb";
import { Event, EventCreateDto, EventUpdateDto, EventPublishDto, EventSearchParams } from "../models/event.model";
import ResponseModel from "../../models/response.model";
import { kEvent, kEventCategory, kEventOrganizer, kCustomer } from "../../utils/table_names";

export class EventRepository {

    private static readonly BASE_SELECT = `
        e.*,
        json_build_object(
            'id', cat.id,
            'name_en', cat.name_en,
            'name_fr', cat.name_fr,
            'icon', cat.icon,
            'color', cat.color
        ) AS category,
        json_build_object(
            'id', org.id,
            'customer_id', org.customer_id,
            'organization_name', org.organization_name,
            'organization_type', org.organization_type,
            'logo', org.logo,
            'verification_status', org.verification_status,
            'average_rating', org.average_rating
        ) AS organizer
    `;

    private static readonly BASE_JOINS = `
        FROM ${kEvent} e
        LEFT JOIN ${kEventCategory} cat ON e.category_id = cat.id
        LEFT JOIN ${kEventOrganizer} org ON e.organizer_id = org.id
    `;

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
                event.title,                           // $1
                event.description,                     // $2
                event.category_id,                     // $3
                event.organizer_id,                    // $4
                event.event_date,                      // $5
                event.event_end_date,                  // $6
                event.registration_deadline,           // $7
                event.venue_name,                      // $8
                event.venue_address,                   // $9
                event.city,                            // $10
                event.venue_map_link,                  // $11
                event.cover_image,                     // $12
                event.gallery_images,                  // $13
                event.total_tickets,                   // $14
                event.ticket_price,                    // $15
                event.currency ?? 'XAF',               // $16
                event.early_bird_price,                // $17
                event.early_bird_deadline,             // $18
                event.min_ticket_per_order ?? 1,       // $19
                event.max_tickets_per_customer,        // $20
                event.terms_and_conditions,            // $21
                event.cancellation_policy,             // $22
                event.refund_policy,                   // $23
                event.has_premium_design ?? false,     // $24
                event.has_boost ?? false,              // $25
                event.has_featured_placement ?? false, // $26
                event.boost_start_date,                // $27
                event.boost_end_date,                  // $28
                event.featured_placement_duration,     // $29
                event.premium_design_amount ?? 0,      // $30
                event.boost_amount ?? 0,               // $31
                event.featured_placement_amount ?? 0,  // $32
                event.contact_name,                    // $33
                event.contact_phone,                   // $34
                event.contact_email,                   // $35
                'draft',                               // $36
                'pending',                             // $37
                createdBy || null                      // $38 ← celui qui manquait!
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
            const event = await pgpDb.oneOrNone(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE e.id = $1 AND e.is_deleted = FALSE`,
                [id]
            );

            if (!event) {
                return { status: false, message: "Événement non trouvé", code: 404 };
            }

            return { status: true, message: "Événement trouvé", body: event, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche de l'événement", code: 500 };
        }
    }

    // Find by event code
    static async findByEventCode(eventCode: string): Promise<ResponseModel> {
        try {
            const event = await pgpDb.oneOrNone(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE e.event_code = $1 AND e.is_deleted = FALSE`,
                [eventCode]
            );

            if (!event) {
                return { status: false, message: "Événement non trouvé", code: 404 };
            }

            return { status: true, message: "Événement trouvé", body: event, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche de l'événement", code: 500 };
        }
    }

    // Find all events
    static async findAll(includeDeleted: boolean = false): Promise<ResponseModel> {
        try {
            const whereClause = includeDeleted ? '' : 'WHERE e.is_deleted = FALSE';

            const events = await pgpDb.any(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                ${whereClause}
                ORDER BY e.created_at DESC`
            );

            return { status: true, message: "Liste des événements récupérée", body: events, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des événements", code: 500 };
        }
    }

    // Find by organizer
    static async findByOrganizer(organizerId: number): Promise<ResponseModel> {
        try {
            const events = await pgpDb.any(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE e.organizer_id = $1 AND e.is_deleted = FALSE
                ORDER BY e.event_date DESC`,
                [organizerId]
            );

            return { status: true, message: "Événements de l'organisateur récupérés", body: events, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des événements", code: 500 };
        }
    }

    // Find by category
    static async findByCategory(categoryId: number): Promise<ResponseModel> {
        try {
            const events = await pgpDb.any(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE e.category_id = $1 AND e.status = 'published' AND e.is_deleted = FALSE
                ORDER BY e.event_date ASC`,
                [categoryId]
            );

            return { status: true, message: "Événements de la catégorie récupérés", body: events, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des événements", code: 500 };
        }
    }

    // Update event
    static async update(id: number, event: EventUpdateDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEvent} SET
                    title = COALESCE($1, title),
                    description = COALESCE($2, description),
                    category_id = COALESCE($3, category_id),
                    event_date = COALESCE($4, event_date),
                    event_end_date = COALESCE($5, event_end_date),
                    registration_deadline = COALESCE($6, registration_deadline),
                    venue_name = COALESCE($7, venue_name),
                    venue_address = COALESCE($8, venue_address),
                    city = COALESCE($9, city),
                    venue_map_link = COALESCE($10, venue_map_link),
                    cover_image = COALESCE($11, cover_image),
                    gallery_images = COALESCE($12, gallery_images),
                    total_tickets = COALESCE($13, total_tickets),
                    ticket_price = COALESCE($14, ticket_price),
                    early_bird_price = COALESCE($15, early_bird_price),
                    early_bird_deadline = COALESCE($16, early_bird_deadline),
                    min_ticket_per_order = COALESCE($17, min_ticket_per_order),
                    max_ticket_per_order = COALESCE($18, max_ticket_per_order),
                    terms_and_conditions = COALESCE($19, terms_and_conditions),
                    cancellation_policy = COALESCE($20, cancellation_policy),
                    refund_policy = COALESCE($21, refund_policy),
                    contact_name = COALESCE($22, contact_name),
                    contact_phone = COALESCE($23, contact_phone),
                    contact_email = COALESCE($24, contact_email),
                    updated_at = NOW()
                WHERE id = $25 AND is_deleted = FALSE
                RETURNING *`,
                [
                    event.title,
                    event.description,
                    event.category_id,
                    event.event_date,
                    event.event_end_date,
                    event.registration_deadline,
                    event.venue_name,
                    event.venue_address,
                    event.city,
                    event.venue_map_link,
                    event.cover_image,
                    event.gallery_images,
                    event.total_tickets,
                    event.ticket_price,
                    event.early_bird_price,
                    event.early_bird_deadline,
                    event.min_ticket_per_order,
                    event.max_ticket_per_order,
                    event.terms_and_conditions,
                    event.cancellation_policy,
                    event.refund_policy,
                    event.contact_name,
                    event.contact_phone,
                    event.contact_email,
                    id
                ]
            );

            if (!result) {
                return { status: false, message: "Événement non trouvé", code: 404 };
            }

            return { status: true, message: "Événement mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour de l'événement", code: 500 };
        }
    }

    // Publish event
    static async publish(id: number, publishData: EventPublishDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEvent} SET
                    status = 'pending_validation',
                    validation_status = 'pending',
                    has_premium_design = $1,
                    has_boost = $2,
                    has_featured_placement = $3,
                    boost_start_date = $4,
                    boost_end_date = $5,
                    featured_placement_duration = $6,
                    premium_design_amount = $7,
                    boost_amount = $8,
                    featured_placement_amount = $9,
                    updated_at = NOW()
                WHERE id = $10 AND is_deleted = FALSE AND status = 'draft'
                RETURNING *`,
                [
                    publishData.has_premium_design ?? false,
                    publishData.has_boost ?? false,
                    publishData.has_featured_placement ?? false,
                    publishData.boost_start_date,
                    publishData.boost_end_date,
                    publishData.featured_placement_duration,
                    publishData.premium_design_amount ?? 0,
                    publishData.boost_amount ?? 0,
                    publishData.featured_placement_amount ?? 0,
                    id
                ]
            );

            if (!result) {
                return { status: false, message: "Événement non trouvé ou déjà publié", code: 404 };
            }

            return { status: true, message: "Événement soumis pour validation", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la publication de l'événement", code: 500 };
        }
    }

    // Approve event (admin)
    static async approve(id: number, validatedBy: number, validationNotes?: string): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEvent} SET
                    status = 'published',
                    validation_status = 'approved',
                    validated_by = $1,
                    validated_at = NOW(),
                    validation_notes = $2,
                    published_at = NOW(),
                    updated_at = NOW()
                WHERE id = $3 AND is_deleted = FALSE AND validation_status = 'pending'
                RETURNING *`,
                [validatedBy, validationNotes, id]
            );

            if (!result) {
                return { status: false, message: "Événement non trouvé ou déjà validé", code: 404 };
            }

            return { status: true, message: "Événement approuvé et publié", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de l'approbation de l'événement", code: 500 };
        }
    }

    // Reject event (admin)
    static async reject(id: number, validatedBy: number, validationNotes: string): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEvent} SET
                    status = 'draft',
                    validation_status = 'rejected',
                    validated_by = $1,
                    validated_at = NOW(),
                    validation_notes = $2,
                    updated_at = NOW()
                WHERE id = $3 AND is_deleted = FALSE AND validation_status = 'pending'
                RETURNING *`,
                [validatedBy, validationNotes, id]
            );

            if (!result) {
                return { status: false, message: "Événement non trouvé ou déjà validé", code: 404 };
            }

            return { status: true, message: "Événement rejeté", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors du rejet de l'événement", code: 500 };
        }
    }

    // Cancel event
    static async cancel(id: number, cancellationReason: string): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEvent} SET
                    status = 'cancelled',
                    cancellation_reason = $1,
                    cancelled_at = NOW(),
                    updated_at = NOW()
                WHERE id = $2 AND is_deleted = FALSE
                RETURNING *`,
                [cancellationReason, id]
            );

            if (!result) {
                return { status: false, message: "Événement non trouvé", code: 404 };
            }

            return { status: true, message: "Événement annulé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de l'annulation de l'événement", code: 500 };
        }
    }

    // Search events with filters
    static async search(params: EventSearchParams): Promise<ResponseModel> {
        try {
            let query = `
                SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE e.is_deleted = FALSE
            `;

            const queryParams: any[] = [];
            let paramIndex = 1;

            // Search term
            if (params.searchTerm) {
                query += ` AND (e.title ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex})`;
                queryParams.push(`%${params.searchTerm}%`);
                paramIndex++;
            }

            // Category
            if (params.categoryId) {
                query += ` AND e.category_id = $${paramIndex}`;
                queryParams.push(params.categoryId);
                paramIndex++;
            }

            // City
            if (params.city) {
                query += ` AND e.city ILIKE $${paramIndex}`;
                queryParams.push(`%${params.city}%`);
                paramIndex++;
            }

            // Status
            if (params.status) {
                query += ` AND e.status = $${paramIndex}`;
                queryParams.push(params.status);
                paramIndex++;
            } else {
                // Default: only show published events for public search
                query += ` AND e.status = 'published'`;
            }

            // Date range
            if (params.startDate) {
                query += ` AND e.event_date >= $${paramIndex}`;
                queryParams.push(params.startDate);
                paramIndex++;
            }

            if (params.endDate) {
                query += ` AND e.event_date <= $${paramIndex}`;
                queryParams.push(params.endDate);
                paramIndex++;
            }

            // Price range
            if (params.minPrice !== undefined) {
                query += ` AND e.ticket_price >= $${paramIndex}`;
                queryParams.push(params.minPrice);
                paramIndex++;
            }

            if (params.maxPrice !== undefined) {
                query += ` AND e.ticket_price <= $${paramIndex}`;
                queryParams.push(params.maxPrice);
                paramIndex++;
            }

            // Organizer
            if (params.organizerId) {
                query += ` AND e.organizer_id = $${paramIndex}`;
                queryParams.push(params.organizerId);
                paramIndex++;
            }

            // Has available tickets
            if (params.hasAvailableTickets) {
                query += ` AND e.available_tickets > 0`;
            }

            // Is featured
            if (params.isFeatured) {
                query += ` AND e.has_featured_placement = TRUE`;
            }

            // Sorting
            const sortBy = params.sortBy || 'event_date';
            const sortOrder = params.sortOrder || 'ASC';
            query += ` ORDER BY e.${sortBy} ${sortOrder}`;

            // Pagination
            const limit = params.limit || 20;
            const offset = params.offset || 0;
            query += ` LIMIT ${limit} OFFSET ${offset}`;

            const events = await pgpDb.any(query, queryParams);

            return { status: true, message: "Recherche effectuée", body: events, code: 200 };
        } catch (error) {
            console.log(`Erreur recherche événements: ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    // Get upcoming events
    static async getUpcoming(limit: number = 10): Promise<ResponseModel> {
        try {
            const events = await pgpDb.any(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE e.status = 'published' AND e.is_deleted = FALSE
                    AND e.event_date >= NOW()
                    AND e.available_tickets > 0
                ORDER BY e.event_date ASC
                LIMIT $1`,
                [limit]
            );

            return { status: true, message: "Événements à venir récupérés", body: events, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des événements", code: 500 };
        }
    }

    // Get past events
    static async getPast(limit: number = 10): Promise<ResponseModel> {
        try {
            const events = await pgpDb.any(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE e.status IN ('completed', 'published') AND e.is_deleted = FALSE
                    AND e.event_date < NOW()
                ORDER BY e.event_date DESC
                LIMIT $1`,
                [limit]
            );

            return { status: true, message: "Événements passés récupérés", body: events, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des événements passés", code: 500 };
        }
    }

    // Get featured events
    static async getFeatured(limit: number = 5): Promise<ResponseModel> {
        try {
            const events = await pgpDb.any(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE e.status = 'published' AND e.is_deleted = FALSE
                    AND e.has_featured_placement = TRUE
                    AND e.event_date >= NOW()
                ORDER BY e.featured_placement_duration DESC, e.created_at DESC
                LIMIT $1`,
                [limit]
            );

            return { status: true, message: "Événements en vedette récupérés", body: events, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des événements en vedette", code: 500 };
        }
    }

    // Get popular events (most tickets sold)
    static async getPopular(limit: number = 10): Promise<ResponseModel> {
        try {
            const events = await pgpDb.any(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE e.status = 'published' AND e.is_deleted = FALSE
                    AND e.event_date >= NOW()
                ORDER BY e.tickets_sold DESC, e.average_rating DESC
                LIMIT $1`,
                [limit]
            );

            return { status: true, message: "Événements populaires récupérés", body: events, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des événements populaires", code: 500 };
        }
    }

    // Get statistics
    static async getStatistics(organizerId?: number): Promise<ResponseModel> {
        try {
            let query = `
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
                    SUM(CASE WHEN status = 'pending_validation' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(tickets_sold) as total_tickets_sold,
                    SUM(total_revenue) as total_revenue
                FROM ${kEvent}
                WHERE is_deleted = FALSE
            `;

            const params: any[] = [];

            if (organizerId) {
                query += ' AND organizer_id = $1';
                params.push(organizerId);
            }

            const stats = await pgpDb.one(query, params);

            return { status: true, message: "Statistiques récupérées", body: stats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques", code: 500 };
        }
    }

    // Soft delete event
    static async softDelete(id: number, deletedBy?: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `UPDATE ${kEvent} SET
                    is_deleted = TRUE,
                    deleted_at = NOW(),
                    deleted_by = $2,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = FALSE`,
                [id, deletedBy]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Événement non trouvé ou déjà supprimé", code: 404 };
            }

            return { status: true, message: "Événement supprimé", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression de l'événement", code: 500 };
        }
    }

    // Restore soft deleted event
    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEvent} SET
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = TRUE
                RETURNING *`,
                [id]
            );

            if (!result) {
                return { status: false, message: "Événement non trouvé", code: 404 };
            }

            return { status: true, message: "Événement restauré", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la restauration de l'événement", code: 500 };
        }
    }

    // Hard delete event
    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `DELETE FROM ${kEvent} WHERE id = $1`,
                [id]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Événement non trouvé", code: 404 };
            }

            return { status: true, message: "Événement supprimé définitivement", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression de l'événement", code: 500 };
        }
    }
}

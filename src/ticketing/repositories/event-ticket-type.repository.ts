import pgpDb from "../../config/pgdb";
import { EventTicketType, EventTicketTypeCreateDto, EventTicketTypeUpdateDto } from "../models/event-ticket-type.model";
import ResponseModel from "../../models/response.model";
import { kEventTicketType, kEvent } from "../../utils/table_names";

export class EventTicketTypeRepository {

    private static readonly BASE_SELECT = `
        tt.*,
        json_build_object(
            'id', e.id,
            'title', e.title,
            'event_code', e.event_code,
            'event_date', e.event_date,
            'organizer_id', e.organizer_id
        ) AS event
    `;

    private static readonly BASE_JOINS = `
        FROM ${kEventTicketType} tt
        LEFT JOIN ${kEvent} e ON tt.event_id = e.id
    `;

    // Create new ticket type
    static async create(ticketType: EventTicketTypeCreateDto, createdBy?: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.one(
                `INSERT INTO ${kEventTicketType} (
                    event_id, name, description, price, quantity,
                    available_quantity, min_per_order, max_per_order,
                    sale_start_date, sale_end_date, is_active,
                    benefits, display_order, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *`,
                [
                    ticketType.event_id,
                    ticketType.name,
                    ticketType.description,
                    ticketType.price,
                    ticketType.quantity,
                    ticketType.quantity, // available_quantity = quantity initially
                    ticketType.min_per_order ?? 1,
                    ticketType.max_per_order,
                    ticketType.sale_start_date,
                    ticketType.sale_end_date,
                    ticketType.is_active ?? true,
                    ticketType.benefits,
                    ticketType.display_order ?? 0,
                    createdBy
                ]
            );

            return { status: true, message: "Type de ticket créé", body: result, code: 201 };
        } catch (error: any) {
            console.log(`Erreur création type de ticket: ${JSON.stringify(error)}`);
            return { status: false, message: "Erreur lors de la création du type de ticket", code: 500 };
        }
    }

    // Find by ID
    static async findById(id: number): Promise<ResponseModel> {
        try {
            const ticketType = await pgpDb.oneOrNone(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE tt.id = $1 AND tt.is_deleted = FALSE`,
                [id]
            );

            if (!ticketType) {
                return { status: false, message: "Type de ticket non trouvé", code: 404 };
            }

            return { status: true, message: "Type de ticket trouvé", body: ticketType, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche du type de ticket", code: 500 };
        }
    }

    // Find by event ID
    static async findByEventId(eventId: number, activeOnly: boolean = true): Promise<ResponseModel> {
        try {
            let query = `
                SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE tt.event_id = $1 AND tt.is_deleted = FALSE
            `;

            if (activeOnly) {
                query += ' AND tt.is_active = TRUE';
            }

            query += ' ORDER BY tt.display_order ASC, tt.price ASC';

            const ticketTypes = await pgpDb.any(query, [eventId]);

            return { status: true, message: "Types de tickets récupérés", body: ticketTypes, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des types de tickets", code: 500 };
        }
    }

    // Update ticket type
    static async update(id: number, ticketType: EventTicketTypeUpdateDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventTicketType} SET
                    name = COALESCE($1, name),
                    description = COALESCE($2, description),
                    price = COALESCE($3, price),
                    quantity = COALESCE($4, quantity),
                    min_per_order = COALESCE($5, min_per_order),
                    max_per_order = COALESCE($6, max_per_order),
                    sale_start_date = COALESCE($7, sale_start_date),
                    sale_end_date = COALESCE($8, sale_end_date),
                    is_active = COALESCE($9, is_active),
                    benefits = COALESCE($10, benefits),
                    display_order = COALESCE($11, display_order),
                    updated_at = NOW()
                WHERE id = $12 AND is_deleted = FALSE
                RETURNING *`,
                [
                    ticketType.name,
                    ticketType.description,
                    ticketType.price,
                    ticketType.quantity,
                    ticketType.min_per_order,
                    ticketType.max_per_order,
                    ticketType.sale_start_date,
                    ticketType.sale_end_date,
                    ticketType.is_active,
                    ticketType.benefits,
                    ticketType.display_order,
                    id
                ]
            );

            if (!result) {
                return { status: false, message: "Type de ticket non trouvé", code: 404 };
            }

            return { status: true, message: "Type de ticket mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour du type de ticket", code: 500 };
        }
    }

    // Decrease available quantity (when ticket is purchased)
    static async decreaseAvailableQuantity(id: number, quantity: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventTicketType} SET
                    available_quantity = available_quantity - $1,
                    updated_at = NOW()
                WHERE id = $2 AND is_deleted = FALSE AND available_quantity >= $1
                RETURNING *`,
                [quantity, id]
            );

            if (!result) {
                return { status: false, message: "Type de ticket non trouvé ou stock insuffisant", code: 404 };
            }

            return { status: true, message: "Quantité mise à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour de la quantité", code: 500 };
        }
    }

    // Increase available quantity (when ticket is refunded)
    static async increaseAvailableQuantity(id: number, quantity: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventTicketType} SET
                    available_quantity = available_quantity + $1,
                    updated_at = NOW()
                WHERE id = $2 AND is_deleted = FALSE
                RETURNING *`,
                [quantity, id]
            );

            if (!result) {
                return { status: false, message: "Type de ticket non trouvé", code: 404 };
            }

            return { status: true, message: "Quantité mise à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour de la quantité", code: 500 };
        }
    }

    // Check availability
    static async checkAvailability(id: number, requestedQuantity: number): Promise<ResponseModel> {
        try {
            const ticketType = await pgpDb.oneOrNone(
                `SELECT id, name, available_quantity, is_active, sale_start_date, sale_end_date
                FROM ${kEventTicketType}
                WHERE id = $1 AND is_deleted = FALSE`,
                [id]
            );

            if (!ticketType) {
                return { status: false, message: "Type de ticket non trouvé", code: 404 };
            }

            if (!ticketType.is_active) {
                return { status: false, message: "Ce type de ticket n'est pas actif", code: 400 };
            }

            const now = new Date();
            if (ticketType.sale_start_date && new Date(ticketType.sale_start_date) > now) {
                return { status: false, message: "La vente n'a pas encore commencé pour ce type de ticket", code: 400 };
            }

            if (ticketType.sale_end_date && new Date(ticketType.sale_end_date) < now) {
                return { status: false, message: "La vente est terminée pour ce type de ticket", code: 400 };
            }

            const available = ticketType.available_quantity >= requestedQuantity;

            return {
                status: available,
                message: available ? "Tickets disponibles" : "Stock insuffisant",
                body: { available, available_quantity: ticketType.available_quantity },
                code: available ? 200 : 400
            };
        } catch (error) {
            return { status: false, message: "Erreur lors de la vérification de disponibilité", code: 500 };
        }
    }

    // Get statistics by event
    static async getStatisticsByEvent(eventId: number): Promise<ResponseModel> {
        try {
            const stats = await pgpDb.any(
                `SELECT
                    tt.id,
                    tt.name,
                    tt.price,
                    tt.quantity,
                    tt.available_quantity,
                    (tt.quantity - tt.available_quantity) as sold_quantity,
                    ROUND(((tt.quantity - tt.available_quantity)::DECIMAL / tt.quantity) * 100, 2) as sold_percentage
                FROM ${kEventTicketType} tt
                WHERE tt.event_id = $1 AND tt.is_deleted = FALSE
                ORDER BY tt.display_order ASC`,
                [eventId]
            );

            return { status: true, message: "Statistiques récupérées", body: stats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques", code: 500 };
        }
    }

    // Reorder ticket types
    static async reorder(ticketTypeOrders: { id: number; display_order: number }[]): Promise<ResponseModel> {
        try {
            for (const item of ticketTypeOrders) {
                await pgpDb.none(
                    `UPDATE ${kEventTicketType} SET display_order = $1, updated_at = NOW() WHERE id = $2`,
                    [item.display_order, item.id]
                );
            }

            return { status: true, message: "Ordre des types de tickets mis à jour", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la réorganisation des types de tickets", code: 500 };
        }
    }

    // Soft delete ticket type
    static async softDelete(id: number, deletedBy?: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `UPDATE ${kEventTicketType} SET
                    is_deleted = TRUE,
                    deleted_at = NOW(),
                    deleted_by = $2,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = FALSE`,
                [id, deletedBy]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Type de ticket non trouvé ou déjà supprimé", code: 404 };
            }

            return { status: true, message: "Type de ticket supprimé", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression du type de ticket", code: 500 };
        }
    }

    // Restore soft deleted ticket type
    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventTicketType} SET
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = TRUE
                RETURNING *`,
                [id]
            );

            if (!result) {
                return { status: false, message: "Type de ticket non trouvé", code: 404 };
            }

            return { status: true, message: "Type de ticket restauré", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la restauration du type de ticket", code: 500 };
        }
    }

    // Hard delete ticket type
    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `DELETE FROM ${kEventTicketType} WHERE id = $1`,
                [id]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Type de ticket non trouvé", code: 404 };
            }

            return { status: true, message: "Type de ticket supprimé définitivement", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression du type de ticket", code: 500 };
        }
    }
}

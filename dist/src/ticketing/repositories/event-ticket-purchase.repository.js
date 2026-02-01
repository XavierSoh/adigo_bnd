"use strict";
/**
 * Event Ticket Purchase Repository
 *
 * Handles ticket purchases, QR code generation, and validation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventTicketPurchaseRepository = void 0;
const pgdb_1 = __importDefault(require("../../config/pgdb"));
class EventTicketPurchaseRepository {
    // Create ticket purchase
    static async create(purchase) {
        try {
            // Start transaction
            return await pgdb_1.default.tx(async (t) => {
                // 1. Check ticket availability
                const ticketType = await t.oneOrNone(`SELECT id, price, quantity, available_quantity, event_id
                    FROM event_ticket_type
                    WHERE id = $1 AND is_deleted = FALSE AND is_active = TRUE`, [purchase.ticket_type_id]);
                if (!ticketType) {
                    return { status: false, message: "Type de ticket non trouvé", code: 404 };
                }
                if (ticketType.available_quantity < purchase.quantity) {
                    return {
                        status: false,
                        message: `Seulement ${ticketType.available_quantity} places disponibles`,
                        code: 400
                    };
                }
                // 2. Calculate prices
                const unitPrice = ticketType.price;
                const subtotal = unitPrice * purchase.quantity;
                const totalPrice = purchase.final_price || subtotal;
                // 3. Create purchase
                const result = await t.one(`INSERT INTO ${this.TABLE} (
                        event_id, ticket_type_id, customer_id, quantity,
                        unit_price, subtotal, total_price, final_price,
                        payment_method, payment_status, payment_reference,
                        status, purchase_source, attendee_name,
                        attendee_first_name, attendee_last_name,
                        attendee_email, attendee_phone, group_id, is_group_leader
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                    RETURNING *`, [
                    ticketType.event_id,
                    purchase.ticket_type_id,
                    purchase.customer_id,
                    purchase.quantity,
                    unitPrice,
                    subtotal,
                    totalPrice,
                    totalPrice,
                    purchase.payment_method,
                    'pending',
                    purchase.payment_reference,
                    'pending',
                    purchase.purchase_source || 'web',
                    purchase.attendee_name,
                    purchase.attendee_first_name,
                    purchase.attendee_last_name,
                    purchase.attendee_email,
                    purchase.attendee_phone,
                    purchase.group_id,
                    purchase.is_group_leader
                ]);
                // 4. Update available quantity
                await t.none(`UPDATE event_ticket_type
                    SET available_quantity = available_quantity - $1
                    WHERE id = $2`, [purchase.quantity, purchase.ticket_type_id]);
                return { status: true, message: "Achat créé", body: result, code: 201 };
            });
        }
        catch (error) {
            console.error('Erreur création achat:', error);
            return { status: false, message: "Erreur création achat", code: 500 };
        }
    }
    // Confirm payment and generate QR code
    static async confirmPayment(ticketId, qrCodeData, qrCodeImage, walletTransactionId) {
        try {
            const result = await pgdb_1.default.one(`UPDATE ${this.TABLE}
                SET payment_status = 'paid',
                    status = 'confirmed',
                    qr_code_data = $2,
                    qr_code_image = $3,
                    wallet_transaction_id = $4,
                    payment_date = CURRENT_TIMESTAMP,
                    confirmation_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *`, [ticketId, qrCodeData, qrCodeImage, walletTransactionId]);
            return { status: true, message: "Paiement confirmé", body: result, code: 200 };
        }
        catch (error) {
            console.error('Erreur confirmation paiement:', error);
            return { status: false, message: "Erreur confirmation paiement", code: 500 };
        }
    }
    // Validate ticket (scan QR code)
    static async validateTicket(validation) {
        try {
            // Find ticket by reference
            const ticket = await pgdb_1.default.oneOrNone(`SELECT * FROM ${this.TABLE}
                WHERE reference = $1 AND is_deleted = FALSE`, [validation.ticket_reference]);
            if (!ticket) {
                return { status: false, message: "Ticket non trouvé", code: 404 };
            }
            if (ticket.status !== 'confirmed') {
                return { status: false, message: `Ticket ${ticket.status}`, code: 400 };
            }
            if (ticket.is_validated) {
                return {
                    status: false,
                    message: `Ticket déjà validé le ${ticket.validated_at}`,
                    code: 400
                };
            }
            // Validate
            const result = await pgdb_1.default.one(`UPDATE ${this.TABLE}
                SET is_validated = TRUE,
                    status = 'used',
                    validated_at = CURRENT_TIMESTAMP,
                    validated_by = $2,
                    validation_method = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *`, [ticket.id, validation.validated_by, validation.validation_method || 'scanner_device']);
            return { status: true, message: "Ticket validé avec succès", body: result, code: 200 };
        }
        catch (error) {
            console.error('Erreur validation ticket:', error);
            return { status: false, message: "Erreur validation ticket", code: 500 };
        }
    }
    // Get customer tickets
    static async findByCustomer(customerId, filters) {
        try {
            let query = `
                SELECT
                    t.*,
                    json_build_object(
                        'id', e.id,
                        'title', e.title,
                        'event_code', e.code,
                        'event_date', e.event_date,
                        'venue_name', e.venue_name,
                        'venue_city', e.venue_city,
                        'poster_image', e.cover_image
                    ) AS event,
                    json_build_object(
                        'id', tt.id,
                        'name', tt.name,
                        'price', tt.price
                    ) AS ticket_type
                FROM ${this.TABLE} t
                LEFT JOIN event e ON t.event_id = e.id
                LEFT JOIN event_ticket_type tt ON t.ticket_type_id = tt.id
                WHERE t.customer_id = $1 AND t.is_deleted = FALSE
            `;
            const params = [customerId];
            if (filters?.status) {
                query += ` AND t.status = $${params.length + 1}`;
                params.push(filters.status);
            }
            query += ` ORDER BY t.created_at DESC`;
            const tickets = await pgdb_1.default.any(query, params);
            return {
                status: true,
                message: "Tickets récupérés",
                body: { tickets, total: tickets.length },
                code: 200
            };
        }
        catch (error) {
            console.error('Erreur récupération tickets:', error);
            return { status: false, message: "Erreur récupération tickets", code: 500 };
        }
    }
    // Get ticket by ID
    static async findById(id) {
        try {
            const ticket = await pgdb_1.default.oneOrNone(`SELECT
                    t.*,
                    json_build_object(
                        'id', e.id,
                        'title', e.title,
                        'event_code', e.code,
                        'event_date', e.event_date,
                        'venue_name', e.venue_name,
                        'venue_address', e.venue_address,
                        'venue_city', e.venue_city,
                        'poster_image', e.cover_image
                    ) AS event,
                    json_build_object(
                        'id', tt.id,
                        'name', tt.name,
                        'description', tt.description,
                        'price', tt.price
                    ) AS ticket_type,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'email', c.email,
                        'phone', c.phone
                    ) AS customer
                FROM ${this.TABLE} t
                LEFT JOIN event e ON t.event_id = e.id
                LEFT JOIN event_ticket_type tt ON t.ticket_type_id = tt.id
                LEFT JOIN customer c ON t.customer_id = c.id
                WHERE t.id = $1 AND t.is_deleted = FALSE`, [id]);
            if (!ticket) {
                return { status: false, message: "Ticket non trouvé", code: 404 };
            }
            return { status: true, message: "Ticket trouvé", body: ticket, code: 200 };
        }
        catch (error) {
            console.error('Erreur recherche ticket:', error);
            return { status: false, message: "Erreur recherche ticket", code: 500 };
        }
    }
    // Get tickets for an event
    static async findByEvent(eventId) {
        try {
            const tickets = await pgdb_1.default.any(`SELECT
                    t.*,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'email', c.email
                    ) AS customer,
                    json_build_object(
                        'id', tt.id,
                        'name', tt.name
                    ) AS ticket_type
                FROM ${this.TABLE} t
                LEFT JOIN customer c ON t.customer_id = c.id
                LEFT JOIN event_ticket_type tt ON t.ticket_type_id = tt.id
                WHERE t.event_id = $1 AND t.is_deleted = FALSE
                ORDER BY t.created_at DESC`, [eventId]);
            return {
                status: true,
                message: "Tickets récupérés",
                body: { tickets, total: tickets.length },
                code: 200
            };
        }
        catch (error) {
            console.error('Erreur récupération tickets événement:', error);
            return { status: false, message: "Erreur récupération tickets", code: 500 };
        }
    }
    // Cancel ticket
    static async cancel(ticketId, reason) {
        try {
            return await pgdb_1.default.tx(async (t) => {
                const ticket = await t.oneOrNone(`SELECT * FROM ${this.TABLE} WHERE id = $1`, [ticketId]);
                if (!ticket) {
                    return { status: false, message: "Ticket non trouvé", code: 404 };
                }
                if (ticket.status === 'used' || ticket.is_validated) {
                    return { status: false, message: "Ticket déjà utilisé", code: 400 };
                }
                // Cancel ticket
                await t.none(`UPDATE ${this.TABLE}
                    SET status = 'cancelled',
                        cancellation_date = CURRENT_TIMESTAMP,
                        cancellation_reason = $2,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1`, [ticketId, reason]);
                // Restore availability
                await t.none(`UPDATE event_ticket_type
                    SET available_quantity = available_quantity + $1
                    WHERE id = $2`, [ticket.quantity, ticket.ticket_type_id]);
                return { status: true, message: "Ticket annulé", code: 200 };
            });
        }
        catch (error) {
            console.error('Erreur annulation ticket:', error);
            return { status: false, message: "Erreur annulation ticket", code: 500 };
        }
    }
    // Refund ticket
    static async refund(ticketId, refund) {
        try {
            const result = await pgdb_1.default.one(`UPDATE ${this.TABLE}
                SET status = 'refunded',
                    payment_status = 'refunded',
                    refund_amount = total_price,
                    refund_reason = $2,
                    refund_date = CURRENT_TIMESTAMP,
                    refund_processed_by = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *`, [ticketId, refund.refund_reason, refund.refund_processed_by]);
            return { status: true, message: "Remboursement effectué", body: result, code: 200 };
        }
        catch (error) {
            console.error('Erreur remboursement:', error);
            return { status: false, message: "Erreur remboursement", code: 500 };
        }
    }
}
exports.EventTicketPurchaseRepository = EventTicketPurchaseRepository;
EventTicketPurchaseRepository.TABLE = 'event_ticket';

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketRepository = void 0;
const pgdb_1 = __importDefault(require("../../config/pgdb"));
const table_names_1 = require("../../utils/table_names");
const ticket_type_repository_1 = require("./ticket-type.repository");
const uuid_1 = require("uuid");
class TicketRepository {
    static async findByCustomerId(customerId) {
        try {
            const result = await pgdb_1.default.any(`${this.SELECT_WITH_JOINS} WHERE t.customer_id = $1 ORDER BY t.created_at DESC`, [customerId]);
            return { status: true, message: "Tickets récupérés", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }
    static async findById(id) {
        try {
            const result = await pgdb_1.default.oneOrNone(`${this.SELECT_WITH_JOINS} WHERE t.id = $1`, [id]);
            if (!result)
                return { status: false, message: "Ticket non trouvé", code: 404 };
            return { status: true, message: "Ticket trouvé", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }
    static async findByReference(reference) {
        try {
            const result = await pgdb_1.default.oneOrNone(`${this.SELECT_WITH_JOINS} WHERE t.reference = $1`, [reference]);
            if (!result)
                return { status: false, message: "Ticket non trouvé", code: 404 };
            return { status: true, message: "Ticket trouvé", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }
    static async purchase(data) {
        try {
            // Get ticket type info
            const typeRes = await ticket_type_repository_1.TicketTypeRepository.findById(data.ticket_type_id);
            if (!typeRes.status)
                return typeRes;
            const ticketType = typeRes.body;
            const available = ticketType.quantity - ticketType.sold;
            // Check availability
            if (available < data.quantity) {
                return { status: false, message: `Seulement ${available} tickets disponibles`, code: 400 };
            }
            // Check max per order
            if (data.quantity > ticketType.max_per_order) {
                return { status: false, message: `Maximum ${ticketType.max_per_order} tickets par commande`, code: 400 };
            }
            const unitPrice = ticketType.price;
            const totalPrice = unitPrice * data.quantity;
            const qrCode = (0, uuid_1.v4)();
            const result = await pgdb_1.default.one(`INSERT INTO ${table_names_1.kEventTicket}
                    (event_id, ticket_type_id, customer_id, quantity, unit_price, total_price, payment_method, qr_code)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [data.event_id, data.ticket_type_id, data.customer_id, data.quantity, unitPrice, totalPrice, data.payment_method, qrCode]);
            return { status: true, message: "Achat initié", body: result, code: 201 };
        }
        catch (error) {
            console.error('Purchase error:', error);
            return { status: false, message: "Erreur lors de l'achat", code: 500 };
        }
    }
    static async confirmPayment(id, paymentData) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEventTicket} SET
                    payment_ref = $1,
                    payment_status = $2,
                    status = CASE WHEN $2 = 'paid' THEN 'confirmed' ELSE status END
                 WHERE id = $3 RETURNING *`, [paymentData.payment_ref, paymentData.payment_status, id]);
            if (!result)
                return { status: false, message: "Ticket non trouvé", code: 404 };
            // If paid, update sold count
            if (paymentData.payment_status === 'paid') {
                await ticket_type_repository_1.TicketTypeRepository.incrementSold(result.ticket_type_id, result.quantity);
            }
            return { status: true, message: "Paiement confirmé", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la confirmation", code: 500 };
        }
    }
    static async validate(id) {
        try {
            const ticket = await pgdb_1.default.oneOrNone(`SELECT * FROM ${table_names_1.kEventTicket} WHERE id = $1`, [id]);
            if (!ticket)
                return { status: false, message: "Ticket non trouvé", code: 404 };
            if (ticket.status === 'used') {
                return { status: false, message: "Ticket déjà utilisé", code: 400 };
            }
            if (ticket.status !== 'confirmed') {
                return { status: false, message: "Ticket non confirmé", code: 400 };
            }
            const result = await pgdb_1.default.one(`UPDATE ${table_names_1.kEventTicket} SET status = 'used', used_at = NOW() WHERE id = $1 RETURNING *`, [id]);
            return { status: true, message: "Ticket validé", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la validation", code: 500 };
        }
    }
    static async validateByQr(qrCode) {
        try {
            const ticket = await pgdb_1.default.oneOrNone(`SELECT * FROM ${table_names_1.kEventTicket} WHERE qr_code = $1`, [qrCode]);
            if (!ticket)
                return { status: false, message: "QR code invalide", code: 404 };
            return this.validate(ticket.id);
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la validation", code: 500 };
        }
    }
    static async cancel(id) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEventTicket} SET status = 'cancelled' WHERE id = $1 AND status IN ('pending', 'confirmed') RETURNING *`, [id]);
            if (!result)
                return { status: false, message: "Impossible d'annuler ce ticket", code: 400 };
            return { status: true, message: "Ticket annulé", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de l'annulation", code: 500 };
        }
    }
}
exports.TicketRepository = TicketRepository;
TicketRepository.SELECT_WITH_JOINS = `
        SELECT t.*,
            row_to_json(e) as event,
            row_to_json(tt) as ticket_type
        FROM ${table_names_1.kEventTicket} t
        LEFT JOIN ${table_names_1.kEvent} e ON t.event_id = e.id
        LEFT JOIN ${table_names_1.kEventTicketType} tt ON t.ticket_type_id = tt.id
    `;

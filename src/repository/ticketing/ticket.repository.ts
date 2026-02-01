import pgpDb from "../../config/pgdb";
import { TicketPurchaseDto, TicketPaymentDto, TicketStatus } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";
import { kEventTicket, kEvent, kEventTicketType } from "../../utils/table_names";
import { TicketTypeRepository } from "./ticket-type.repository";
import { v4 as uuidv4 } from 'uuid';

export class TicketRepository {

    private static readonly SELECT_WITH_JOINS = `
        SELECT t.*,
            row_to_json(e) as event,
            row_to_json(tt) as ticket_type
        FROM ${kEventTicket} t
        LEFT JOIN ${kEvent} e ON t.event_id = e.id
        LEFT JOIN ${kEventTicketType} tt ON t.ticket_type_id = tt.id
    `;

    static async findByCustomerId(customerId: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.any(
                `${this.SELECT_WITH_JOINS} WHERE t.customer_id = $1 ORDER BY t.created_at DESC`,
                [customerId]
            );
            return { status: true, message: "Tickets récupérés", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(`${this.SELECT_WITH_JOINS} WHERE t.id = $1`, [id]);
            if (!result) return { status: false, message: "Ticket non trouvé", code: 404 };
            return { status: true, message: "Ticket trouvé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async findByReference(reference: string): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `${this.SELECT_WITH_JOINS} WHERE t.reference = $1`,
                [reference]
            );
            if (!result) return { status: false, message: "Ticket non trouvé", code: 404 };
            return { status: true, message: "Ticket trouvé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async purchase(data: TicketPurchaseDto): Promise<ResponseModel> {
        try {
            // Get ticket type info
            const typeRes = await TicketTypeRepository.findById(data.ticket_type_id);
            if (!typeRes.status) return typeRes;

            const ticketType = typeRes.body as any;
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
            const qrCode = uuidv4();

            const result = await pgpDb.one(
                `INSERT INTO ${kEventTicket}
                    (event_id, ticket_type_id, customer_id, quantity, unit_price, total_price, payment_method, qr_code)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [data.event_id, data.ticket_type_id, data.customer_id, data.quantity, unitPrice, totalPrice, data.payment_method, qrCode]
            );

            return { status: true, message: "Achat initié", body: result, code: 201 };
        } catch (error) {
            console.error('Purchase error:', error);
            return { status: false, message: "Erreur lors de l'achat", code: 500 };
        }
    }

    static async confirmPayment(id: number, paymentData: TicketPaymentDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventTicket} SET
                    payment_ref = $1,
                    payment_status = $2,
                    status = CASE WHEN $2 = 'paid' THEN 'confirmed' ELSE status END
                 WHERE id = $3 RETURNING *`,
                [paymentData.payment_ref, paymentData.payment_status, id]
            );

            if (!result) return { status: false, message: "Ticket non trouvé", code: 404 };

            // If paid, update sold count
            if (paymentData.payment_status === 'paid') {
                await TicketTypeRepository.incrementSold(result.ticket_type_id, result.quantity);
            }

            return { status: true, message: "Paiement confirmé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la confirmation", code: 500 };
        }
    }

    static async validate(id: number): Promise<ResponseModel> {
        try {
            const ticket = await pgpDb.oneOrNone(`SELECT * FROM ${kEventTicket} WHERE id = $1`, [id]);
            if (!ticket) return { status: false, message: "Ticket non trouvé", code: 404 };

            if (ticket.status === 'used') {
                return { status: false, message: "Ticket déjà utilisé", code: 400 };
            }
            if (ticket.status !== 'confirmed') {
                return { status: false, message: "Ticket non confirmé", code: 400 };
            }

            const result = await pgpDb.one(
                `UPDATE ${kEventTicket} SET status = 'used', used_at = NOW() WHERE id = $1 RETURNING *`,
                [id]
            );

            return { status: true, message: "Ticket validé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la validation", code: 500 };
        }
    }

    static async validateByQr(qrCode: string): Promise<ResponseModel> {
        try {
            const ticket = await pgpDb.oneOrNone(
                `SELECT * FROM ${kEventTicket} WHERE qr_code = $1`,
                [qrCode]
            );
            if (!ticket) return { status: false, message: "QR code invalide", code: 404 };

            return this.validate(ticket.id);
        } catch (error) {
            return { status: false, message: "Erreur lors de la validation", code: 500 };
        }
    }

    static async cancel(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventTicket} SET status = 'cancelled' WHERE id = $1 AND status IN ('pending', 'confirmed') RETURNING *`,
                [id]
            );
            if (!result) return { status: false, message: "Impossible d'annuler ce ticket", code: 400 };
            return { status: true, message: "Ticket annulé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de l'annulation", code: 500 };
        }
    }
}

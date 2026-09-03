// Migrated to Prisma's native model API (prisma.event_ticket.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 3).
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import { TicketPurchaseDto, TicketPaymentDto } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";
import { TicketTypeRepository } from "./ticket-type.repository";
import { v4 as uuidv4 } from 'uuid';

// `row_to_json(e)`/`row_to_json(tt)` selected every column of event/
// event_ticket_type — plain `include` (no `select`) matches that exactly.
const withJoins = {
    event: true,
    event_ticket_type: true,
} satisfies Prisma.event_ticketInclude;

/** `event`/`ticket_type` — the original's json alias names — instead of
 * Prisma's relation names (`event`/`event_ticket_type`). */
function mapTicket<T extends { event_ticket_type: unknown }>(row: T) {
    const { event_ticket_type, ...rest } = row;
    return { ...rest, ticket_type: event_ticket_type };
}

export class TicketRepository {

    static async findByCustomerId(customerId: number): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.event_ticket.findMany({
                where: { customer_id: customerId },
                include: withJoins,
                orderBy: { created_at: 'desc' },
            });
            return { status: true, message: "Tickets récupérés", body: rows.map(mapTicket), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_ticket.findUnique({ where: { id }, include: withJoins });
            if (!result) return { status: false, message: "Ticket non trouvé", code: 404 };
            return { status: true, message: "Ticket trouvé", body: mapTicket(result), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async findByReference(reference: string): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_ticket.findUnique({ where: { reference }, include: withJoins });
            if (!result) return { status: false, message: "Ticket non trouvé", code: 404 };
            return { status: true, message: "Ticket trouvé", body: mapTicket(result), code: 200 };
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

            const result = await prismaDb.event_ticket.create({
                data: {
                    event_id: data.event_id,
                    ticket_type_id: data.ticket_type_id,
                    customer_id: data.customer_id,
                    quantity: data.quantity,
                    unit_price: unitPrice,
                    total_price: totalPrice,
                    payment_method: data.payment_method,
                    qr_code: qrCode,
                } as Prisma.event_ticketUncheckedCreateInput,
            });

            return { status: true, message: "Achat initié", body: result, code: 201 };
        } catch (error) {
            console.error('Purchase error:', error);
            return { status: false, message: "Erreur lors de l'achat", code: 500 };
        }
    }

    static async confirmPayment(id: number, paymentData: TicketPaymentDto): Promise<ResponseModel> {
        try {
            // `status = CASE WHEN $2 = 'paid' THEN 'confirmed' ELSE status
            // END` — decided in JS instead: only touch `status` when the
            // new payment_status is 'paid', otherwise leave it alone
            // exactly like the ELSE branch did.
            const data: Prisma.event_ticketUpdateInput = {
                payment_ref: paymentData.payment_ref,
                payment_status: paymentData.payment_status,
            };
            if (paymentData.payment_status === 'paid') data.status = 'confirmed';

            const updateResult = await prismaDb.event_ticket.updateMany({ where: { id }, data });
            if (updateResult.count === 0) return { status: false, message: "Ticket non trouvé", code: 404 };

            const result = await prismaDb.event_ticket.findUnique({ where: { id } });

            // If paid, update sold count
            if (paymentData.payment_status === 'paid' && result) {
                await TicketTypeRepository.incrementSold(result.ticket_type_id, result.quantity);
            }

            return { status: true, message: "Paiement confirmé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la confirmation", code: 500 };
        }
    }

    static async validate(id: number): Promise<ResponseModel> {
        try {
            const ticket = await prismaDb.event_ticket.findUnique({ where: { id } });
            if (!ticket) return { status: false, message: "Ticket non trouvé", code: 404 };

            if (ticket.status === 'used') {
                return { status: false, message: "Ticket déjà utilisé", code: 400 };
            }
            if (ticket.status !== 'confirmed') {
                return { status: false, message: "Ticket non confirmé", code: 400 };
            }

            const result = await prismaDb.event_ticket.update({
                where: { id },
                data: { status: 'used', used_at: new Date() },
            });

            return { status: true, message: "Ticket validé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la validation", code: 500 };
        }
    }

    static async validateByQr(qrCode: string): Promise<ResponseModel> {
        try {
            const ticket = await prismaDb.event_ticket.findFirst({ where: { qr_code: qrCode } });
            if (!ticket) return { status: false, message: "QR code invalide", code: 404 };

            return this.validate(ticket.id);
        } catch (error) {
            return { status: false, message: "Erreur lors de la validation", code: 500 };
        }
    }

    static async cancel(id: number): Promise<ResponseModel> {
        try {
            const updateResult = await prismaDb.event_ticket.updateMany({
                where: { id, status: { in: ['pending', 'confirmed'] } },
                data: { status: 'cancelled' },
            });
            if (updateResult.count === 0) return { status: false, message: "Impossible d'annuler ce ticket", code: 400 };
            const result = await prismaDb.event_ticket.findUnique({ where: { id } });
            return { status: true, message: "Ticket annulé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de l'annulation", code: 500 };
        }
    }
}

// Lecture des billets d'un client et confirmation des paiements en espèces
// au guichet. Migrated to Prisma's native model API (prisma.event_ticket.*)
// — see BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
//
// Création, expiration, annulation et remboursement : voir
// src/ticketing/services/ticket-purchase.service.ts, ticket-refund.service.ts
// et ticket-cancellation.service.ts.
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import { TicketPaymentDto } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";

const withJoins = {
    event: {
        select: {
            id: true, code: true, title: true, cover_image: true, event_date: true, event_end_date: true,
            venue_name: true, venue_address: true, city: true, maps_link: true, status: true,
            cancellation_reason: true, cancellation_policy: true, refund_policy: true,
        },
    },
    event_ticket_type: true,
} satisfies Prisma.event_ticketInclude;

type TicketRow = Prisma.event_ticketGetPayload<{ include: typeof withJoins }>;

/**
 * Forme renvoyée au client : `ticket_type` au lieu du nom de relation
 * Prisma, champs d'affichage attendus par l'app (`event_code`,
 * `venue_city`, `poster_image`), et sans les champs internes (commission,
 * décideur de l'annulation).
 */
function mapTicket(row: TicketRow) {
    const { event_ticket_type, commission_rate: _rate, commission_amount: _amount, cancel_decided_by: _by, event, ...rest } = row;
    return {
        ...rest,
        ticket_type: event_ticket_type,
        event: event
            ? { ...event, event_code: event.code, venue_city: event.city, poster_image: event.cover_image }
            : null,
    };
}

export class TicketRepository {

    static async findByCustomerId(customerId: number): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.event_ticket.findMany({
                where: { customer_id: customerId, is_deleted: false },
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
            const result = await prismaDb.event_ticket.findFirst({ where: { id, is_deleted: false }, include: withJoins });
            if (!result) return { status: false, message: "Ticket non trouvé", code: 404 };
            return { status: true, message: "Ticket trouvé", body: mapTicket(result), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async findByReference(reference: string): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_ticket.findFirst({ where: { reference, is_deleted: false }, include: withJoins });
            if (!result) return { status: false, message: "Ticket non trouvé", code: 404 };
            return { status: true, message: "Ticket trouvé", body: mapTicket(result), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    // Deliberately separate from findById/withJoins - a `select` naming
    // exactly the fields needed, never the customer's whole row.
    static async findForEmail(id: number) {
        return prismaDb.event_ticket.findUnique({
            where: { id },
            select: {
                id: true,
                reference: true,
                quantity: true,
                total_price: true,
                event: { select: { title: true } },
                customer: { select: { email: true, first_name: true, preferred_language: true } },
            },
        });
    }

    // Cash-only (box office): wallet/orangeMoney tickets settle on their
    // own. The seat was already reserved when the ticket was created
    // (TicketPurchaseService.create), so confirming does NOT touch `sold`.
    static async confirmPayment(id: number, paymentData: TicketPaymentDto): Promise<ResponseModel> {
        try {
            const ticket = await prismaDb.event_ticket.findUnique({ where: { id } });
            if (!ticket) return { status: false, message: "Ticket non trouvé", code: 404 };

            if (ticket.payment_method !== 'cash') {
                return {
                    status: false,
                    message: ticket.payment_method === 'wallet'
                        ? "Ce ticket est payé par portefeuille : il est confirmé automatiquement, pas via cet endpoint."
                        : "Ce ticket est payé via Orange Money : il est confirmé automatiquement une fois le paiement validé, pas via cet endpoint.",
                    code: 400,
                };
            }
            const updated = await prismaDb.event_ticket.updateMany({
                where: { id, payment_method: 'cash', payment_status: 'pending', status: 'pending' },
                data: { payment_ref: paymentData?.payment_ref || 'cash', payment_status: 'paid', status: 'confirmed' },
            });
            if (updated.count === 0) return { status: false, message: "Ticket déjà payé, annulé ou expiré", code: 400 };

            const result = await prismaDb.event_ticket.findUnique({ where: { id } });
            return { status: true, message: "Paiement en espèces confirmé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la confirmation", code: 500 };
        }
    }
}

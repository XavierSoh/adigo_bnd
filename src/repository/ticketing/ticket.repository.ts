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

    // Deliberately separate from findById/withJoins - a `select` naming
    // exactly the fields needed, not a blanket `include: {customer: true}`
    // on the shared, API-response-facing withJoins (which would leak the
    // customer's password hash and every other column to any caller of
    // GET /tickets/:id or /tickets/ref/:reference).
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

    // Plain DB write - all payment orchestration (balance checks,
    // WalletRepository.recordPayment, PaymentService.initiate) lives in
    // TicketController.purchase, mirroring booking's controller/repository
    // split. Callers pass the already-validated price and initial
    // status/payment_status for the chosen payment method.
    static async createPending(
        data: TicketPurchaseDto,
        unitPrice: number,
        totalPrice: number,
        status: 'pending' | 'confirmed',
        paymentStatus: 'pending'
    ): Promise<ResponseModel> {
        try {
            // Same style as booking.repository.ts's generateBookingReference()
            // (no collision retry there either, don't add one here).
            const reference = `TK${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
            const qrCode = uuidv4();

            const result = await prismaDb.event_ticket.create({
                data: {
                    reference,
                    event_id: data.event_id,
                    ticket_type_id: data.ticket_type_id,
                    customer_id: data.customer_id,
                    quantity: data.quantity,
                    unit_price: unitPrice,
                    total_price: totalPrice,
                    payment_method: data.payment_method,
                    payment_status: paymentStatus,
                    status,
                    qr_code: qrCode,
                } as Prisma.event_ticketUncheckedCreateInput,
            });

            return { status: true, message: "Achat initié", body: result, code: 201 };
        } catch (error) {
            console.error('Purchase error:', error);
            return { status: false, message: "Erreur lors de l'achat", code: 500 };
        }
    }

    // Unwinds a ticket whose Orange Money payment failed to even initiate
    // (row was created 'pending') - mirrors booking's cancelBatch/status-based
    // undo for the Orange Money path.
    static async markCancelled(id: number): Promise<void> {
        await prismaDb.event_ticket.updateMany({
            where: { id, status: 'pending' },
            data: { status: 'cancelled' },
        });
    }

    // Marks a wallet-paid ticket as actually paid, once WalletRepository.recordPayment
    // has succeeded (createPending alone only gets it to status:'confirmed',
    // payment_status:'pending' - the debit is a separate step in the controller).
    static async markWalletPaid(id: number, paymentRef: string): Promise<void> {
        await prismaDb.event_ticket.update({
            where: { id },
            data: { payment_status: 'paid', payment_ref: paymentRef },
        });
    }

    // Unwinds a ticket whose wallet debit failed after the row was already
    // created 'confirmed' - mirrors BookingRepository.softDelete used in
    // BookingController.create's wallet-failure path.
    static async softDeleteFailed(id: number): Promise<void> {
        await prismaDb.event_ticket.updateMany({
            where: { id },
            data: { is_deleted: true, deleted_at: new Date() },
        });
    }

    // Cash-only now: wallet/orangeMoney tickets settle automatically via
    // WalletRepository.recordPayment (synchronous) or the 'ticket_purchase'
    // settlement handler (Orange Money webhook) - this endpoint used to
    // trust whatever payment_status the client sent, confirming any ticket
    // for free regardless of payment_method (a real, live exploit, fixed
    // here rather than reproduced).
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
            if (ticket.payment_status === 'paid') {
                return { status: false, message: "Ticket déjà payé", code: 400 };
            }

            const result = await prismaDb.event_ticket.update({
                where: { id },
                data: {
                    payment_ref: paymentData.payment_ref || 'cash',
                    payment_status: 'paid',
                    status: 'confirmed',
                },
            });

            await TicketTypeRepository.incrementSold(result.ticket_type_id, result.quantity);

            return { status: true, message: "Paiement en espèces confirmé", body: result, code: 200 };
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

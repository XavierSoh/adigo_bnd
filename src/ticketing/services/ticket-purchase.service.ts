/**
 * Achat d'un billet (TICKETING_MODULE_PLAN_2026-10.md §3.2 / §5.4).
 *
 * `event_ticket_type.sold` compte les places RÉSERVÉES : il est incrémenté
 * dès la création du billet, sous verrou de la ligne du type de billet,
 * quel que soit le moyen de paiement — un paiement Orange Money en cours
 * bloque donc sa place, et deux achats simultanés ne peuvent pas vendre la
 * même dernière place. Les places sont rendues à l'expiration, à
 * l'annulation et au remboursement (releaseSeatsTx).
 */
import { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import prismaDb from "../../config/prismaClient";
import { PrismaTx } from "../utils/prisma-tx";
import { commissionFor, hasEnded } from "../utils/ticketing-rules";
import { creditWalletTx, releaseSeatsTx } from "./ticket-refund.service";

type Tx = PrismaTx;
type Fail = { ok: false; code: number; message: string };

export type PurchaseMethod = 'wallet' | 'orangeMoney' | 'cash';

class PurchaseAbort extends Error {
    constructor(public readonly code: number, message: string) {
        super(message);
    }
}

function generateReference(): string {
    return `TK${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
}

async function lockTicketType(tx: Tx, ticketTypeId: number) {
    await tx.$queryRaw`SELECT id FROM event_ticket_type WHERE id = ${ticketTypeId} FOR UPDATE`;
    return tx.event_ticket_type.findUnique({ where: { id: ticketTypeId } });
}

export class TicketPurchaseService {

    /** Vérifie que ce type de billet est achetable maintenant, pour cette quantité. */
    static async checkSellable(eventId: number, ticketTypeId: number, quantity: number): Promise<
        { ok: true; event: { id: number; organizer_id: number; title: string }; unitPrice: number } | Fail
    > {
        const now = new Date();
        const event = await prismaDb.event.findUnique({ where: { id: eventId } });
        if (!event || event.is_deleted) return { ok: false, code: 404, message: 'Événement introuvable' };
        if (event.status !== 'published') return { ok: false, code: 400, message: "Cet événement n'est pas en vente" };
        if (event.sales_paused) return { ok: false, code: 400, message: 'Les ventes sont suspendues pour cet événement' };
        if (hasEnded(event, now)) return { ok: false, code: 400, message: 'Cet événement est terminé' };
        if (event.registration_deadline && now > event.registration_deadline) {
            return { ok: false, code: 400, message: 'Les inscriptions sont closes pour cet événement' };
        }

        const type = await prismaDb.event_ticket_type.findUnique({ where: { id: ticketTypeId } });
        if (!type || type.event_id !== eventId) return { ok: false, code: 400, message: 'Type de billet invalide pour cet événement' };
        if (type.is_active === false) return { ok: false, code: 400, message: "Ce type de billet n'est plus en vente" };
        if (type.sale_start && now < type.sale_start) return { ok: false, code: 400, message: "La vente de ce billet n'a pas encore commencé" };
        if (type.sale_end && now > type.sale_end) return { ok: false, code: 400, message: 'La vente de ce billet est terminée' };

        const max = type.max_per_order ?? 10;
        if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, code: 400, message: 'Quantité invalide' };
        if (quantity > max) return { ok: false, code: 400, message: `Maximum ${max} billets par commande` };

        return { ok: true, event: { id: event.id, organizer_id: event.organizer_id, title: event.title }, unitPrice: type.price };
    }

    /**
     * Réserve la place et crée le billet. Pour `wallet`, débite aussi le
     * portefeuille dans la même transaction : le billet sort directement
     * payé et confirmé, ou rien n'est écrit.
     */
    static async create(params: {
        eventId: number;
        ticketTypeId: number;
        customerId: number;
        quantity: number;
        method: PurchaseMethod;
        unitPrice: number;
        commissionRate: number;
    }) {
        const total = params.unitPrice * params.quantity;
        const commissionAmount = commissionFor(total, params.commissionRate);

        for (let attempt = 0; attempt < 3; attempt++) {
            const reference = generateReference();
            try {
                const ticket = await prismaDb.$transaction(async (tx) => {
                    const type = await lockTicketType(tx, params.ticketTypeId);
                    if (!type) throw new PurchaseAbort(404, 'Type de billet introuvable');
                    const available = type.quantity - (type.sold ?? 0);
                    if (available < params.quantity) {
                        throw new PurchaseAbort(400, available > 0
                            ? `Seulement ${available} place(s) disponible(s)`
                            : 'Ce type de billet est complet');
                    }

                    if (params.method === 'wallet') {
                        const customer = await tx.customer.findFirst({
                            where: { id: params.customerId, is_deleted: false },
                            select: { wallet_balance: true },
                        });
                        if (!customer) throw new PurchaseAbort(404, 'Client introuvable');
                        const before = customer.wallet_balance ?? 0;
                        if (before < total) {
                            throw new PurchaseAbort(400, `Solde du portefeuille insuffisant (disponible: ${before}, requis: ${total})`);
                        }
                        await tx.customer.update({
                            where: { id: params.customerId },
                            data: { wallet_balance: before - total, updated_at: new Date() },
                        });
                        await tx.wallet_transaction.create({
                            data: {
                                customer_id: params.customerId,
                                amount: total,
                                transaction_type: 'payment',
                                description: `Achat ticket - ${reference}`,
                                balance_before: before,
                                balance_after: before - total,
                            } satisfies Prisma.wallet_transactionUncheckedCreateInput,
                        });
                    }

                    await tx.event_ticket_type.update({
                        where: { id: params.ticketTypeId },
                        data: { sold: { increment: params.quantity } },
                    });

                    const paidNow = params.method === 'wallet';
                    return tx.event_ticket.create({
                        data: {
                            reference,
                            event_id: params.eventId,
                            ticket_type_id: params.ticketTypeId,
                            customer_id: params.customerId,
                            quantity: params.quantity,
                            unit_price: params.unitPrice,
                            total_price: total,
                            payment_method: params.method,
                            payment_status: paidNow ? 'paid' : 'pending',
                            payment_ref: paidNow ? `wallet-${reference}` : null,
                            status: paidNow ? 'confirmed' : 'pending',
                            qr_code: uuidv4(),
                            commission_rate: params.commissionRate,
                            commission_amount: commissionAmount,
                        } as Prisma.event_ticketUncheckedCreateInput,
                    });
                });
                return { ok: true as const, ticket };
            } catch (error) {
                if (error instanceof PurchaseAbort) return { ok: false as const, code: error.code, message: error.message };
                const duplicateReference = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
                if (duplicateReference && attempt < 2) continue;
                console.error('TicketPurchaseService.create error:', error);
                return { ok: false as const, code: 500, message: "Erreur lors de l'achat" };
            }
        }
        return { ok: false as const, code: 500, message: "Erreur lors de l'achat" };
    }

    /** Annule un billet non payé et rend sa place (paiement Orange Money non initié, annulation client). */
    static async cancelUnpaid(ticketId: number): Promise<boolean> {
        return prismaDb.$transaction(async (tx) => {
            const ticket = await tx.event_ticket.findUnique({ where: { id: ticketId } });
            if (!ticket || ticket.status !== 'pending' || ticket.payment_status === 'paid') return false;
            const updated = await tx.event_ticket.updateMany({
                where: { id: ticketId, status: 'pending', payment_status: { not: 'paid' } },
                data: { status: 'cancelled' },
            });
            if (updated.count === 0) return false;
            await releaseSeatsTx(tx, ticket.ticket_type_id, ticket.quantity);
            return true;
        });
    }

    /** Fait expirer un billet Orange Money resté impayé et rend sa place. */
    static async expireUnpaid(ticketId: number): Promise<boolean> {
        return prismaDb.$transaction(async (tx) => {
            const ticket = await tx.event_ticket.findUnique({ where: { id: ticketId } });
            if (!ticket) return false;
            const updated = await tx.event_ticket.updateMany({
                where: { id: ticketId, status: 'pending', payment_status: 'pending' },
                data: { status: 'expired', payment_status: 'failed' },
            });
            if (updated.count === 0) return false;
            await releaseSeatsTx(tx, ticket.ticket_type_id, ticket.quantity);
            return true;
        });
    }

    /**
     * Paiement Orange Money confirmé par le fournisseur.
     * - billet en attente → confirmé ;
     * - billet expiré entre-temps → re-confirmé s'il reste de la place et
     *   que l'événement est toujours en vente, sinon remboursé ;
     * - billet annulé entre-temps (annulation client, événement annulé) →
     *   remboursé sur le portefeuille.
     */
    static async settleOrangeMoney(ticketId: number, paymentRef: string | undefined): Promise<
        'confirmed' | 'confirmed_late' | 'refunded_late' | 'already_paid' | 'missing'
    > {
        return prismaDb.$transaction(async (tx) => {
            const ticket = await tx.event_ticket.findUnique({ where: { id: ticketId }, include: { event: true } });
            if (!ticket) return 'missing';
            if (ticket.payment_status === 'paid' || ticket.payment_status === 'refunded') return 'already_paid';

            if (ticket.status === 'pending') {
                await tx.event_ticket.update({
                    where: { id: ticketId },
                    data: { status: 'confirmed', payment_status: 'paid', payment_ref: paymentRef },
                });
                return 'confirmed';
            }

            if (ticket.status === 'expired') {
                const type = await lockTicketType(tx, ticket.ticket_type_id);
                const available = type ? type.quantity - (type.sold ?? 0) : 0;
                const stillOnSale = ticket.event.status === 'published' && !ticket.event.is_deleted && !hasEnded(ticket.event);
                if (type && available >= ticket.quantity && stillOnSale) {
                    await tx.event_ticket_type.update({
                        where: { id: type.id },
                        data: { sold: { increment: ticket.quantity } },
                    });
                    await tx.event_ticket.update({
                        where: { id: ticketId },
                        data: { status: 'confirmed', payment_status: 'paid', payment_ref: paymentRef },
                    });
                    return 'confirmed_late';
                }
            }

            await tx.event_ticket.update({
                where: { id: ticketId },
                data: {
                    status: 'cancelled',
                    payment_status: 'refunded',
                    payment_ref: paymentRef,
                    refunded_amount: ticket.total_price,
                    refunded_at: new Date(),
                },
            });
            await creditWalletTx(tx, ticket.customer_id, ticket.total_price,
                `Remboursement billet ${ticket.reference ?? ticket.id} - paiement reçu après expiration ou annulation`);
            return 'refunded_late';
        });
    }
}

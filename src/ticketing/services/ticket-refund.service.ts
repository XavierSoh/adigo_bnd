/**
 * Remboursement d'un billet — toujours sur le portefeuille ADIGO, quel que
 * soit le moyen de paiement d'origine (Orange Money / espèces ne peuvent
 * pas être reversés automatiquement ; même règle que les annulations de
 * réservation, voir WalletRepository.recordRefund).
 *
 * Une seule transaction : passage du billet en remboursé (gardé par
 * `payment_status = 'paid'`, ce qui rend impossible un double
 * remboursement, même sur deux clics simultanés), crédit du portefeuille,
 * écriture de la ligne wallet_transaction, libération des places non
 * encore utilisées.
 */
import { Prisma } from "@prisma/client";
import prismaDb from "../../config/prismaClient";
import { PrismaTx } from "../utils/prisma-tx";

type Tx = PrismaTx;

export type RefundResult =
    | { ok: true; ticketId: number; customerId: number; amount: number; reference: string | null }
    | { ok: false; code: number; message: string };

/** Crédite le portefeuille d'un client dans une transaction existante. */
export async function creditWalletTx(tx: Tx, customerId: number, amount: number, description: string) {
    const customer = await tx.customer.findFirst({
        where: { id: customerId, is_deleted: false },
        select: { wallet_balance: true },
    });
    if (!customer) throw new Error('Customer not found');
    const before = customer.wallet_balance ?? 0;
    const after = before + amount;
    await tx.customer.update({ where: { id: customerId }, data: { wallet_balance: after, updated_at: new Date() } });
    return tx.wallet_transaction.create({
        data: {
            customer_id: customerId,
            amount,
            transaction_type: 'refund',
            description,
            balance_before: before,
            balance_after: after,
        } satisfies Prisma.wallet_transactionUncheckedCreateInput,
    });
}

/**
 * Libère des places réservées sur un type de billet (jamais en dessous de
 * 0). Une seule instruction SQL, atomique : pas de lecture-puis-écriture
 * qui écraserait une réservation faite en parallèle.
 */
export async function releaseSeatsTx(tx: Tx, ticketTypeId: number, seats: number) {
    if (seats <= 0) return;
    await tx.$executeRaw`UPDATE event_ticket_type SET sold = GREATEST(0, COALESCE(sold, 0) - ${seats}) WHERE id = ${ticketTypeId}`;
}

export class TicketRefundService {

    /**
     * `amount` : montant à rendre (défaut : totalité). 0 est accepté —
     * le billet est alors annulé sans mouvement d'argent.
     */
    static async refund(ticketId: number, opts: { amount?: number; reason: string }): Promise<RefundResult> {
        try {
            return await prismaDb.$transaction(async (tx) => {
                const ticket = await tx.event_ticket.findFirst({ where: { id: ticketId, is_deleted: false } });
                if (!ticket) return { ok: false, code: 404, message: 'Billet introuvable' } as const;
                if (ticket.payment_status !== 'paid') {
                    return { ok: false, code: 400, message: 'Seul un billet payé peut être remboursé' } as const;
                }

                const amount = opts.amount ?? ticket.total_price;
                if (!Number.isInteger(amount) || amount < 0 || amount > ticket.total_price) {
                    return { ok: false, code: 400, message: `Montant invalide (entre 0 et ${ticket.total_price})` } as const;
                }

                const claimed = await tx.event_ticket.updateMany({
                    where: { id: ticketId, payment_status: 'paid' },
                    data: {
                        payment_status: 'refunded',
                        status: 'cancelled',
                        refunded_amount: amount,
                        refunded_at: new Date(),
                    },
                });
                if (claimed.count === 0) return { ok: false, code: 409, message: 'Billet déjà remboursé' } as const;

                await releaseSeatsTx(tx, ticket.ticket_type_id, ticket.quantity - ticket.checked_in_count);
                if (amount > 0) {
                    await creditWalletTx(tx, ticket.customer_id, amount,
                        `Remboursement billet ${ticket.reference ?? ticket.id} - ${opts.reason}`);
                }

                return { ok: true, ticketId, customerId: ticket.customer_id, amount, reference: ticket.reference } as const;
            });
        } catch (error) {
            console.error('TicketRefundService.refund error:', error);
            return { ok: false, code: 500, message: 'Erreur lors du remboursement' };
        }
    }
}

// Fresh handler for the 'ticket_purchase' PaymentPurpose - NOT a
// resurrection of the one removed during the pg-promise->Prisma cleanup
// (that one was wired to the dead "rich module"'s EventTicketPurchaseRepository,
// which no live route ever produced a payment_transaction for). This one
// is wired to the live src/repository/ticketing/ticket.repository.ts /
// event_ticket table - see the ticketing payment plan for the full design.
import { registerSettlementHandler } from "../payment-settlement.registry";
import { TicketTypeRepository } from "../../../repository/ticketing/ticket-type.repository";
import { TicketRepository } from "../../../repository/ticketing/ticket.repository";
import prismaDb from "../../../config/prismaClient";
import { sendEmail } from "../../email.service";
import { ticketPurchaseConfirmedEmail } from "../../../emails/templates";
import { Language } from "../../../utils/i18n";

registerSettlementHandler('ticket_purchase', async (transaction) => {
    if (!transaction.purpose_ref_id) {
        console.error(`⚠️ ticket settlement: no purpose_ref_id on transaction ${transaction.id}`);
        return;
    }
    const reference = transaction.provider_txn_id || transaction.pay_token || undefined;

    const updateResult = await prismaDb.event_ticket.updateMany({
        where: { id: transaction.purpose_ref_id, status: 'pending' },
        data: { status: 'confirmed', payment_status: 'paid', payment_ref: reference },
    });
    if (updateResult.count === 0) {
        console.error(`⚠️ ticket settlement: ticket ${transaction.purpose_ref_id} not found or not pending`);
        return;
    }

    const ticket = await prismaDb.event_ticket.findUnique({ where: { id: transaction.purpose_ref_id } });
    if (!ticket) return;

    await TicketTypeRepository.incrementSold(ticket.ticket_type_id, ticket.quantity);

    const forEmail = await TicketRepository.findForEmail(ticket.id);
    if (forEmail?.customer?.email) {
        const lang = (forEmail.customer.preferred_language as Language) || 'fr';
        const { subject, html, text } = ticketPurchaseConfirmedEmail(lang, {
            firstName: forEmail.customer.first_name,
            eventTitle: forEmail.event.title,
            quantity: forEmail.quantity,
            totalPrice: forEmail.total_price,
            reference: forEmail.reference || String(forEmail.id),
        });
        sendEmail({ to: forEmail.customer.email, subject, html, text }).catch(() => { /* logged in email.service */ });
    }
});

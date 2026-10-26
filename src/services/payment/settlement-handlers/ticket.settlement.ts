// Handler for the 'ticket_purchase' PaymentPurpose, wired to the live
// src/repository/ticketing/ticket.repository.ts / event_ticket table.
//
// The seat was already reserved when the ticket was created
// (TicketPurchaseService.create increments event_ticket_type.sold for every
// payment method), so confirming payment must NOT increment it again. A
// payment that lands after the ticket expired or was cancelled is either
// re-confirmed (seat still free, event still on sale) or refunded to the
// wallet — the customer's money is never kept without a ticket.
import { registerSettlementHandler } from "../payment-settlement.registry";
import { TicketPurchaseService } from "../../../ticketing/services/ticket-purchase.service";
import { TicketingNotifier } from "../../../ticketing/services/ticketing-notifier.service";

registerSettlementHandler('ticket_purchase', async (transaction) => {
    if (!transaction.purpose_ref_id) {
        console.error(`⚠️ ticket settlement: no purpose_ref_id on transaction ${transaction.id}`);
        return;
    }
    const ticketId = transaction.purpose_ref_id;
    const reference = transaction.provider_txn_id || transaction.pay_token || undefined;

    const outcome = await TicketPurchaseService.settleOrangeMoney(ticketId, reference);
    switch (outcome) {
        case 'confirmed':
        case 'confirmed_late':
            void TicketingNotifier.purchaseConfirmed(ticketId);
            break;
        case 'refunded_late':
            void TicketingNotifier.ticketRefunded(ticketId, transaction.amount,
                'Paiement reçu après expiration ou annulation du billet');
            break;
        case 'missing':
            console.error(`⚠️ ticket settlement: ticket ${ticketId} not found`);
            break;
        case 'already_paid':
            break;
    }
});

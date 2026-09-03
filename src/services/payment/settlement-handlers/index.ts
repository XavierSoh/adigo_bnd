// Imported once (for side effects) from app.ts so every module's Orange
// Money settlement handler is registered before any request can arrive.
//
// The 'ticket_purchase' handler that used to be registered here
// (../../../ticketing/services/ticket-purchase-settlement) was removed
// during the pg-promise→Prisma cleanup: it depended on
// EventTicketPurchaseRepository from the ticketing "rich module", whose
// only producer (EventTicketPurchaseController.purchase(), on the
// unmounted rich-module router) has been dead code with zero live routes
// since before this session — confirmed via a repo-wide grep that no live
// code path ever creates a payment_transaction with
// purpose='ticket_purchase', so the handler could never actually fire.
// See BOOKING_MODULE_NOTES.md.
import "./wallet.settlement";
import "./booking.settlement";

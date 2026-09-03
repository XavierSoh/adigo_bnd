// Imported once (for side effects) from app.ts so every module's Orange
// Money settlement handler is registered before any request can arrive.
//
// A 'ticket_purchase' handler existed here before, wired to the dead
// ticketing "rich module" (EventTicketPurchaseRepository) whose only
// producer had zero live routes — removed during the pg-promise→Prisma
// cleanup (see BOOKING_MODULE_NOTES.md). ticket.settlement.ts below is a
// fresh handler wired to the live src/repository/ticketing/ticket.repository.ts,
// added when real wallet/Orange Money payment processing was built for
// ticket purchases (see the ticketing payment plan).
import "./wallet.settlement";
import "./booking.settlement";
import "./ticket.settlement";

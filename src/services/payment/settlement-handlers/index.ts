// Imported once (for side effects) from app.ts so every module's Orange
// Money settlement handler is registered before any request can arrive.
import "./wallet.settlement";
import "./booking.settlement";
import "../../../ticketing/services/ticket-purchase-settlement";

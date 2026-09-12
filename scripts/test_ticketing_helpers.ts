/**
 * Test-only helpers for the Flutter ticketing test suite
 * (adigo_mobile/test/features/ticketing/ticketing_flow_test.dart). Not
 * part of the app; never invoked outside that test file. Same rationale
 * as test_booking_helpers.ts — deterministic DB state with no app-level
 * API to set it up.
 *
 * Usage: npx ts-node scripts/test_ticketing_helpers.ts <action> [args...]
 *
 * Actions:
 *   topup_wallet --email <email> --amount <int>
 *   wallet_balance --email <email>
 *     Same as test_booking_helpers.ts (booking and ticketing share
 *     customer.wallet_balance) — duplicated here rather than imported so
 *     this script has no cross-dependency on the booking test helper.
 *
 *   find_purchasable_ticket_type
 *     Finds a published event's ticket_type with quantity > sold. Prints
 *     JSON: {"eventId":N,"ticketTypeId":N,"price":N,"availableBefore":N}.
 *     Exits 1 if none found.
 *
 *   ticket_status --id <ticketId>
 *     Prints JSON {"status":"...","totalPrice":N,"paymentStatus":"..."}
 *     for one event_ticket, or "null" if not found.
 *
 *   ticket_type_sold --id <ticketTypeId>
 *     Prints the current `sold` count for one event_ticket_type.
 */
import prismaDb from "../src/config/prismaClient";

function argVal(args: string[], name: string): string | undefined {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 ? args[idx + 1] : undefined;
}

async function topupWallet(args: string[]) {
    const email = argVal(args, 'email');
    const amountStr = argVal(args, 'amount');
    if (!email || !amountStr) {
        console.error('Usage: topup_wallet --email <email> --amount <int>');
        process.exit(1);
    }
    const customer = await prismaDb.customer.findFirst({ where: { email: email! } });
    if (!customer) {
        console.error(`No customer with email ${email}`);
        process.exit(1);
    }
    const updated = await prismaDb.customer.update({
        where: { id: customer.id },
        data: { wallet_balance: parseInt(amountStr!, 10) },
        select: { wallet_balance: true },
    });
    console.log(String(updated.wallet_balance));
}

async function walletBalance(args: string[]) {
    const email = argVal(args, 'email');
    if (!email) {
        console.error('Usage: wallet_balance --email <email>');
        process.exit(1);
    }
    const customer = await prismaDb.customer.findFirst({
        where: { email: email! },
        select: { wallet_balance: true },
    });
    console.log(customer ? String(customer.wallet_balance ?? 0) : 'null');
}

async function findPurchasableTicketType() {
    const types = await prismaDb.event_ticket_type.findMany({
        where: { event: { status: 'published', is_deleted: false } },
        select: { id: true, event_id: true, price: true, quantity: true, sold: true },
        orderBy: { id: 'desc' },
    });

    for (const t of types) {
        const available = t.quantity - (t.sold ?? 0);
        if (available > 0) {
            console.log(JSON.stringify({
                eventId: t.event_id,
                ticketTypeId: t.id,
                price: t.price,
                availableBefore: available,
            }));
            return;
        }
    }

    console.error('No event_ticket_type with remaining availability — seed more ticketing data first.');
    process.exit(1);
}

async function ticketStatus(args: string[]) {
    const idStr = argVal(args, 'id');
    if (!idStr) {
        console.error('Usage: ticket_status --id <ticketId>');
        process.exit(1);
    }
    const ticket = await prismaDb.event_ticket.findUnique({
        where: { id: parseInt(idStr!, 10) },
        select: { status: true, total_price: true, payment_status: true },
    });
    console.log(ticket
        ? JSON.stringify({ status: ticket.status, totalPrice: ticket.total_price, paymentStatus: ticket.payment_status })
        : 'null');
}

async function ticketTypeSold(args: string[]) {
    const idStr = argVal(args, 'id');
    if (!idStr) {
        console.error('Usage: ticket_type_sold --id <ticketTypeId>');
        process.exit(1);
    }
    const type = await prismaDb.event_ticket_type.findUnique({
        where: { id: parseInt(idStr!, 10) },
        select: { sold: true },
    });
    console.log(type ? String(type.sold ?? 0) : 'null');
}

async function main() {
    const [action, ...args] = process.argv.slice(2);
    switch (action) {
        case 'topup_wallet': return topupWallet(args);
        case 'wallet_balance': return walletBalance(args);
        case 'find_purchasable_ticket_type': return findPurchasableTicketType();
        case 'ticket_status': return ticketStatus(args);
        case 'ticket_type_sold': return ticketTypeSold(args);
        default:
            console.error(`Unknown action: ${action}`);
            process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

/**
 * Test-only helpers for the Flutter booking test suite
 * (adigo_mobile/test/features/booking/booking_flow_test.dart). Not part of
 * the app; never invoked outside that test file. Same rationale as
 * test_get_customer_secret.ts: the test needs deterministic DB state
 * (a funded wallet, a real bookable trip+seats) that there's no app-level
 * API for, so it goes straight to Prisma.
 *
 * Usage: npx ts-node scripts/test_booking_helpers.ts <action> [args...]
 *
 * Actions:
 *   topup_wallet --email <email> --amount <int>
 *     Sets customer.wallet_balance to <amount> (not additive - a fixed
 *     known value each call, for deterministic "insufficient balance"
 *     tests). Prints the new balance.
 *
 *   wallet_balance --email <email>
 *     Prints the customer's current wallet_balance.
 *
 *   find_bookable_trip --seats <n>
 *     Finds a generated_trip (status='scheduled', departure >2h from now
 *     so modify's "2h before departure" rule doesn't reject it) with at
 *     least <n> generated_trip_seat rows that have no active
 *     (confirmed/pending, non-deleted) booking. Prints JSON:
 *     {"generatedTripId":N,"price":N,"seatIds":[N,...]}. Exits 1 with a
 *     clear message if none found (the seeded DB doesn't guarantee this).
 *
 *   booking_status --id <bookingId>
 *     Prints JSON {"status":"...","totalPrice":N,"groupId":"..."|null}
 *     for one booking, or "null" if not found.
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
    const amount = parseInt(amountStr, 10);
    const customer = await prismaDb.customer.findFirst({ where: { email } });
    if (!customer) {
        console.error(`No customer with email ${email}`);
        process.exit(1);
    }
    const updated = await prismaDb.customer.update({
        where: { id: customer.id },
        data: { wallet_balance: amount },
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
        where: { email },
        select: { wallet_balance: true },
    });
    console.log(customer ? String(customer.wallet_balance ?? 0) : 'null');
}

async function findBookableTrip(args: string[]) {
    const seatsNeededStr = argVal(args, 'seats') ?? '1';
    const seatsNeeded = parseInt(seatsNeededStr, 10);

    const trips = await prismaDb.generated_trip.findMany({
        where: {
            status: 'scheduled',
            actual_departure_time: { gt: new Date(Date.now() + 3 * 60 * 60 * 1000) }, // >3h out
        },
        select: { id: true, trip: { select: { price: true } } },
        orderBy: { id: 'desc' },
        take: 50,
    });

    for (const trip of trips) {
        if (trip.trip.price == null) continue;

        const seats = await prismaDb.generated_trip_seat.findMany({
            where: { generated_trip_id: trip.id },
            select: { id: true },
        });
        if (seats.length < seatsNeeded) continue;

        const activeBookings = await prismaDb.booking.findMany({
            where: {
                generated_trip_id: trip.id,
                status: { in: ['confirmed', 'pending'] },
                is_deleted: false,
            },
            select: { generated_trip_seat_id: true },
        });
        const takenSeatIds = new Set(activeBookings.map((b) => b.generated_trip_seat_id));
        const availableSeatIds = seats.map((s) => s.id).filter((id) => !takenSeatIds.has(id));

        if (availableSeatIds.length >= seatsNeeded) {
            console.log(JSON.stringify({
                generatedTripId: trip.id,
                price: trip.trip.price,
                seatIds: availableSeatIds.slice(0, seatsNeeded),
            }));
            return;
        }
    }

    console.error('No generated_trip found with enough available seats — seed more trip data first.');
    process.exit(1);
}

async function bookingStatus(args: string[]) {
    const idStr = argVal(args, 'id');
    if (!idStr) {
        console.error('Usage: booking_status --id <bookingId>');
        process.exit(1);
    }
    const booking = await prismaDb.booking.findUnique({
        where: { id: parseInt(idStr, 10) },
        select: { status: true, total_price: true, group_id: true },
    });
    console.log(booking
        ? JSON.stringify({ status: booking.status, totalPrice: booking.total_price, groupId: booking.group_id })
        : 'null');
}

async function main() {
    const [action, ...args] = process.argv.slice(2);
    switch (action) {
        case 'topup_wallet': return topupWallet(args);
        case 'wallet_balance': return walletBalance(args);
        case 'find_bookable_trip': return findBookableTrip(args);
        case 'booking_status': return bookingStatus(args);
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

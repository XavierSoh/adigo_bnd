/**
 * Test-only helpers for the Flutter VTC test suite
 * (adigo_mobile/test/features/vtc/vtc_flow_test.dart). Not part of the app;
 * never invoked outside that test file. Same rationale as
 * test_booking_helpers.ts / test_ticketing_helpers.ts: the test needs
 * deterministic DB state (a funded wallet, a real admin account, a real
 * driver) that there's no app-level API for, so it goes straight to Prisma.
 *
 * Usage: npx ts-node scripts/test_vtc_helpers.ts <action> [args...]
 *
 * Actions:
 *   topup_wallet --email <email> --amount <int>
 *   wallet_balance --email <email>
 *     Same as test_booking_helpers.ts (duplicated on purpose, no
 *     cross-script dependency).
 *
 *   ensure_admin --login <login> --password <password>
 *     Upserts a `users` row (role='admin', account_status='enabled') with
 *     the given login/password so the test can log in via
 *     POST /v1/api/users/login and get a real admin JWT for the
 *     admin-only VTC routes (assign driver, list all rides, driver CRUD).
 *
 *   ensure_driver --phone <phone> --license <licenseNumber> --plate <plate>
 *     Upserts a `vtc_drivers` row (status='online', a fixed lat/lon near
 *     Douala so drivers/nearby can find it) keyed by license_number.
 *     Prints JSON {"id":N}.
 *
 *   ride_status --id <rideId>
 *     Prints JSON {"status":"...","paymentStatus":"...","driverId":N|null,
 *     "totalFare":N} for one ride, or "null" if not found.
 *
 *   driver_status --id <driverId>
 *     Prints the vtc_drivers.status column for one driver, or "null".
 *
 *   set_driver_document --id <driverId>
 *     Writes a tiny real file under uploads-private/vtc-drivers/ (the
 *     directory GET /vtc/drivers/:id/registration-document actually reads
 *     from — see vtc.router.ts's driverDocumentsUpload) and points this
 *     driver's registration_document column at it, without needing a real
 *     multipart upload through the test suite (nothing about the ownership
 *     check being tested cares how the file got there). Prints the
 *     relative path written.
 *
 *   driver_cancellations_count --id <driverId>
 *     Prints vtc_drivers.cancellations_count for one driver, or "null".
 *
 *   backdate_ride_accepted_at --id <rideId> --minutesAgo <n>
 *     Sets vtc_rides.accepted_at to `n` minutes in the past, so a test can
 *     exercise the late-cancellation-fee grace period (see
 *     RideService.cancelRideWithRefund) without a real 2-minute wait.
 *     Prints the ISO timestamp written.
 *
 *   set_ride_pickup_time --id <rideId> --minutesFromNow <n>
 *     Sets vtc_rides.pickup_time to `n` minutes from now, so a test can make
 *     a 'scheduled' ride "due" (or not) for promoteDueScheduledRides without
 *     a real wait. Prints the ISO timestamp written.
 *
 *   set_driver_status --id <driverId> --status <status>
 *     Direct write, bypassing DriverService.updateDriverStatus's
 *     verification gate — test-fixture setup, not the thing under test.
 *
 *   commission_for_ride --rideId <rideId>
 *     Prints the vtc_commission_ledger row for one ride (id, grossFare,
 *     commissionRate, commissionAmount, status, settledBy), or "null" if
 *     none exists yet — see CommissionService.recordForCompletedRide.
 *
 *   force_run_scheduler_tick
 *     Promotes every due 'scheduled' ride to 'requested' right now, instead
 *     of waiting for VtcRideExpiryService's real per-minute cron — see
 *     RideService.promoteDueScheduledRides. Prints how many rows changed.
 */

// Must run before anything else — same fix and reasoning as src/index.ts's
// own `process.env.TZ = "UTC"` (see that file's doc comment): Prisma
// interprets `timestamp without time zone` columns using the OS/process
// local timezone, not UTC. This script is a separate entrypoint (never
// routed through index.ts), so it never inherited that fix — invisible for
// every other action here (none write a timestamp compared with sub-hour
// precision), but backdateRideAcceptedAt below computes exactly such a
// value: without this line, on a UTC+1 dev machine, the timestamp it writes
// gets shifted an hour into the future once the main server (which does
// have the fix) reads it back, silently breaking the late-cancellation-fee
// grace-period check it exists to test. Found live 2026-09-14 writing that
// test.
process.env.TZ = "UTC";

import fs from "fs";
import bcrypt from "bcrypt";
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

async function ensureAdmin(args: string[]) {
    const login = argVal(args, 'login');
    const password = argVal(args, 'password');
    if (!login || !password) {
        console.error('Usage: ensure_admin --login <login> --password <password>');
        process.exit(1);
    }
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT || '10', 10));
    const existing = await prismaDb.users.findFirst({ where: { login } });
    if (existing) {
        await prismaDb.users.update({
            where: { id: existing.id },
            data: { password: hashedPassword, role: 'admin', account_status: 'enabled', is_deleted: false },
        });
    } else {
        await prismaDb.users.create({
            data: {
                login,
                password: hashedPassword,
                role: 'admin',
                account_status: 'enabled',
                creation_date: new Date(),
            },
        });
    }
    console.log('ok');
}

async function ensureDriver(args: string[]) {
    const phone = argVal(args, 'phone');
    const license = argVal(args, 'license');
    const plate = argVal(args, 'plate');
    if (!phone || !license || !plate) {
        console.error('Usage: ensure_driver --phone <phone> --license <licenseNumber> --plate <plate>');
        process.exit(1);
    }
    const existing = await prismaDb.vtc_drivers.findUnique({ where: { license_number: license } });
    const data = {
        first_name: 'Test',
        last_name: 'Driver',
        phone,
        license_number: license,
        license_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        vehicle_type: 'economy',
        vehicle_brand: 'Toyota',
        vehicle_model: 'Corolla',
        license_plate: plate,
        status: 'online',
        current_latitude: 4.0511,
        current_longitude: 9.7679,
        seats: 4,
    };
    const driver = existing
        ? await prismaDb.vtc_drivers.update({ where: { id: existing.id }, data })
        : await prismaDb.vtc_drivers.create({ data });
    console.log(JSON.stringify({ id: driver.id }));
}

async function rideStatus(args: string[]) {
    const idStr = argVal(args, 'id');
    if (!idStr) {
        console.error('Usage: ride_status --id <rideId>');
        process.exit(1);
    }
    const ride = await prismaDb.vtc_rides.findUnique({
        where: { id: parseInt(idStr, 10) },
        select: {
            status: true, payment_status: true, driver_id: true, total_fare: true,
            accepted_at: true, cancellation_fee: true, cancellation_fee_status: true,
            cancelled_by: true,
        },
    });
    console.log(ride
        ? JSON.stringify({
            status: ride.status, paymentStatus: ride.payment_status, driverId: ride.driver_id,
            totalFare: ride.total_fare, acceptedAt: ride.accepted_at, cancellationFee: ride.cancellation_fee,
            cancellationFeeStatus: ride.cancellation_fee_status, cancelledBy: ride.cancelled_by,
        })
        : 'null');
}

async function driverStatus(args: string[]) {
    const idStr = argVal(args, 'id');
    if (!idStr) {
        console.error('Usage: driver_status --id <driverId>');
        process.exit(1);
    }
    const driver = await prismaDb.vtc_drivers.findUnique({
        where: { id: parseInt(idStr, 10) },
        select: { status: true },
    });
    console.log(driver ? driver.status : 'null');
}

async function driverCancellationsCount(args: string[]) {
    const idStr = argVal(args, 'id');
    if (!idStr) {
        console.error('Usage: driver_cancellations_count --id <driverId>');
        process.exit(1);
    }
    const driver = await prismaDb.vtc_drivers.findUnique({
        where: { id: parseInt(idStr, 10) },
        select: { cancellations_count: true },
    });
    console.log(driver ? String(driver.cancellations_count ?? 0) : 'null');
}

// Backdates a ride's `accepted_at` so a test can exercise the
// late-cancellation-fee grace period (RideService.cancelRideWithRefund)
// without actually waiting 2 real minutes between accepting and cancelling.
async function backdateRideAcceptedAt(args: string[]) {
    const idStr = argVal(args, 'id');
    const minutesAgoStr = argVal(args, 'minutesAgo');
    if (!idStr || !minutesAgoStr) {
        console.error('Usage: backdate_ride_accepted_at --id <rideId> --minutesAgo <n>');
        process.exit(1);
    }
    const acceptedAt = new Date(Date.now() - parseInt(minutesAgoStr, 10) * 60 * 1000);
    await prismaDb.vtc_rides.update({
        where: { id: parseInt(idStr, 10) },
        data: { accepted_at: acceptedAt },
    });
    console.log(acceptedAt.toISOString());
}

// Directly mirrors RideService.promoteDueScheduledRides's own selection
// query (same status + pickup_time-horizon condition) without going through
// the real service method — that method also broadcasts over Socket.IO
// (SocketService.broadcastNewRideRequested), which has no initialized `io`
// server in this standalone script and would throw. What a test actually
// needs asserted is the status transition itself, not the live-broadcast
// side effect (out of scope for this HTTP-level test suite — covered
// separately by unit tests where relevant, same as other notification
// wiring). Prints how many rides were promoted.
// Moves a 'scheduled' ride's pickup_time so a test can make it "due" (or
// not) for promoteDueScheduledRides without a real wait between creating it
// (≥30 min in the future, enforced only at creation time — see
// RideController.createRide) and the moment it should actually be picked
// up (within RideService.SCHEDULED_RIDE_LEAD_MINUTES, 15 min by default).
async function setRidePickupTime(args: string[]) {
    const idStr = argVal(args, 'id');
    const minutesFromNowStr = argVal(args, 'minutesFromNow');
    if (!idStr || !minutesFromNowStr) {
        console.error('Usage: set_ride_pickup_time --id <rideId> --minutesFromNow <n>');
        process.exit(1);
    }
    const pickupTime = new Date(Date.now() + parseInt(minutesFromNowStr, 10) * 60 * 1000);
    await prismaDb.vtc_rides.update({
        where: { id: parseInt(idStr, 10) },
        data: { pickup_time: pickupTime },
    });
    console.log(pickupTime.toISOString());
}

// Reads the commission_service.recordForCompletedRide-produced ledger row
// for one ride (there's at most one, ride_id is unique — see
// migrate_vtc_commission.ts), or "null" if none exists yet.
// Direct Prisma write, bypassing DriverService.updateDriverStatus's
// verification gate entirely — same rationale as ensureDriver already
// setting `status: 'online'` straight at creation: this is test fixture
// setup (getting a driver into a known operational state), not the thing
// actually under test.
async function setDriverStatus(args: string[]) {
    const idStr = argVal(args, 'id');
    const status = argVal(args, 'status');
    if (!idStr || !status) {
        console.error('Usage: set_driver_status --id <driverId> --status <status>');
        process.exit(1);
    }
    await prismaDb.vtc_drivers.update({ where: { id: parseInt(idStr, 10) }, data: { status } });
    console.log('ok');
}

async function commissionForRide(args: string[]) {
    const rideIdStr = argVal(args, 'rideId');
    if (!rideIdStr) {
        console.error('Usage: commission_for_ride --rideId <rideId>');
        process.exit(1);
    }
    const row = await prismaDb.vtc_commission_ledger.findUnique({
        where: { ride_id: parseInt(rideIdStr, 10) },
    });
    console.log(row
        ? JSON.stringify({
            id: row.id, grossFare: row.gross_fare, commissionRate: row.commission_rate,
            commissionAmount: row.commission_amount, status: row.status, settledBy: row.settled_by,
        })
        : 'null');
}

async function forceRunSchedulerTick() {
    const horizon = new Date(Date.now() + 15 * 60 * 1000);
    const result = await prismaDb.vtc_rides.updateMany({
        where: { status: 'scheduled', pickup_time: { lte: horizon } },
        data: { status: 'requested' },
    });
    console.log(String(result.count));
}

async function setDriverDocument(args: string[]) {
    const idStr = argVal(args, 'id');
    if (!idStr) {
        console.error('Usage: set_driver_document --id <driverId>');
        process.exit(1);
    }
    const driverId = parseInt(idStr, 10);
    const dir = 'uploads-private/vtc-drivers';
    fs.mkdirSync(dir, { recursive: true });
    const relativePath = `${dir}/registrationDocument-test-${driverId}-${Date.now()}.txt`;
    fs.writeFileSync(relativePath, 'fake carte grise for test purposes');
    await prismaDb.vtc_drivers.update({
        where: { id: driverId },
        data: { registration_document: relativePath },
    });
    console.log(relativePath);
}

async function main() {
    const [action, ...args] = process.argv.slice(2);
    switch (action) {
        case 'topup_wallet': return topupWallet(args);
        case 'wallet_balance': return walletBalance(args);
        case 'ensure_admin': return ensureAdmin(args);
        case 'ensure_driver': return ensureDriver(args);
        case 'ride_status': return rideStatus(args);
        case 'driver_status': return driverStatus(args);
        case 'driver_cancellations_count': return driverCancellationsCount(args);
        case 'backdate_ride_accepted_at': return backdateRideAcceptedAt(args);
        case 'set_ride_pickup_time': return setRidePickupTime(args);
        case 'set_driver_status': return setDriverStatus(args);
        case 'commission_for_ride': return commissionForRide(args);
        case 'force_run_scheduler_tick': return forceRunSchedulerTick();
        case 'set_driver_document': return setDriverDocument(args);
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

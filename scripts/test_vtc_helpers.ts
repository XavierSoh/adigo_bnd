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
 */
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
        select: { status: true, payment_status: true, driver_id: true, total_fare: true },
    });
    console.log(ride
        ? JSON.stringify({ status: ride.status, paymentStatus: ride.payment_status, driverId: ride.driver_id, totalFare: ride.total_fare })
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

async function main() {
    const [action, ...args] = process.argv.slice(2);
    switch (action) {
        case 'topup_wallet': return topupWallet(args);
        case 'wallet_balance': return walletBalance(args);
        case 'ensure_admin': return ensureAdmin(args);
        case 'ensure_driver': return ensureDriver(args);
        case 'ride_status': return rideStatus(args);
        case 'driver_status': return driverStatus(args);
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

// Cleanup script for the mobile-integration-testing seed. Run with
// `npm run seed:clean`.
//
// No `is_test` column exists anywhere in the schema (adding one would need a
// real migration for a throwaway test utility), so "test data" is identified
// by the exact static identifiers in seed-data.ts (agency names, staff/
// customer emails, bus registration numbers) rather than a flag — this
// touches only rows this seed itself could have created, never unrelated
// real data.
//
// Deletion order follows the FK graph (children before parents):
//   booking (booking_passenger cascades automatically, see schema.prisma)
//   -> generated_trip_seat -> generated_trip -> seat -> trip -> bus
//   -> staff -> users -> agency -> wallet_transaction/wallet -> customer
// This extends the spec's own order (bookings -> generated_trip_seats ->
// generated_trips -> trips -> staff -> agencies -> customers) with the
// bus/seat/users/wallet_transaction rows the seed (or a booking test run
// against it) also creates, in the positions the real FKs require.
// `contract_type` is left in place (shared/reusable, harmless).
import prismaDb from '../../src/config/prismaClient';
import { AGENCIES, TEST_CUSTOMERS } from './seed-data';

async function main() {
    console.log('🧹 Démarrage du nettoyage des données de test...\n');

    const agencyNames = AGENCIES.map((a) => a.name);
    const staffEmails = AGENCIES.map((a) => a.staffEmail);
    const busRegistrationNumbers = AGENCIES.map((a) => a.busRegistrationNumber);
    const customerEmails = TEST_CUSTOMERS.map((c) => c.email);

    const agencies = await prismaDb.agency.findMany({ where: { name: { in: agencyNames } }, select: { id: true } });
    const agencyIds = agencies.map((a) => a.id);

    const buses = await prismaDb.bus.findMany({ where: { registration_number: { in: busRegistrationNumbers } }, select: { id: true } });
    const busIds = buses.map((b) => b.id);

    const trips = await prismaDb.trip.findMany({ where: { agency_id: { in: agencyIds } }, select: { id: true } });
    const tripIds = trips.map((t) => t.id);

    const generatedTrips = await prismaDb.generated_trip.findMany({ where: { trip_id: { in: tripIds } }, select: { id: true } });
    const generatedTripIds = generatedTrips.map((gt) => gt.id);

    const customers = await prismaDb.customer.findMany({ where: { email: { in: customerEmails } }, select: { id: true } });
    const customerIds = customers.map((c) => c.id);

    const staffRows = await prismaDb.staff.findMany({ where: { email: { in: staffEmails } }, select: { id: true } });
    const staffIds = staffRows.map((s) => s.id);

    // bookings created during a mobile test run against this seed data
    // (by a seeded customer, or on a seeded voyage)
    const deletedBookings = await prismaDb.booking.deleteMany({
        where: { OR: [{ customer_id: { in: customerIds } }, { generated_trip: { trip_id: { in: tripIds } } }] },
    });
    console.log(`✅ ${deletedBookings.count} bookings supprimés (booking_passenger associés supprimés en cascade)`);

    const deletedSeats = await prismaDb.generated_trip_seat.deleteMany({ where: { generated_trip_id: { in: generatedTripIds } } });
    console.log(`✅ ${deletedSeats.count} generated_trip_seats supprimés`);

    const deletedGeneratedTrips = await prismaDb.generated_trip.deleteMany({ where: { id: { in: generatedTripIds } } });
    console.log(`✅ ${deletedGeneratedTrips.count} generated_trips supprimés`);

    const deletedRealSeats = await prismaDb.seat.deleteMany({ where: { bus_id: { in: busIds } } });
    console.log(`✅ ${deletedRealSeats.count} sièges (seat) supprimés`);

    const deletedTrips = await prismaDb.trip.deleteMany({ where: { id: { in: tripIds } } });
    console.log(`✅ ${deletedTrips.count} trips supprimés`);

    const deletedBuses = await prismaDb.bus.deleteMany({ where: { id: { in: busIds } } });
    console.log(`✅ ${deletedBuses.count} bus supprimés`);

    const deletedStaff = await prismaDb.staff.deleteMany({ where: { id: { in: staffIds } } });
    console.log(`✅ ${deletedStaff.count} fiches staff supprimées`);

    const deletedUsers = await prismaDb.users.deleteMany({ where: { login: { in: staffEmails } } });
    console.log(`✅ ${deletedUsers.count} comptes staff admin (users) supprimés`);

    const deletedAgencies = await prismaDb.agency.deleteMany({ where: { id: { in: agencyIds } } });
    console.log(`✅ ${deletedAgencies.count} agences supprimées`);

    // wallet_transaction.customer is onDelete: NoAction — any booking
    // create/cancel test run leaves rows here, which blocks deleting the
    // customer below if not cleared first (found live: P2003 on the very
    // first real cancellation test). `wallet` itself cascades, but is
    // deleted explicitly too for clarity.
    const deletedWalletTx = await prismaDb.wallet_transaction.deleteMany({ where: { customer_id: { in: customerIds } } });
    console.log(`✅ ${deletedWalletTx.count} wallet_transactions supprimées`);
    await prismaDb.wallet.deleteMany({ where: { customer_id: { in: customerIds } } });

    const deletedCustomers = await prismaDb.customer.deleteMany({ where: { id: { in: customerIds } } });
    console.log(`✅ ${deletedCustomers.count} comptes clients de test supprimés`);

    console.log('\n✅ Nettoyage terminé — base débarrassée des données de test.');
}

main()
    .catch((error) => {
        console.error('❌ Erreur pendant le nettoyage :', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prismaDb.$disconnect();
    });

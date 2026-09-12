// One-off fixture for live booking tests: a real, bookable voyage priced at
// 100 FCFA (matching the 100 XAF amount already used for Orange Money live
// tests), reusing the "Transcam Express" bus/seats the mobile test seed
// (prisma/seeds/seed.ts) already created. Run with:
//   npx ts-node scripts/create-test-trip-100.ts
//
// Idempotent: re-running finds the same trip (unique on agency+cities) and
// generated_trip (unique on trip_id+actual_departure_time) instead of
// duplicating them.
import prismaDb from '../src/config/prismaClient';

const TEST_DEPARTURE_CITY = 'Test Départ';
const TEST_ARRIVAL_CITY = 'Test Arrivée';
const TEST_PRICE = 100;

async function main() {
    const agency = await prismaDb.agency.findFirst({ where: { name: 'Transcam Express' } });
    if (!agency) {
        throw new Error('Agence "Transcam Express" introuvable — lance `npm run seed` d\'abord.');
    }

    const bus = await prismaDb.bus.findFirst({ where: { agency_id: agency.id } });
    if (!bus) {
        throw new Error('Aucun bus trouvé pour "Transcam Express" — lance `npm run seed` d\'abord.');
    }

    const seats = await prismaDb.seat.findMany({
        where: { bus_id: bus.id },
        orderBy: { seat_number: 'asc' },
    });
    if (seats.length === 0) {
        throw new Error('Aucun siège trouvé pour ce bus — lance `npm run seed` d\'abord.');
    }

    let trip = await prismaDb.trip.findFirst({
        where: { agency_id: agency.id, departure_city: TEST_DEPARTURE_CITY, arrival_city: TEST_ARRIVAL_CITY },
    });
    if (!trip) {
        const now = new Date();
        const departure = new Date(now.getTime() + 2 * 60 * 60 * 1000); // dans 2h
        const arrival = new Date(departure.getTime() + 60 * 60 * 1000); // +1h de trajet

        trip = await prismaDb.trip.create({
            data: {
                departure_city: TEST_DEPARTURE_CITY,
                arrival_city: TEST_ARRIVAL_CITY,
                departure_time: departure,
                arrival_time: arrival,
                price: TEST_PRICE,
                bus_id: bus.id,
                agency_id: agency.id,
                valid_from: now,
                is_active: true,
            },
        });
        console.log(`✅ Trip créé (id: ${trip.id}) — ${TEST_DEPARTURE_CITY} → ${TEST_ARRIVAL_CITY}, ${TEST_PRICE} FCFA`);
    } else {
        console.log(`↪️  Trip déjà existant (id: ${trip.id}), réutilisé`);
    }

    const now = new Date();
    const departure = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const arrival = new Date(departure.getTime() + 60 * 60 * 1000);

    let generatedTrip = await prismaDb.generated_trip.findFirst({
        where: { trip_id: trip.id, actual_departure_time: departure },
    });
    if (!generatedTrip) {
        generatedTrip = await prismaDb.generated_trip.create({
            data: {
                trip_id: trip.id,
                original_departure_time: departure,
                actual_departure_time: departure,
                actual_arrival_time: arrival,
                available_seats: seats.length,
                status: 'scheduled',
                bus_id: bus.id,
            },
        });
        console.log(`✅ Voyage généré (generated_trip id: ${generatedTrip.id}) — départ ${departure.toISOString()}`);
    } else {
        console.log(`↪️  Voyage généré déjà existant (id: ${generatedTrip.id}), réutilisé`);
    }

    await prismaDb.generated_trip_seat.createMany({
        data: seats.map((s) => ({ generated_trip_id: generatedTrip!.id, seat_id: s.id, status: 'available' })),
        skipDuplicates: true,
    });
    const seatCount = await prismaDb.generated_trip_seat.count({ where: { generated_trip_id: generatedTrip.id } });
    console.log(`✅ ${seatCount} sièges disponibles sur ce voyage`);

    console.log('\n--- Résumé ---');
    console.log(`Trajet         : ${TEST_DEPARTURE_CITY} → ${TEST_ARRIVAL_CITY}`);
    console.log(`Prix           : ${TEST_PRICE} FCFA / siège`);
    console.log(`Départ         : ${departure.toLocaleString('fr-FR')}`);
    console.log(`generated_trip : ${generatedTrip.id}`);
}

main()
    .catch((e) => {
        console.error('❌ Erreur:', e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prismaDb.$disconnect();
    });

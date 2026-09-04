// Seed script for mobile integration testing of the booking module
// (cancellation / wallet-refund flow). Run with `npm run seed`.
//
// Purely `DATABASE_URL`-driven (via the shared prismaClient.ts, same as the
// rest of the app) — works unchanged locally or on the VPS, no branching.
//
// Idempotent: every model here is created via a real unique key (upsert) or
// a findFirst-then-create guard, so re-running never duplicates rows. See
// seed-data.ts for the schema-discrepancy notes (tier name, staff/users
// split, contract_type prerequisite, bus/seat requirement).
import bcrypt from 'bcrypt';
import prismaDb from '../../src/config/prismaClient';
import {
    AGENCIES,
    ROUTES,
    TEST_CUSTOMERS,
    SEED_GENERATED_TRIP_DAYS,
    SEED_SEATS_PER_BUS,
    SEED_WALLET_BALANCE,
    TEST_CUSTOMER_TIER,
    SEED_BCRYPT_ROUNDS,
    SEED_CONTRACT_TYPE_CODE,
    SEED_CONTRACT_TYPE_NAME,
    SEED_BUS_SEAT_LAYOUT,
    SEED_BUS_TYPE,
    AgencySeedData,
} from './seed-data';

/** Combines today (or `baseDate`)'s Y/M/D with a fixed "HH:MM" time of day. */
function atTimeOfDay(baseDate: Date, hhmm: string): Date {
    const [hours, minutes] = hhmm.split(':').map(Number);
    const d = new Date(baseDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
}

function addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

interface SeededAgencyResult {
    agencyId: number;
    agencyName: string;
    busId: number;
    seatIds: number[];
    trips: { tripId: number; durationHours: number; departureTimeOfDay: string }[];
}

/** Étape 1 (agence + staff admin) + une partie de l'étape 2 (bus/sièges), en
 * une seule transaction par agence : "agence + staff + trips en une seule
 * transaction" comme demandé. */
async function seedAgency(seed: AgencySeedData, index: number): Promise<SeededAgencyResult> {
    return prismaDb.$transaction(async (tx) => {
        // --- Agence (pas de clé unique naturelle sur `name` -> findFirst puis create) ---
        let agency = await tx.agency.findFirst({ where: { name: seed.name } });
        if (!agency) {
            agency = await tx.agency.create({
                data: {
                    name: seed.name,
                    email: seed.email,
                    phone: seed.phone,
                    address: seed.address,
                    cities_served: seed.citiesServed,
                    is_deleted: false,
                },
            });
            console.log(`✅ Agence "${seed.name}" créée (id: ${agency.id})`);
        } else {
            console.log(`↪️  Agence "${seed.name}" déjà existante (id: ${agency.id}), réutilisée`);
        }

        // --- Type de contrat prérequis (partagé entre les 3 agences, aucune ligne n'existait avant ce seed) ---
        const contractType = await tx.contract_type.upsert({
            where: { code: SEED_CONTRACT_TYPE_CODE },
            update: {},
            create: {
                name: SEED_CONTRACT_TYPE_NAME,
                code: SEED_CONTRACT_TYPE_CODE,
                periodicity: 'monthly',
            },
        });

        // --- Staff (fiche RH) : identifié par employee_id (VarChar(20), donc
        // basé sur l'index d'agence plutôt que l'email), propre à chaque agence ---
        const employeeId = `SEED-STAFF-${index}`;
        let staff = await tx.staff.findUnique({ where: { employee_id: employeeId } });
        if (!staff) {
            staff = await tx.staff.create({
                data: {
                    first_name: seed.staffFirstName,
                    last_name: seed.staffLastName,
                    employee_id: employeeId,
                    email: seed.staffEmail,
                    contract_start_date: new Date(),
                    weekly_working_hours: 40,
                    contract_type: contractType.id,
                    salary: 150_000,
                    payment_mode: 'monthly',
                },
            });
        }

        // --- users (compte de connexion : login/password/role) — table séparée de `staff`,
        // liée seulement en copiant l'id (users.staff n'est pas une vraie FK). ---
        const hashedPassword = await bcrypt.hash(seed.staffPassword, SEED_BCRYPT_ROUNDS);
        let user = await tx.users.findUnique({ where: { login: seed.staffEmail } });
        if (!user) {
            user = await tx.users.create({
                data: {
                    login: seed.staffEmail,
                    password: hashedPassword,
                    role: 'admin',
                    account_status: 'enabled', // users.account_status CHECK allows 'deleted'|'disabled'|'enabled' (not 'active' — that's the customer table's vocabulary)
                    staff: staff.id,
                },
            });
            console.log(`✅ Compte staff admin "${seed.staffEmail}" créé (id: ${user.id})`);
        } else {
            console.log(`↪️  Compte staff admin "${seed.staffEmail}" déjà existant (id: ${user.id}), réutilisé`);
        }

        // --- Bus (support physique des 30 sièges) ---
        const bus = await tx.bus.upsert({
            where: { registration_number: seed.busRegistrationNumber },
            update: {},
            create: {
                registration_number: seed.busRegistrationNumber,
                capacity: SEED_SEATS_PER_BUS,
                type: SEED_BUS_TYPE,
                amenities: ['wifi', 'climatisation'],
                seat_layout: SEED_BUS_SEAT_LAYOUT,
                agency_id: agency.id,
                is_active: true,
                created_by: user.id,
            },
        });

        // --- 30 sièges numérotés 1->30, réutilisés pour tous les generated_trip de ce bus ---
        await tx.seat.createMany({
            data: Array.from({ length: SEED_SEATS_PER_BUS }, (_, i) => ({
                bus_id: bus.id,
                seat_number: i + 1,
                seat_type: 'standard',
                is_active: true,
            })),
            skipDuplicates: true,
        });
        const seats = await tx.seat.findMany({
            where: { bus_id: bus.id },
            orderBy: { seat_number: 'asc' },
            select: { id: true },
        });

        // --- 6 trips (routes fixes) ---
        const trips: SeededAgencyResult['trips'] = [];
        const today = new Date();
        for (const route of ROUTES) {
            let trip = await tx.trip.findFirst({
                where: { agency_id: agency.id, departure_city: route.departureCity, arrival_city: route.arrivalCity },
            });
            if (!trip) {
                const departureTime = atTimeOfDay(today, route.departureTimeOfDay);
                const arrivalTime = addHours(departureTime, route.durationHours);
                trip = await tx.trip.create({
                    data: {
                        departure_city: route.departureCity,
                        arrival_city: route.arrivalCity,
                        departure_time: departureTime,
                        arrival_time: arrivalTime,
                        price: route.price,
                        bus_id: bus.id,
                        agency_id: agency.id,
                        is_active: true,
                        valid_from: today,
                        created_by: user.id,
                    },
                });
            }
            trips.push({ tripId: trip.id, durationHours: route.durationHours, departureTimeOfDay: route.departureTimeOfDay });
        }
        console.log(`✅ 6 trips créés/vérifiés pour ${seed.name}`);

        return { agencyId: agency.id, agencyName: agency.name, busId: bus.id, seatIds: seats.map((s) => s.id), trips };
    });
}

/** Étape 3 : génère, pour chaque trip, un voyage par jour sur les 7 prochains
 * jours (statut "scheduled"), avec 30 generated_trip_seat "available"
 * chacun. Fait hors transaction par agence (volumétrie plus importante :
 * ~126 generated_trip x 30 sièges = ~3780 lignes) mais toujours via
 * createMany+skipDuplicates -> idempotent et atomique par lot. */
async function generateTripInstances(agencies: SeededAgencyResult[]): Promise<{ generatedTripCount: number; minDate: Date; maxDate: Date }> {
    const today = new Date();

    // 1) Construire toutes les lignes generated_trip (agence x trip x jour)
    type PendingGeneratedTrip = { tripId: number; busId: number; departure: Date; arrival: Date };
    const pending: PendingGeneratedTrip[] = [];
    for (const agency of agencies) {
        for (const trip of agency.trips) {
            for (let day = 0; day < SEED_GENERATED_TRIP_DAYS; day++) {
                const dayBase = addDays(today, day);
                const departure = atTimeOfDay(dayBase, trip.departureTimeOfDay);
                const arrival = addHours(departure, trip.durationHours);
                pending.push({ tripId: trip.tripId, busId: agency.busId, departure, arrival });
            }
        }
    }

    await prismaDb.generated_trip.createMany({
        data: pending.map((p) => ({
            trip_id: p.tripId,
            original_departure_time: p.departure,
            actual_departure_time: p.departure,
            actual_arrival_time: p.arrival,
            available_seats: SEED_SEATS_PER_BUS,
            status: 'scheduled',
            bus_id: p.busId,
        })),
        skipDuplicates: true,
    });

    const tripIds = agencies.flatMap((a) => a.trips.map((t) => t.tripId));
    const generatedTrips = await prismaDb.generated_trip.findMany({
        where: { trip_id: { in: tripIds } },
        select: { id: true, bus_id: true, actual_departure_time: true },
    });
    console.log(`✅ ${generatedTrips.length} generated_trips créés (7 jours × ${tripIds.length} trips)`);

    // 2) Construire toutes les lignes generated_trip_seat (30 sièges partagés par bus)
    const seatIdsByBus = new Map<number, number[]>(agencies.map((a) => [a.busId, a.seatIds]));
    const seatRows = generatedTrips.flatMap((gt) => {
        const seatIds = seatIdsByBus.get(gt.bus_id) ?? [];
        return seatIds.map((seatId) => ({ generated_trip_id: gt.id, seat_id: seatId, status: 'available' }));
    });
    await prismaDb.generated_trip_seat.createMany({ data: seatRows, skipDuplicates: true });
    console.log(`✅ ${seatRows.length} sièges (generated_trip_seat) initialisés à "available"`);

    const dates = generatedTrips.map((gt) => gt.actual_departure_time!.getTime());
    return { generatedTripCount: generatedTrips.length, minDate: new Date(Math.min(...dates)), maxDate: new Date(Math.max(...dates)) };
}

/** Étape 4 : 5 comptes clients de test, portefeuille initialisé à 10 000 FCFA
 * pour tester le remboursement lors d'une annulation. */
async function seedCustomers(): Promise<void> {
    for (const c of TEST_CUSTOMERS) {
        const hashedPassword = await bcrypt.hash(c.password, SEED_BCRYPT_ROUNDS);
        await prismaDb.customer.upsert({
            where: { email: c.email },
            update: {},
            create: {
                first_name: c.firstName,
                last_name: c.lastName,
                email: c.email,
                phone: c.phone,
                password: hashedPassword,
                email_verified: true,
                phone_verified: true,
                wallet_balance: SEED_WALLET_BALANCE,
                loyalty_points: 0,
                customer_tier: TEST_CUSTOMER_TIER,
                account_status: 'active',
                is_active: true,
            },
        });
    }
    console.log(`✅ ${TEST_CUSTOMERS.length} comptes clients créés (wallet: ${SEED_WALLET_BALANCE} FCFA chacun)`);
}

async function printSummary(agencies: SeededAgencyResult[], tripStats: { generatedTripCount: number; minDate: Date; maxDate: Date }) {
    const tripIds = agencies.flatMap((a) => a.trips.map((t) => t.tripId));
    const totalAvailableSeats = await prismaDb.generated_trip_seat.count({
        where: { status: 'available', generated_trip: { trip_id: { in: tripIds } } },
    });
    const customers = await prismaDb.customer.findMany({
        where: { email: { in: TEST_CUSTOMERS.map((c) => c.email) } },
        select: { email: true, wallet_balance: true },
        orderBy: { email: 'asc' },
    });

    console.log('\n========== Récapitulatif du seed ==========');
    console.log(`Agences        : ${agencies.length} (${agencies.map((a) => a.agencyName).join(', ')})`);
    console.log(`Trips          : ${tripIds.length}`);
    console.log(`Generated trips: ${tripStats.generatedTripCount} (du ${tripStats.minDate.toISOString().slice(0, 10)} au ${tripStats.maxDate.toISOString().slice(0, 10)})`);
    console.log(`Sièges disponibles (total) : ${totalAvailableSeats}`);
    console.log(`Clients de test : ${customers.length}`);
    for (const c of customers) {
        console.log(`  - ${c.email} : wallet = ${c.wallet_balance} FCFA`);
    }
    console.log('=============================================\n');
}

async function main() {
    console.log('🌱 Démarrage du seed (module booking — tests mobile)...\n');

    const agencies: SeededAgencyResult[] = [];
    for (let i = 0; i < AGENCIES.length; i++) {
        agencies.push(await seedAgency(AGENCIES[i], i + 1));
    }

    const tripStats = await generateTripInstances(agencies);
    await seedCustomers();
    await printSummary(agencies, tripStats);

    console.log('✅ Seed terminé — base prête pour les tests mobile.');
}

main()
    .catch((error) => {
        console.error('❌ Erreur pendant le seed :', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prismaDb.$disconnect();
    });

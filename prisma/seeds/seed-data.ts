// Static seed data for mobile integration testing (booking + wallet-refund
// flow). Pure data — no Prisma calls here — so seed.ts and seed-clean.ts can
// both import it and stay in sync on exactly which rows are "test data".
//
// SCHEMA DISCREPANCIES FLAGGED (see BOOKING_MODULE_NOTES.md for the full
// write-up), not silently absorbed:
// - The request asked for customer_tier "standard". The real tier vocabulary
//   (src/config/tier.config.ts TIER_CONFIGS) only has
//   'regular' | 'silver' | 'gold' | 'platinum' — no "standard" exists. Using
//   the actual base tier 'regular' instead (see TEST_CUSTOMER_TIER below).
// - A "staff admin account with email + password" needs TWO rows: `staff`
//   (HR data, no login) and `users` (login/password/role) — `staff.email` is
//   not an auth field and `users.staff` is an unenforced plain Int column,
//   not a real FK. Linked here only by copying the DB-assigned staff.id.
// - `staff.contract_type` is a required FK and the DB has zero contract_type
//   rows today, so seed.ts creates one shared "seed" contract type first.
// - "30 seats" needs real `bus` + `seat` rows (per-bus inventory), not a bare
//   capacity number — one bus per agency is created to hold them.
// - No `is_test` column exists anywhere in the schema (would need a real
//   migration). Cleanup instead matches the exact static identifiers below
//   (agency names, staff/customer emails, bus registration numbers) — zero
//   risk of touching unrelated real data, no schema change required.

export interface AgencySeedData {
    name: string;
    email: string;
    phone: string;
    address: string;
    citiesServed: string[];
    staffFirstName: string;
    staffLastName: string;
    staffEmail: string;
    staffPassword: string;
    busRegistrationNumber: string;
}

export const AGENCIES: AgencySeedData[] = [
    {
        name: 'Transcam Express',
        email: 'contact@transcam-express.cm',
        phone: '+237699100001',
        address: 'Carrefour Warda, Yaoundé, Cameroun',
        citiesServed: ['Yaoundé', 'Douala', 'Bafoussam'],
        staffFirstName: 'Admin',
        staffLastName: 'Transcam',
        staffEmail: 'admin@transcam-express.cm',
        staffPassword: 'Admin@1234',
        busRegistrationNumber: 'CE-1001-TCE',
    },
    {
        name: 'Voyage Plus',
        email: 'contact@voyageplus.cm',
        phone: '+237699100002',
        address: 'Akwa, Douala, Cameroun',
        citiesServed: ['Douala', 'Yaoundé', 'Bafoussam'],
        staffFirstName: 'Admin',
        staffLastName: 'VoyagePlus',
        staffEmail: 'admin@voyageplus.cm',
        staffPassword: 'Admin@1234',
        busRegistrationNumber: 'LT-2002-VPL',
    },
    {
        name: 'Confort Bus',
        email: 'contact@confortbus.cm',
        phone: '+237699100003',
        address: 'Marché A, Bafoussam, Cameroun',
        citiesServed: ['Bafoussam', 'Yaoundé', 'Douala'],
        staffFirstName: 'Admin',
        staffLastName: 'ConfortBus',
        staffEmail: 'admin@confortbus.cm',
        staffPassword: 'Admin@1234',
        busRegistrationNumber: 'OU-3003-CFB',
    },
];

export interface RouteSeedData {
    departureCity: string;
    arrivalCity: string;
    durationHours: number;
    price: number;
    /** "HH:MM", 24h, cycled from the 4 times the spec lists (06h00/08h00/10h00/14h00). */
    departureTimeOfDay: string;
}

const DEPARTURE_TIMES = ['06:00', '08:00', '10:00', '14:00'];

// 3 routes x 2 directions = 6 trips per agency, per the spec's table
// (Yaoundé<->Douala 3h/3500, Yaoundé<->Bafoussam 4h/4000, Douala<->Bafoussam 5h/4500).
export const ROUTES: RouteSeedData[] = [
    { departureCity: 'Yaoundé', arrivalCity: 'Douala', durationHours: 3, price: 3500, departureTimeOfDay: DEPARTURE_TIMES[0] },
    { departureCity: 'Douala', arrivalCity: 'Yaoundé', durationHours: 3, price: 3500, departureTimeOfDay: DEPARTURE_TIMES[1] },
    { departureCity: 'Yaoundé', arrivalCity: 'Bafoussam', durationHours: 4, price: 4000, departureTimeOfDay: DEPARTURE_TIMES[2] },
    { departureCity: 'Bafoussam', arrivalCity: 'Yaoundé', durationHours: 4, price: 4000, departureTimeOfDay: DEPARTURE_TIMES[3] },
    { departureCity: 'Douala', arrivalCity: 'Bafoussam', durationHours: 5, price: 4500, departureTimeOfDay: DEPARTURE_TIMES[0] },
    { departureCity: 'Bafoussam', arrivalCity: 'Douala', durationHours: 5, price: 4500, departureTimeOfDay: DEPARTURE_TIMES[1] },
];

export interface CustomerSeedData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
}

export const TEST_CUSTOMERS: CustomerSeedData[] = [
    { firstName: 'Test', lastName: 'User 1', email: 'test1@adigo.cm', phone: '690000001', password: 'Test@1234' },
    { firstName: 'Test', lastName: 'User 2', email: 'test2@adigo.cm', phone: '690000002', password: 'Test@1234' },
    { firstName: 'Test', lastName: 'User 3', email: 'test3@adigo.cm', phone: '690000003', password: 'Test@1234' },
    { firstName: 'Test', lastName: 'User 4', email: 'test4@adigo.cm', phone: '690000004', password: 'Test@1234' },
    { firstName: 'Test', lastName: 'User 5', email: 'test5@adigo.cm', phone: '690000005', password: 'Test@1234' },
];

export const SEED_GENERATED_TRIP_DAYS = 7;
export const SEED_SEATS_PER_BUS = 30;
export const SEED_WALLET_BALANCE = 10_000; // FCFA — "pour tester le remboursement"
// 'standard' (as literally requested) doesn't exist in TIER_CONFIGS
// (src/config/tier.config.ts) — 'regular' is the real base tier.
export const TEST_CUSTOMER_TIER = 'regular';
export const SEED_BCRYPT_ROUNDS = 10; // matches every other bcrypt.hash() call in this codebase
export const SEED_CONTRACT_TYPE_CODE = 'SEED-ADMIN';
export const SEED_CONTRACT_TYPE_NAME = 'Personnel agence (seed test)';
export const SEED_BUS_SEAT_LAYOUT = '2x2';
export const SEED_BUS_TYPE = 'standard';

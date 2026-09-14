import { pgNone } from "../utils/prisma-compat";

/**
 * Commission / revenue ledger — "manquements pour la production" audit,
 * 2026-09-13/14: VTC rides are cash-direct-to-driver with no platform
 * revenue capture at all. 10% rate confirmed with the user (matches the
 * existing ticketing resale commission — event-ticket-resale.model.ts).
 *
 * One row per completed ride. Auto-'settled' (wallet debited immediately)
 * when the driver has a linked `customer` wallet (self-registered,
 * `vtc_drivers.user_id` set); stays 'pending' for manual admin settlement
 * otherwise (admin-onboarded drivers have no wallet to debit). See
 * RideService.updateRideStatus and the new /vtc/commission/* admin routes.
 */
export const migrateVtcCommission = async () => {
    try {
        console.log('🔄 Starting VTC commission-ledger migration...');

        await pgNone(`
            CREATE TABLE IF NOT EXISTS vtc_commission_ledger (
                id SERIAL PRIMARY KEY,
                ride_id INT NOT NULL UNIQUE REFERENCES vtc_rides(id),
                driver_id INT NOT NULL REFERENCES vtc_drivers(id),
                gross_fare DECIMAL(10,2) NOT NULL,
                commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
                commission_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                settled_at TIMESTAMP,
                settled_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Created vtc_commission_ledger table');

        await pgNone(`CREATE INDEX IF NOT EXISTS idx_vtc_commission_ledger_driver ON vtc_commission_ledger(driver_id)`);
        await pgNone(`CREATE INDEX IF NOT EXISTS idx_vtc_commission_ledger_status ON vtc_commission_ledger(status)`);
        console.log('✅ Added vtc_commission_ledger indexes');

        console.log('✅ VTC commission-ledger migration completed successfully');
    } catch (error) {
        console.error('❌ Error migrating VTC commission ledger:', error);
        throw error;
    }
};

/**
 * Auto-cancels VTC rides stuck in 'requested' with no driver assigned —
 * there's no automatic matching (an admin assigns manually from the desktop
 * dispatch screen), so without this a customer who requests a ride, pays by
 * wallet, and abandons the app has their money held indefinitely on a
 * 'requested' row nobody will ever act on.
 *
 * Same node-cron pattern as TripSchedulerService's per-minute reminder job
 * (see tripScheduler.service.ts) — started once at boot from
 * initFirtsItems.ts.
 */
import cron from 'node-cron';
import rideService from './vtc/ride.service';

/**
 * Periodic sweep — RideService.RIDE_EXPIRY_MINUTES is the single source of
 * truth for the actual timeout (also used by getRideById's lazy check,
 * which is the safety net for whenever this periodic job is slow, misses a
 * tick, or (2026-09-05 audit: could not be confirmed firing within a
 * reasonable wait in the local dev process) doesn't run at all — this cron
 * catches everything else, on a schedule, without needing anyone to look at
 * a specific ride first.
 */
export class VtcRideExpiryService {
  startScheduling(): void {
    cron.schedule('* * * * *', async () => {
      try {
        const cancelled = await rideService.cancelStaleRequestedRides();
        if (cancelled.length > 0) {
          console.log(`⏱️ VTC: ${cancelled.length} course(s) auto-annulée(s) (aucun chauffeur assigné à temps)`);
        }
      } catch (error) {
        console.error('Erreur VtcRideExpiryService:', error);
      }

      // Safety net for a "choisir son chauffeur" offer nobody ever
      // answered (driver app killed/no connectivity) — the fast path is
      // the driver app's own countdown UI declining it client-side well
      // before this per-minute sweep would even catch it (see
      // RideService.OFFER_EXPIRY_SECONDS's doc comment).
      try {
        const expired = await rideService.expireStaleOfferedRides();
        if (expired.length > 0) {
          console.log(`⏱️ VTC: ${expired.length} offre(s) chauffeur expirée(s) sans réponse — remise en file d'attente`);
        }
      } catch (error) {
        console.error('Erreur VtcRideExpiryService (offres):', error);
      }
    });
  }
}

export default new VtcRideExpiryService();

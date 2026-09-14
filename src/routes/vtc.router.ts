/**
 * VTC Routes
 * API routes for VTC/Taxi module
 */

import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Router } from 'express';
import rideController from '../controllers/vtc/ride.controller';
import driverController from '../controllers/vtc/driver.controller';
import trackingController from '../controllers/vtc/tracking.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.middleware';
import { adminRoleMiddleware } from '../middleware/admin-role.middleware';
import { createUploader } from '../config/multer.config';

const router = Router();

/**
 * Driver photo + vehicle documents (registration/"carte grise" scan, up to
 * 6 vehicle photos). `photo`/`vehiclePhotos` go through the normal
 * `createUploader` factory (uploads/vtc-drivers/, served publicly via
 * app.ts's `express.static('/uploads', ...)`) — intentional, a driver's
 * face and car photos are meant to be customer-visible, same as any
 * ride-hailing app.
 *
 * `registrationDocument` ("carte grise") is different: it can carry the
 * vehicle owner's real name/address, and — flagged live 2026-09-13 during
 * a production-readiness audit — was reachable by *anyone* who ever saw
 * its URL, forever, with zero authentication (the blanket static mount
 * doesn't check who's asking). Routed to a sibling directory the static
 * mount can never reach at all, rather than layering an auth check in
 * front of the same public folder — the file is physically inaccessible
 * except through GET /vtc/drivers/:id/registration-document below, which
 * does check staff-or-owning-driver.
 */
const driverDocumentsUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dest = file.fieldname === 'registrationDocument'
        ? 'uploads-private/vtc-drivers/'
        : 'uploads/vtc-drivers/';
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 1024 * 1024 * 5 },
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'registrationDocument', maxCount: 1 },
  { name: 'vehiclePhotos', maxCount: 6 },
]);

// ============================================
// Ride Routes
// ============================================

/**
 * GET /v1/api/vtc/estimate
 * Estimate ride cost and duration
 */
// optionalAuthMiddleware, not authMiddleware: anonymous price-checking must
// keep working (never 401s), but req.userId needs to be populated when a
// token IS present so a promo code's per-customer "already used" check can
// actually run (see RideController.estimateRide's promoCode handling).
router.get('/estimate', optionalAuthMiddleware, rideController.estimateRide.bind(rideController));

/**
 * GET /v1/api/vtc/surge/current
 * Current global surge multiplier + the raw demand/supply counts behind it
 * — see RideService.getSurgeStatus.
 */
router.get('/surge/current', rideController.getSurgeStatus.bind(rideController));

/**
 * GET /v1/api/vtc/promo-codes/active
 * Public — every currently-usable VTC promo code — see PromoService.listActive.
 */
router.get('/promo-codes/active', rideController.getActivePromoCodes.bind(rideController));

/**
 * Commission / revenu Adigo — admin-only, see CommissionService.
 */
router.get(
  '/commission/summary',
  authMiddleware,
  adminRoleMiddleware,
  rideController.getCommissionSummary.bind(rideController)
);
router.get(
  '/commission/by-driver',
  authMiddleware,
  adminRoleMiddleware,
  rideController.getCommissionByDriver.bind(rideController)
);
router.put(
  '/commission/:id/settle',
  authMiddleware,
  adminRoleMiddleware,
  rideController.settleCommission.bind(rideController)
);

/**
 * GET /v1/api/vtc/rides/admin/all
 * Admin: list rides (optionally filtered by ?status=) to manually assign a
 * driver — there's no automatic matching yet. Must be registered before
 * GET /rides/:id so "admin" isn't captured as a ride id.
 */
router.get(
  '/rides/admin/all',
  authMiddleware,
  adminRoleMiddleware,
  rideController.getAllRides.bind(rideController)
);

/**
 * PUT /v1/api/vtc/rides/:id/assign
 * Admin: assign a driver to a pending ride.
 */
router.put(
  '/rides/:id/assign',
  authMiddleware,
  adminRoleMiddleware,
  rideController.assignDriver.bind(rideController)
);

/**
 * GET /v1/api/vtc/rides/customer/current
 * Customer's currently active ride, if any. Must stay before GET /rides/:id
 * so "customer" isn't captured as a ride id — same reason as
 * /rides/driver/current below.
 */
router.get(
  '/rides/customer/current',
  authMiddleware,
  rideController.getCurrentRideForCustomer.bind(rideController)
);

/**
 * PUT /v1/api/vtc/rides/:id/respond
 * Driver: accept or decline a ride offered to them (customer picked them
 * from the "nearby drivers" list at booking time — see
 * RideController.createRide). Plain authMiddleware, not admin: the caller
 * must be the driver the offer was made to, checked inside the controller
 * via their own vtc_drivers row.
 */
router.put(
  '/rides/:id/respond',
  authMiddleware,
  rideController.respondToOffer.bind(rideController)
);

/**
 * GET /v1/api/vtc/rides/driver/current
 * Driver mode home screen: the authenticated driver's active ride, if any.
 * Must stay before GET /rides/:id so "driver" isn't captured as a ride id.
 */
router.get(
  '/rides/driver/current',
  authMiddleware,
  rideController.getCurrentRideForDriver.bind(rideController)
);

/**
 * GET /v1/api/vtc/rides/driver/history
 * Driver mode's "Mes courses" — this driver's own past rides. Same
 * "before GET /rides/:id" placement as /rides/driver/current above.
 */
router.get(
  '/rides/driver/history',
  authMiddleware,
  rideController.getRideHistoryForDriver.bind(rideController)
);

/**
 * POST /v1/api/vtc/rides
 * Create a new ride request
 */
router.post('/rides', authMiddleware, rideController.createRide.bind(rideController));

/**
 * GET /v1/api/vtc/rides/:id
 * Get ride details by ID
 */
router.get('/rides/:id', rideController.getRide.bind(rideController));

/**
 * GET /v1/api/vtc/rides
 * Get the authenticated customer's ride history
 */
router.get('/rides', authMiddleware, rideController.getCustomerRides.bind(rideController));

/**
 * PUT /v1/api/vtc/rides/:id/cancel
 * Cancel a ride
 */
router.put('/rides/:id/cancel', authMiddleware, rideController.cancelRide.bind(rideController));

/**
 * PUT /v1/api/vtc/rides/:id/rate
 * Rate a completed ride
 */
router.put('/rides/:id/rate', authMiddleware, rideController.rateRide.bind(rideController));

/**
 * PUT /v1/api/vtc/rides/:id/status
 * Advance a ride's lifecycle (accepted → arrived → started → completed).
 * See RIDE_STATUS_TRANSITIONS in ride.model.ts for the allowed moves.
 */
router.put('/rides/:id/status', authMiddleware, rideController.updateStatus.bind(rideController));

/**
 * POST /v1/api/vtc/rides/:id/tracking
 * Record one real-time GPS point for an active ride.
 */
router.post('/rides/:id/tracking', authMiddleware, trackingController.recordPoint.bind(trackingController));

/**
 * GET /v1/api/vtc/rides/:id/tracking
 * Full GPS point history for a ride (replay, or catch-up on page load).
 */
router.get('/rides/:id/tracking', authMiddleware, trackingController.getHistory.bind(trackingController));

// ============================================
// Driver Routes
// ============================================

/**
 * POST /v1/api/vtc/drivers
 * Admin: onboard a driver (no driver-facing self-signup app yet).
 */
router.post(
  '/drivers',
  authMiddleware,
  adminRoleMiddleware,
  driverDocumentsUpload,
  driverController.createDriver.bind(driverController)
);

/**
 * POST /v1/api/vtc/drivers/register
 * Self-service: any authenticated customer becomes a driver directly, no
 * admin involved. Must stay before GET /drivers/:id below, same reasoning
 * as /nearby and /me. Deliberately plain authMiddleware, not
 * adminRoleMiddleware — that's the whole point of this route existing
 * alongside POST /drivers above.
 */
router.post(
  '/drivers/register',
  authMiddleware,
  driverDocumentsUpload,
  driverController.registerAsDriver.bind(driverController)
);

/**
 * GET /v1/api/vtc/drivers/nearby
 * Get nearby available drivers — must stay before GET /drivers/:id.
 */
router.get('/drivers/nearby', driverController.getNearbyDrivers.bind(driverController));

/**
 * Driver mode "me" routes — resolve the driver from the JWT (a driver is a
 * customer account with a vtc_drivers row pointing back at it, not a
 * separate login), not from an id in the URL. Must stay before
 * GET/PUT /drivers/:id... below, same reasoning as /nearby above.
 */
router.get('/drivers/me', authMiddleware, driverController.getMyProfile.bind(driverController));
router.put(
  '/drivers/me',
  authMiddleware,
  driverDocumentsUpload,
  driverController.updateMyProfile.bind(driverController)
);
router.put('/drivers/me/status', authMiddleware, driverController.updateMyStatus.bind(driverController));
router.put('/drivers/me/location', authMiddleware, driverController.updateMyLocation.bind(driverController));

/**
 * GET /v1/api/vtc/drivers
 * Admin: list all drivers.
 */
router.get(
  '/drivers',
  authMiddleware,
  adminRoleMiddleware,
  driverController.getAllDrivers.bind(driverController)
);

/**
 * GET /v1/api/vtc/drivers/pending
 * Admin's driver-verification queue — must stay before GET /drivers/:id,
 * same reasoning as /nearby and /me above.
 */
router.get(
  '/drivers/pending',
  authMiddleware,
  adminRoleMiddleware,
  driverController.getPendingDrivers.bind(driverController)
);

/**
 * GET /v1/api/vtc/drivers/:id
 * Get driver details
 */
router.get('/drivers/:id', driverController.getDriver.bind(driverController));

/**
 * GET /v1/api/vtc/drivers/:id/profile
 * The "choisir son chauffeur" detail view — full vehicle info + photos,
 * rating/ride count, recent reviews, and (with ?pickupLat=&pickupLon=) a
 * rough ETA to the customer's pickup point.
 */
router.get('/drivers/:id/profile', driverController.getDriverProfile.bind(driverController));

/**
 * GET /v1/api/vtc/drivers/:id/registration-document
 * Staff or the driver themselves only — see the controller's doc comment.
 */
router.get(
  '/drivers/:id/registration-document',
  authMiddleware,
  driverController.getRegistrationDocument.bind(driverController)
);

/**
 * PUT /v1/api/vtc/drivers/:id
 * Admin: edit a driver profile.
 */
router.put(
  '/drivers/:id',
  authMiddleware,
  adminRoleMiddleware,
  driverDocumentsUpload,
  driverController.updateDriver.bind(driverController)
);

/**
 * PUT /v1/api/vtc/drivers/:id/location
 * Update driver location (for driver app). Requires a valid token — this used
 * to be wide open, letting anyone spoof any driver's GPS position by guessing
 * an id. Not restricted to adminRoleMiddleware because there is no driver
 * role/token yet (Phase 2 of VTC_MODULE_PLAN.md); once one exists, add an
 * ownership check here (driver can only update their own record).
 */
router.put('/drivers/:id/location', authMiddleware, driverController.updateLocation.bind(driverController));

/**
 * PUT /v1/api/vtc/drivers/:id/status
 * Update driver status (online/offline/busy). Same reasoning as /location
 * above — was unauthenticated, now just requires a valid token.
 */
router.put('/drivers/:id/status', authMiddleware, driverController.updateStatus.bind(driverController));

/**
 * PUT /v1/api/vtc/drivers/:id/verify
 * Admin approves or rejects a driver's submitted documents — the gate a
 * self-registered driver can't get around by itself (see
 * DriverService.updateDriverStatus, which refuses 'online' otherwise).
 */
router.put(
  '/drivers/:id/verify',
  authMiddleware,
  adminRoleMiddleware,
  driverController.verifyDriver.bind(driverController)
);

export default router;

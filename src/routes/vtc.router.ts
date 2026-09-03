/**
 * VTC Routes
 * API routes for VTC/Taxi module
 */

import { Router } from 'express';
import rideController from '../controllers/vtc/ride.controller';
import driverController from '../controllers/vtc/driver.controller';
import trackingController from '../controllers/vtc/tracking.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminRoleMiddleware } from '../middleware/admin-role.middleware';
import { createUploader } from '../config/multer.config';

const router = Router();

/**
 * Driver photo + vehicle documents (registration/"carte grise" scan, up to
 * 6 vehicle photos) — same createUploader factory other modules use
 * (agency logo, etc.), just parameterized to its own folder.
 */
const driverDocumentsUpload = createUploader('vtc-drivers').fields([
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
router.get('/estimate', rideController.estimateRide.bind(rideController));

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
 * GET /v1/api/vtc/drivers/nearby
 * Get nearby available drivers — must stay before GET /drivers/:id.
 */
router.get('/drivers/nearby', driverController.getNearbyDrivers.bind(driverController));

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
 * GET /v1/api/vtc/drivers/:id
 * Get driver details
 */
router.get('/drivers/:id', driverController.getDriver.bind(driverController));

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

export default router;

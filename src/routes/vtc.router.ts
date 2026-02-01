/**
 * VTC Routes
 * API routes for VTC/Taxi module
 */

import { Router } from 'express';
import rideController from '../controllers/vtc/ride.controller';
import driverController from '../controllers/vtc/driver.controller';

const router = Router();

// ============================================
// Ride Routes
// ============================================

/**
 * GET /v1/api/vtc/estimate
 * Estimate ride cost and duration
 */
router.get('/estimate', rideController.estimateRide.bind(rideController));

/**
 * POST /v1/api/vtc/rides
 * Create a new ride request
 */
router.post('/rides', rideController.createRide.bind(rideController));

/**
 * GET /v1/api/vtc/rides/:id
 * Get ride details by ID
 */
router.get('/rides/:id', rideController.getRide.bind(rideController));

/**
 * GET /v1/api/vtc/rides
 * Get customer rides history
 */
router.get('/rides', rideController.getCustomerRides.bind(rideController));

/**
 * PUT /v1/api/vtc/rides/:id/cancel
 * Cancel a ride
 */
router.put('/rides/:id/cancel', rideController.cancelRide.bind(rideController));

/**
 * PUT /v1/api/vtc/rides/:id/rate
 * Rate a completed ride
 */
router.put('/rides/:id/rate', rideController.rateRide.bind(rideController));

// ============================================
// Driver Routes
// ============================================

/**
 * GET /v1/api/vtc/drivers/nearby
 * Get nearby available drivers
 */
router.get('/drivers/nearby', driverController.getNearbyDrivers.bind(driverController));

/**
 * GET /v1/api/vtc/drivers/:id
 * Get driver details
 */
router.get('/drivers/:id', driverController.getDriver.bind(driverController));

/**
 * PUT /v1/api/vtc/drivers/:id/location
 * Update driver location (for driver app)
 */
router.put('/drivers/:id/location', driverController.updateLocation.bind(driverController));

/**
 * PUT /v1/api/vtc/drivers/:id/status
 * Update driver status (online/offline/busy)
 */
router.put('/drivers/:id/status', driverController.updateStatus.bind(driverController));

export default router;

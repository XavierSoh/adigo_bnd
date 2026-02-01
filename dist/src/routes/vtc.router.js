"use strict";
/**
 * VTC Routes
 * API routes for VTC/Taxi module
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ride_controller_1 = __importDefault(require("../controllers/vtc/ride.controller"));
const driver_controller_1 = __importDefault(require("../controllers/vtc/driver.controller"));
const router = (0, express_1.Router)();
// ============================================
// Ride Routes
// ============================================
/**
 * GET /v1/api/vtc/estimate
 * Estimate ride cost and duration
 */
router.get('/estimate', ride_controller_1.default.estimateRide.bind(ride_controller_1.default));
/**
 * POST /v1/api/vtc/rides
 * Create a new ride request
 */
router.post('/rides', ride_controller_1.default.createRide.bind(ride_controller_1.default));
/**
 * GET /v1/api/vtc/rides/:id
 * Get ride details by ID
 */
router.get('/rides/:id', ride_controller_1.default.getRide.bind(ride_controller_1.default));
/**
 * GET /v1/api/vtc/rides
 * Get customer rides history
 */
router.get('/rides', ride_controller_1.default.getCustomerRides.bind(ride_controller_1.default));
/**
 * PUT /v1/api/vtc/rides/:id/cancel
 * Cancel a ride
 */
router.put('/rides/:id/cancel', ride_controller_1.default.cancelRide.bind(ride_controller_1.default));
/**
 * PUT /v1/api/vtc/rides/:id/rate
 * Rate a completed ride
 */
router.put('/rides/:id/rate', ride_controller_1.default.rateRide.bind(ride_controller_1.default));
// ============================================
// Driver Routes
// ============================================
/**
 * GET /v1/api/vtc/drivers/nearby
 * Get nearby available drivers
 */
router.get('/drivers/nearby', driver_controller_1.default.getNearbyDrivers.bind(driver_controller_1.default));
/**
 * GET /v1/api/vtc/drivers/:id
 * Get driver details
 */
router.get('/drivers/:id', driver_controller_1.default.getDriver.bind(driver_controller_1.default));
/**
 * PUT /v1/api/vtc/drivers/:id/location
 * Update driver location (for driver app)
 */
router.put('/drivers/:id/location', driver_controller_1.default.updateLocation.bind(driver_controller_1.default));
/**
 * PUT /v1/api/vtc/drivers/:id/status
 * Update driver status (online/offline/busy)
 */
router.put('/drivers/:id/status', driver_controller_1.default.updateStatus.bind(driver_controller_1.default));
exports.default = router;

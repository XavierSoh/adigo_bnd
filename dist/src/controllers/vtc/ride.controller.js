"use strict";
/**
 * VTC Ride Controller
 * HTTP handlers for ride endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideController = void 0;
const ride_service_1 = __importDefault(require("../../services/vtc/ride.service"));
class RideController {
    /**
     * GET /v1/api/vtc/estimate
     * Estimate ride cost
     */
    async estimateRide(req, res) {
        try {
            const { pickupLat, pickupLon, dropoffLat, dropoffLon, vehicleType } = req.query;
            if (!pickupLat || !pickupLon || !dropoffLat || !dropoffLon || !vehicleType) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters'
                });
            }
            const estimate = await ride_service_1.default.estimateRide(parseFloat(pickupLat), parseFloat(pickupLon), parseFloat(dropoffLat), parseFloat(dropoffLon), vehicleType);
            return res.json({
                success: true,
                data: estimate
            });
        }
        catch (error) {
            console.error('Error estimating ride:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * POST /v1/api/vtc/rides
     * Create a new ride
     */
    async createRide(req, res) {
        try {
            const data = req.body;
            const ride = await ride_service_1.default.createRide(data);
            return res.status(201).json({
                success: true,
                data: ride
            });
        }
        catch (error) {
            console.error('Error creating ride:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * GET /v1/api/vtc/rides/:id
     * Get ride details
     */
    async getRide(req, res) {
        try {
            const rideId = parseInt(req.params.id);
            const ride = await ride_service_1.default.getRideById(rideId);
            if (!ride) {
                return res.status(404).json({
                    success: false,
                    message: 'Ride not found'
                });
            }
            return res.json({
                success: true,
                data: ride
            });
        }
        catch (error) {
            console.error('Error getting ride:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * GET /v1/api/vtc/rides
     * Get customer rides
     */
    async getCustomerRides(req, res) {
        try {
            const customerId = parseInt(req.query.customerId);
            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID is required'
                });
            }
            const rides = await ride_service_1.default.getCustomerRides(customerId);
            return res.json({
                success: true,
                data: rides
            });
        }
        catch (error) {
            console.error('Error getting customer rides:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * PUT /v1/api/vtc/rides/:id/cancel
     * Cancel a ride
     */
    async cancelRide(req, res) {
        try {
            const rideId = parseInt(req.params.id);
            const data = req.body;
            const ride = await ride_service_1.default.cancelRide(rideId, data);
            return res.json({
                success: true,
                data: ride
            });
        }
        catch (error) {
            console.error('Error cancelling ride:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * PUT /v1/api/vtc/rides/:id/rate
     * Rate a ride
     */
    async rateRide(req, res) {
        try {
            const rideId = parseInt(req.params.id);
            const { ratedBy, ...data } = req.body;
            const ride = await ride_service_1.default.rateRide(rideId, ratedBy, data);
            return res.json({
                success: true,
                data: ride
            });
        }
        catch (error) {
            console.error('Error rating ride:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}
exports.RideController = RideController;
exports.default = new RideController();

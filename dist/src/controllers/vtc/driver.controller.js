"use strict";
/**
 * VTC Driver Controller
 * HTTP handlers for driver endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverController = void 0;
const driver_service_1 = __importDefault(require("../../services/vtc/driver.service"));
class DriverController {
    /**
     * GET /v1/api/vtc/drivers/nearby
     * Get nearby available drivers
     */
    async getNearbyDrivers(req, res) {
        try {
            const { latitude, longitude, vehicleType, radius } = req.query;
            if (!latitude || !longitude) {
                return res.status(400).json({
                    success: false,
                    message: 'Latitude and longitude are required'
                });
            }
            const drivers = await driver_service_1.default.getNearbyDrivers(parseFloat(latitude), parseFloat(longitude), vehicleType, radius ? parseFloat(radius) : 5);
            return res.json({
                success: true,
                data: drivers
            });
        }
        catch (error) {
            console.error('Error getting nearby drivers:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * PUT /v1/api/vtc/drivers/:id/location
     * Update driver location
     */
    async updateLocation(req, res) {
        try {
            const driverId = parseInt(req.params.id);
            const data = req.body;
            const driver = await driver_service_1.default.updateDriverLocation(driverId, data);
            return res.json({
                success: true,
                data: driver
            });
        }
        catch (error) {
            console.error('Error updating driver location:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * PUT /v1/api/vtc/drivers/:id/status
     * Update driver status
     */
    async updateStatus(req, res) {
        try {
            const driverId = parseInt(req.params.id);
            const { status } = req.body;
            const driver = await driver_service_1.default.updateDriverStatus(driverId, status);
            return res.json({
                success: true,
                data: driver
            });
        }
        catch (error) {
            console.error('Error updating driver status:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * GET /v1/api/vtc/drivers/:id
     * Get driver details
     */
    async getDriver(req, res) {
        try {
            const driverId = parseInt(req.params.id);
            const driver = await driver_service_1.default.getDriverById(driverId);
            if (!driver) {
                return res.status(404).json({
                    success: false,
                    message: 'Driver not found'
                });
            }
            return res.json({
                success: true,
                data: driver
            });
        }
        catch (error) {
            console.error('Error getting driver:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}
exports.DriverController = DriverController;
exports.default = new DriverController();

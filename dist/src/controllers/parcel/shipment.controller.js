"use strict";
/**
 * Shipment Controller
 * HTTP handlers for parcel shipment endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShipmentController = void 0;
const shipment_service_1 = __importDefault(require("../../services/parcel/shipment.service"));
const database_1 = __importDefault(require("../../config/database"));
class ShipmentController {
    /**
     * POST /v1/api/parcel/estimate
     * Estimate shipment cost
     */
    async estimateShipment(req, res) {
        try {
            const data = req.body;
            const estimate = await shipment_service_1.default.estimateShipment(data);
            return res.json({
                success: true,
                data: estimate
            });
        }
        catch (error) {
            console.error('Error estimating shipment:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * POST /v1/api/parcel/shipments
     * Create a new shipment
     */
    async createShipment(req, res) {
        try {
            const data = req.body;
            const shipment = await shipment_service_1.default.createShipment(data);
            return res.status(201).json({
                success: true,
                data: shipment
            });
        }
        catch (error) {
            console.error('Error creating shipment:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * GET /v1/api/parcel/shipments/:id
     * Get shipment details
     */
    async getShipment(req, res) {
        try {
            const shipmentId = parseInt(req.params.id);
            const shipment = await shipment_service_1.default.getShipmentById(shipmentId);
            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    message: 'Shipment not found'
                });
            }
            return res.json({
                success: true,
                data: shipment
            });
        }
        catch (error) {
            console.error('Error getting shipment:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * GET /v1/api/parcel/track/:trackingNumber
     * Track shipment by tracking number
     */
    async trackShipment(req, res) {
        try {
            const trackingNumber = req.params.trackingNumber;
            const shipment = await shipment_service_1.default.trackByNumber(trackingNumber);
            if (!shipment) {
                return res.status(404).json({
                    success: false,
                    message: 'Shipment not found'
                });
            }
            // Get tracking events
            const eventsQuery = `
        SELECT * FROM parcel_tracking_events
        WHERE shipment_id = $1
        ORDER BY created_at DESC
      `;
            const eventsResult = await database_1.default.query(eventsQuery, [shipment.id]);
            return res.json({
                success: true,
                data: {
                    shipment,
                    events: eventsResult.rows
                }
            });
        }
        catch (error) {
            console.error('Error tracking shipment:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * GET /v1/api/parcel/shipments
     * Get customer shipments
     */
    async getCustomerShipments(req, res) {
        try {
            const customerId = parseInt(req.query.customerId);
            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID is required'
                });
            }
            const shipments = await shipment_service_1.default.getCustomerShipments(customerId);
            return res.json({
                success: true,
                data: shipments
            });
        }
        catch (error) {
            console.error('Error getting customer shipments:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}
exports.ShipmentController = ShipmentController;
exports.default = new ShipmentController();

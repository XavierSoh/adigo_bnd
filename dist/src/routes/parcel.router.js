"use strict";
/**
 * Parcel Delivery Routes
 * API routes for parcel delivery module
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shipment_controller_1 = __importDefault(require("../controllers/parcel/shipment.controller"));
const address_controller_1 = __importDefault(require("../controllers/parcel/address.controller"));
const router = (0, express_1.Router)();
// ============================================
// Shipment Routes
// ============================================
/**
 * POST /v1/api/parcel/estimate
 * Estimate shipment cost
 */
router.post('/estimate', shipment_controller_1.default.estimateShipment.bind(shipment_controller_1.default));
/**
 * POST /v1/api/parcel/shipments
 * Create a new shipment
 */
router.post('/shipments', shipment_controller_1.default.createShipment.bind(shipment_controller_1.default));
/**
 * GET /v1/api/parcel/shipments/:id
 * Get shipment details by ID
 */
router.get('/shipments/:id', shipment_controller_1.default.getShipment.bind(shipment_controller_1.default));
/**
 * GET /v1/api/parcel/shipments
 * Get customer shipments history
 */
router.get('/shipments', shipment_controller_1.default.getCustomerShipments.bind(shipment_controller_1.default));
/**
 * GET /v1/api/parcel/track/:trackingNumber
 * Track shipment by tracking number
 */
router.get('/track/:trackingNumber', shipment_controller_1.default.trackShipment.bind(shipment_controller_1.default));
// ============================================
// Address Routes
// ============================================
/**
 * GET /v1/api/parcel/addresses
 * Get customer saved addresses
 */
router.get('/addresses', address_controller_1.default.getAddresses.bind(address_controller_1.default));
/**
 * POST /v1/api/parcel/addresses
 * Create a new saved address
 */
router.post('/addresses', address_controller_1.default.createAddress.bind(address_controller_1.default));
/**
 * PUT /v1/api/parcel/addresses/:id
 * Update a saved address
 */
router.put('/addresses/:id', address_controller_1.default.updateAddress.bind(address_controller_1.default));
/**
 * DELETE /v1/api/parcel/addresses/:id
 * Delete a saved address
 */
router.delete('/addresses/:id', address_controller_1.default.deleteAddress.bind(address_controller_1.default));
exports.default = router;

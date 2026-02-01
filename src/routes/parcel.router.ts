/**
 * Parcel Delivery Routes
 * API routes for parcel delivery module
 */

import { Router } from 'express';
import shipmentController from '../controllers/parcel/shipment.controller';
import addressController from '../controllers/parcel/address.controller';

const router = Router();

// ============================================
// Shipment Routes
// ============================================

/**
 * POST /v1/api/parcel/estimate
 * Estimate shipment cost
 */
router.post('/estimate', shipmentController.estimateShipment.bind(shipmentController));

/**
 * POST /v1/api/parcel/shipments
 * Create a new shipment
 */
router.post('/shipments', shipmentController.createShipment.bind(shipmentController));

/**
 * GET /v1/api/parcel/shipments/:id
 * Get shipment details by ID
 */
router.get('/shipments/:id', shipmentController.getShipment.bind(shipmentController));

/**
 * GET /v1/api/parcel/shipments
 * Get customer shipments history
 */
router.get('/shipments', shipmentController.getCustomerShipments.bind(shipmentController));

/**
 * GET /v1/api/parcel/track/:trackingNumber
 * Track shipment by tracking number
 */
router.get('/track/:trackingNumber', shipmentController.trackShipment.bind(shipmentController));

// ============================================
// Address Routes
// ============================================

/**
 * GET /v1/api/parcel/addresses
 * Get customer saved addresses
 */
router.get('/addresses', addressController.getAddresses.bind(addressController));

/**
 * POST /v1/api/parcel/addresses
 * Create a new saved address
 */
router.post('/addresses', addressController.createAddress.bind(addressController));

/**
 * PUT /v1/api/parcel/addresses/:id
 * Update a saved address
 */
router.put('/addresses/:id', addressController.updateAddress.bind(addressController));

/**
 * DELETE /v1/api/parcel/addresses/:id
 * Delete a saved address
 */
router.delete('/addresses/:id', addressController.deleteAddress.bind(addressController));

export default router;

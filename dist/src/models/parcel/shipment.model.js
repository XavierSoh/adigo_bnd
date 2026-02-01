"use strict";
/**
 * Parcel Shipment Model
 * Represents a parcel shipment in the delivery system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapParcelFrontendStatus = mapParcelFrontendStatus;
exports.mapParcelBackendStatus = mapParcelBackendStatus;
/**
 * Status Mapping Helpers
 * Convert between frontend Flutter and backend statuses
 */
function mapParcelFrontendStatus(frontendStatus) {
    const mapping = {
        'pending': 'pending',
        'confirmed': 'picked_up',
        'pickedUp': 'picked_up',
        'inTransit': 'in_transit',
        'outForDelivery': 'out_for_delivery',
        'delivered': 'delivered',
        'failed': 'failed',
        'cancelled': 'cancelled'
    };
    return mapping[frontendStatus] || 'pending';
}
function mapParcelBackendStatus(backendStatus) {
    const mapping = {
        'pending': 'pending',
        'picked_up': 'pickedUp',
        'in_transit': 'inTransit',
        'out_for_delivery': 'outForDelivery',
        'delivered': 'delivered',
        'failed': 'failed',
        'cancelled': 'cancelled'
    };
    return mapping[backendStatus] || 'pending';
}

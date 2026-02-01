"use strict";
/**
 * Food Order Model
 * Represents a food delivery order
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapFoodFrontendStatus = mapFoodFrontendStatus;
exports.mapFoodBackendStatus = mapFoodBackendStatus;
/**
 * Status Mapping Helpers
 * Convert between frontend Flutter and backend statuses
 */
function mapFoodFrontendStatus(frontendStatus) {
    const mapping = {
        'placed': 'pending',
        'confirmed': 'confirmed',
        'preparing': 'preparing',
        'ready': 'ready',
        'pickedUp': 'in_delivery',
        'delivered': 'delivered',
        'cancelled': 'cancelled'
    };
    return mapping[frontendStatus] || 'pending';
}
function mapFoodBackendStatus(backendStatus) {
    const mapping = {
        'pending': 'placed',
        'confirmed': 'confirmed',
        'preparing': 'preparing',
        'ready': 'ready',
        'in_delivery': 'pickedUp',
        'delivered': 'delivered',
        'cancelled': 'cancelled'
    };
    return mapping[backendStatus] || 'placed';
}

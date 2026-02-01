"use strict";
/**
 * VTC Ride Model (Updated with UUID)
 * Represents a ride request/booking in the VTC system
 * UPDATED: Changed all IDs from number to string (UUID)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapFrontendStatus = mapFrontendStatus;
exports.mapBackendStatus = mapBackendStatus;
// ADDED: Helper for frontend status mapping
function mapFrontendStatus(frontendStatus) {
    const mapping = {
        'pending': 'requested',
        'searching': 'requested',
        'driverFound': 'accepted',
        'driverArriving': 'arrived',
        'inProgress': 'started',
        'completed': 'completed',
        'cancelled': 'cancelled'
    };
    return mapping[frontendStatus] || 'requested';
}
function mapBackendStatus(backendStatus) {
    const mapping = {
        'requested': 'pending',
        'accepted': 'driverFound',
        'arrived': 'driverArriving',
        'started': 'inProgress',
        'completed': 'completed',
        'cancelled': 'cancelled'
    };
    return mapping[backendStatus] || 'pending';
}

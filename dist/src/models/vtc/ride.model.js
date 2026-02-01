"use strict";
/**
 * VTC Ride Model
 * Represents a ride request/booking in the VTC system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapFrontendStatus = mapFrontendStatus;
exports.mapBackendStatus = mapBackendStatus;
/**
 * Status Mapping Helpers
 * Convert between frontend Flutter and backend statuses
 */
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

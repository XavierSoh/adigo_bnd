/**
 * VTC Ride Model (Updated with UUID)
 * Represents a ride request/booking in the VTC system
 * UPDATED: Changed all IDs from number to string (UUID)
 */
export interface VtcRide {
    id: string;
    customerId: number;
    driverId?: string;
    vehicleType: 'economy' | 'comfort' | 'premium';
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    pickupTime?: Date;
    dropoffAddress: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
    dropoffTime?: Date;
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeMultiplier: number;
    totalFare: number;
    status: 'requested' | 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled';
    cancellationReason?: string;
    cancelledBy?: 'customer' | 'driver' | 'system';
    customerRating?: number;
    driverRating?: number;
    customerFeedback?: string;
    driverFeedback?: string;
    paymentMethod: string;
    paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    estimatedDistance?: number;
    actualDistance?: number;
    estimatedDuration?: number;
    actualDuration?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateRideDto {
    customerId: number;
    vehicleType: 'economy' | 'comfort' | 'premium';
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffAddress: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
    paymentMethod: string;
}
export interface RideEstimate {
    vehicleType: 'economy' | 'comfort' | 'premium';
    estimatedDistance: number;
    estimatedDuration: number;
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeMultiplier: number;
    totalFare: number;
}
export interface RateRideDto {
    rating: number;
    feedback?: string;
}
export interface CancelRideDto {
    reason: string;
    cancelledBy: 'customer' | 'driver' | 'system';
}
export declare function mapFrontendStatus(frontendStatus: string): string;
export declare function mapBackendStatus(backendStatus: string): string;

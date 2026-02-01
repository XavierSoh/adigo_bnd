/**
 * VTC Ride Tracking Model
 * Represents real-time GPS tracking for active rides
 */
export interface RideTracking {
    id: string;
    rideId: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    recordedAt: Date;
}
export interface CreateTrackingDto {
    rideId: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
}
export interface TrackingHistory {
    rideId: string;
    points: RideTracking[];
    totalDistance: number;
    averageSpeed: number;
}

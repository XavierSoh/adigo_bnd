/**
 * VTC Ride Tracking Model
 * Represents real-time GPS tracking for active rides
 */

export interface RideTracking {
  id: string;              // UUID
  rideId: string;          // UUID reference to vtc_rides
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  recordedAt: Date;
}

export interface CreateTrackingDto {
  rideId: string;          // UUID
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

export interface TrackingHistory {
  rideId: string;          // UUID
  points: RideTracking[];
  totalDistance: number;
  averageSpeed: number;
}

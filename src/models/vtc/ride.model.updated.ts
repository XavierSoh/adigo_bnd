/**
 * VTC Ride Model (Updated with UUID)
 * Represents a ride request/booking in the VTC system
 * UPDATED: Changed all IDs from number to string (UUID)
 */

export interface VtcRide {
  id: string;                      // CHANGED: number → string
  customerId: number;              // ADDED: Required for frontend
  driverId?: string;               // CHANGED: number → string
  vehicleType: 'economy' | 'comfort' | 'premium';

  // Pickup
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupTime?: Date;

  // Dropoff
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  dropoffTime?: Date;

  // Pricing
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  totalFare: number;

  // Status
  status: 'requested' | 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled';
  cancellationReason?: string;
  cancelledBy?: 'customer' | 'driver' | 'system';

  // Ratings
  customerRating?: number;
  driverRating?: number;
  customerFeedback?: string;
  driverFeedback?: string;

  // Payment
  paymentMethod: string;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

  // Tracking
  estimatedDistance?: number;
  actualDistance?: number;
  estimatedDuration?: number;
  actualDuration?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRideDto {
  customerId: number;              // ADDED
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

// ADDED: Helper for frontend status mapping
export function mapFrontendStatus(frontendStatus: string): string {
  const mapping: Record<string, string> = {
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

export function mapBackendStatus(backendStatus: string): string {
  const mapping: Record<string, string> = {
    'requested': 'pending',
    'accepted': 'driverFound',
    'arrived': 'driverArriving',
    'started': 'inProgress',
    'completed': 'completed',
    'cancelled': 'cancelled'
  };
  return mapping[backendStatus] || 'pending';
}

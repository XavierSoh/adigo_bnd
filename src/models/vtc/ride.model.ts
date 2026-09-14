/**
 * VTC Ride Model
 * Represents a ride request/booking in the VTC system
 */

export interface VtcRide {
  id: string;              // UUID
  customerId: number;      // References customer table (still integer)
  driverId?: string;       // UUID reference to vtc_drivers
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

  // Status — 'offered' (customer picked a specific driver, awaiting their
  // accept/decline — see RideService.offerToDriver) was missing from this
  // union entirely; found live 2026-09-12 auditing the module. Every real
  // access to a row's status goes through `as unknown as VtcRide` casts
  // (this interface predates the Prisma migration and was never kept
  // structurally accurate — snake_case columns, an `id: string` that's
  // really a Prisma Int, etc.), so the gap caused no runtime bug, just a
  // misleading compile-time contract.
  status: 'requested' | 'offered' | 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled';
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
  customerId: number;
  vehicleType: 'economy' | 'comfort' | 'premium';
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  paymentMethod: string;
  /** Client-generated key (a UUID) — see RideService.findByIdempotencyKey. */
  idempotencyKey?: string;
  /**
   * Set when the customer picked a specific driver from the "nearby
   * drivers" list shown at booking time (GET /vtc/drivers/nearby) instead
   * of just requesting a ride and waiting for admin to assign one.
   * RideController.createRide tries to assign it immediately after the
   * ride row exists; a miss (driver just went offline/got taken) is not a
   * booking failure, it just falls back to the normal 'requested'/
   * admin-assign queue.
   */
  driverId?: number;
  /**
   * Courses programmées — "manquements vs. Uber/Bolt/inDrive" audit,
   * 2026-09-13/14. ISO datetime, must be ≥30 minutes in the future
   * (RideController.createRide validates this). When set, the ride is
   * created `status: 'scheduled'` with `pickup_time` set to this value and
   * no driver search/offer happens yet — see
   * VtcRideExpiryService/RideService.promoteDueScheduledRides, which flips
   * it to 'requested' (the normal pipeline from there on) once it's within
   * 15 minutes of this time.
   */
  scheduledFor?: string;
  /** Codes promo — see PromoService. Re-validated server-side in the controller, never trusted as-is. */
  promoCode?: string;
  /**
   * Internal only — computed by RideController.createRide from a
   * fresh PromoService.preview() and threaded through to
   * RideService.createRide, which subtracts it from the fare it would
   * otherwise have charged. Never comes from the request body directly.
   */
  promoDiscountAmount?: number;
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
  cancelledBy: 'customer' | 'driver' | 'system' | 'admin';
}

/**
 * Valid ride status transitions, enforced by RideService.updateRideStatus.
 * No skipping a step and no going backwards — 'cancelled' is reachable from
 * any non-terminal state via the separate /cancel endpoint, not this map.
 */
export const RIDE_STATUS_TRANSITIONS: Record<string, string[]> = {
  // Promoted to 'requested' by RideService.promoteDueScheduledRides, not
  // through this generic status endpoint — listed here for documentation
  // only (see that method's own direct Prisma update).
  scheduled: ['requested'],
  requested: ['accepted'],
  accepted: ['arrived'],
  arrived: ['started'],
  started: ['completed'],
  completed: [],
  cancelled: [],
};

/**
 * Status Mapping Helpers
 * Convert between frontend Flutter and backend statuses.
 *
 * Dead code in practice — nothing calls either function; the real API
 * returns the raw `status` column untranslated, and the actual frontend
 * translation lives client-side in VTCRide._statusFromBackend
 * (adigo_mobile). Kept in sync with that mapping anyway (including the
 * 'offered' entry missing here until 2026-09-12) rather than deleted,
 * since removing dead code that accurately documents a real contract is a
 * separate call from fixing it to stop being wrong.
 */
export function mapFrontendStatus(frontendStatus: string): string {
  const mapping: Record<string, string> = {
    'pending': 'requested',
    'searching': 'requested',
    'offered': 'offered',
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
    'offered': 'offered',
    'accepted': 'driverFound',
    'arrived': 'driverArriving',
    'started': 'inProgress',
    'completed': 'completed',
    'cancelled': 'cancelled'
  };
  return mapping[backendStatus] || 'pending';
}

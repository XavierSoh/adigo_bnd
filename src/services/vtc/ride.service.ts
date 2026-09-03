/**
 * VTC Ride Service
 * Business logic for ride management
 *
 * Migrated to Prisma (see VTC_MODULE_PLAN.md) via the pg-promise-shaped
 * compat shim in prisma-compat.ts — same SQL text and $1,$2,... params as
 * before, only the call site changed (`pool.one` -> `pgOne`, `pool.tx` ->
 * `pgTransaction` with the `tx` client passed as each helper's 3rd arg), to
 * minimize the chance of a transcription mistake on this file.
 */

import { pgOne, pgAny, pgOneOrNone, pgNone, pgTransaction } from '../../utils/prisma-compat';
import {
  VtcRide,
  CreateRideDto,
  RideEstimate,
  RateRideDto,
  CancelRideDto,
  RIDE_STATUS_TRANSITIONS
} from '../../models/vtc/ride.model';

export class RideService {
  private readonly BASE_FARE_ECONOMY = 500; // FCFA
  private readonly BASE_FARE_COMFORT = 800;
  private readonly BASE_FARE_PREMIUM = 1500;
  private readonly FARE_PER_KM = 150;
  private readonly FARE_PER_MINUTE = 50;

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Estimate ride cost and duration
   */
  async estimateRide(
    pickupLat: number, pickupLon: number,
    dropoffLat: number, dropoffLon: number,
    vehicleType: 'economy' | 'comfort' | 'premium'
  ): Promise<RideEstimate> {
    const distance = this.calculateDistance(
      pickupLat, pickupLon,
      dropoffLat, dropoffLon
    );

    const duration = Math.ceil(distance / 0.5); // ~30 km/h average

    let baseFare = this.BASE_FARE_ECONOMY;
    if (vehicleType === 'comfort') baseFare = this.BASE_FARE_COMFORT;
    if (vehicleType === 'premium') baseFare = this.BASE_FARE_PREMIUM;

    const distanceFare = distance * this.FARE_PER_KM;
    const timeFare = duration * this.FARE_PER_MINUTE;

    // Check surge pricing (simplified)
    const surgeMultiplier = 1.0;

    const totalFare = Math.round(
      (baseFare + distanceFare + timeFare) * surgeMultiplier
    );

    return {
      vehicleType,
      estimatedDistance: distance,
      estimatedDuration: duration,
      baseFare,
      distanceFare: Math.round(distanceFare),
      timeFare: Math.round(timeFare),
      surgeMultiplier,
      totalFare
    };
  }

  /**
   * Create a new ride request
   */
  async createRide(data: CreateRideDto): Promise<VtcRide> {
    const estimate = await this.estimateRide(
      data.pickupLatitude, data.pickupLongitude,
      data.dropoffLatitude, data.dropoffLongitude,
      data.vehicleType
    );

    const query = `
      INSERT INTO vtc_rides (
        customer_id, vehicle_type,
        pickup_address, pickup_latitude, pickup_longitude,
        dropoff_address, dropoff_latitude, dropoff_longitude,
        base_fare, distance_fare, time_fare, surge_multiplier, total_fare,
        estimated_distance, estimated_duration,
        payment_method, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      data.customerId, data.vehicleType,
      data.pickupAddress, data.pickupLatitude, data.pickupLongitude,
      data.dropoffAddress, data.dropoffLatitude, data.dropoffLongitude,
      estimate.baseFare, estimate.distanceFare, estimate.timeFare,
      estimate.surgeMultiplier, estimate.totalFare,
      estimate.estimatedDistance, estimate.estimatedDuration,
      data.paymentMethod, 'requested'
    ];

    return pgOne(query, values);
  }

  /**
   * Get ride by ID, with driver and customer identity joined in — used by
   * both the customer-facing detail view and the admin ride detail screen.
   */
  async getRideById(rideId: number): Promise<VtcRide | null> {
    return pgOneOrNone(
      `SELECT r.*,
              d.first_name AS driver_first_name, d.last_name AS driver_last_name, d.phone AS driver_phone,
              c.first_name AS customer_first_name, c.last_name AS customer_last_name, c.phone AS customer_phone
       FROM vtc_rides r
       LEFT JOIN vtc_drivers d ON d.id = r.driver_id
       LEFT JOIN customer c ON c.id = r.customer_id
       WHERE r.id = $1`,
      [rideId]
    );
  }

  /**
   * Get customer rides
   */
  async getCustomerRides(customerId: number): Promise<VtcRide[]> {
    return pgAny(
      `SELECT * FROM vtc_rides
       WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [customerId]
    );
  }

  /**
   * List rides for the admin dashboard — there is no automatic
   * driver-matching yet, so this is how staff find rides that need a
   * driver assigned by hand. Joins both the driver AND the customer: the
   * admin desktop previously showed only the driver's name, leaving staff
   * with no way to identify who actually booked a ride.
   */
  async getAllRides(status?: string, customerId?: number, driverId?: number): Promise<VtcRide[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }
    if (customerId) {
      params.push(customerId);
      conditions.push(`r.customer_id = $${params.length}`);
    }
    if (driverId) {
      params.push(driverId);
      conditions.push(`r.driver_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = conditions.length ? '' : 'LIMIT 200';

    return pgAny(
      `SELECT r.*,
              d.first_name AS driver_first_name, d.last_name AS driver_last_name, d.phone AS driver_phone,
              c.first_name AS customer_first_name, c.last_name AS customer_last_name, c.phone AS customer_phone
       FROM vtc_rides r
       LEFT JOIN vtc_drivers d ON d.id = r.driver_id
       LEFT JOIN customer c ON c.id = r.customer_id
       ${where}
       ORDER BY r.created_at DESC
       ${limit}`,
      params
    );
  }

  /**
   * Manually assign a driver to a ride (admin action — no automatic
   * matching exists). Only succeeds while the ride is still 'requested',
   * so two staff members racing to assign the same ride can't both win.
   * Also flips the driver to 'busy' — previously left 'online', which meant
   * nothing stopped the same driver being assigned to a second ride at the
   * same time.
   */
  async assignDriver(rideId: number, driverId: number): Promise<VtcRide | null> {
    return pgTransaction(async (tx) => {
      const ride = await pgOneOrNone(
        `UPDATE vtc_rides
         SET driver_id = $1, status = 'accepted'
         WHERE id = $2 AND status = 'requested'
         RETURNING *`,
        [driverId, rideId],
        tx
      );
      if (ride) {
        await pgNone(`UPDATE vtc_drivers SET status = 'busy' WHERE id = $1`, [driverId], tx);
      }
      return ride;
    });
  }

  /**
   * Advance a ride to the next status in its lifecycle (accepted → arrived →
   * started → completed). Rejects skipped/backwards transitions. Completing
   * a ride frees the driver back to 'online' — mirrors the 'busy' flip in
   * assignDriver.
   */
  async updateRideStatus(rideId: number, newStatus: string): Promise<VtcRide | null> {
    return pgTransaction(async (tx) => {
      const current = await pgOneOrNone<VtcRide & { driver_id: number | null }>(
        `SELECT status, driver_id FROM vtc_rides WHERE id = $1`,
        [rideId],
        tx
      );
      if (!current) return null;

      const allowed = RIDE_STATUS_TRANSITIONS[current.status] || [];
      if (!allowed.includes(newStatus)) {
        throw new Error(
          `Transition invalide : ${current.status} → ${newStatus}`
        );
      }

      const dropoffClause = newStatus === 'completed' ? `, dropoff_time = CURRENT_TIMESTAMP` : '';
      const ride = await pgOne(
        `UPDATE vtc_rides SET status = $1 ${dropoffClause} WHERE id = $2 RETURNING *`,
        [newStatus, rideId],
        tx
      );

      if (newStatus === 'completed' && current.driver_id) {
        await pgNone(`UPDATE vtc_drivers SET status = 'online' WHERE id = $1`, [current.driver_id], tx);
      }

      return ride;
    });
  }

  /**
   * Cancel a ride. Also frees the assigned driver back to 'online' — same
   * reasoning as completing a ride.
   */
  async cancelRide(rideId: number, data: CancelRideDto): Promise<VtcRide | null> {
    return pgTransaction(async (tx) => {
      const ride = await pgOneOrNone(
        `UPDATE vtc_rides
         SET status = 'cancelled',
             cancellation_reason = $1,
             cancelled_by = $2
         WHERE id = $3 AND status != 'cancelled'
         RETURNING *`,
        [data.reason, data.cancelledBy, rideId],
        tx
      );
      if (ride && ride.driver_id) {
        await pgNone(`UPDATE vtc_drivers SET status = 'online' WHERE id = $1`, [ride.driver_id], tx);
      }
      return ride;
    });
  }

  /**
   * Mark a ride's payment as completed — called right after a successful
   * wallet debit in the controller (createRide charges the wallet after the
   * row already exists, so this is a separate step rather than part of the
   * INSERT).
   */
  async markPaymentCompleted(rideId: number): Promise<VtcRide | null> {
    return pgOneOrNone(
      `UPDATE vtc_rides SET payment_status = 'completed' WHERE id = $1 RETURNING *`,
      [rideId]
    );
  }

  /**
   * Rate a ride
   */
  async rateRide(
    rideId: number,
    ratedBy: 'customer' | 'driver',
    data: RateRideDto
  ): Promise<VtcRide | null> {
    const field = ratedBy === 'customer' ? 'driver_rating' : 'customer_rating';
    const feedbackField = ratedBy === 'customer'
      ? 'driver_feedback'
      : 'customer_feedback';

    return pgOneOrNone(
      `UPDATE vtc_rides
       SET ${field} = $1, ${feedbackField} = $2
       WHERE id = $3
       RETURNING *`,
      [data.rating, data.feedback, rideId]
    );
  }
}

export default new RideService();

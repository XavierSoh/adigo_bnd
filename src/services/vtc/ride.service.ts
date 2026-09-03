/**
 * VTC Ride Service
 * Business logic for ride management
 *
 * Migrated to Prisma's native model API (prisma.vtc_rides.*) — see
 * BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration",
 * tier 4) and VTC_MODULE_PLAN.md.
 */

import { Prisma } from '@prisma/client';
import prismaDb from '../../config/prismaClient';
import {
  VtcRide,
  CreateRideDto,
  RideEstimate,
  RateRideDto,
  CancelRideDto,
  RIDE_STATUS_TRANSITIONS
} from '../../models/vtc/ride.model';

const rideWithJoins = {
  vtc_drivers: { select: { first_name: true, last_name: true, phone: true } },
  customer: { select: { first_name: true, last_name: true, phone: true } },
} satisfies Prisma.vtc_ridesInclude;

function mapRide<T extends { vtc_drivers: { first_name: string; last_name: string; phone: string } | null; customer: { first_name: string; last_name: string; phone: string } }>(row: T) {
  const { vtc_drivers, customer, ...rest } = row;
  return {
    ...rest,
    driver_first_name: vtc_drivers?.first_name ?? null,
    driver_last_name: vtc_drivers?.last_name ?? null,
    driver_phone: vtc_drivers?.phone ?? null,
    customer_first_name: customer.first_name,
    customer_last_name: customer.last_name,
    customer_phone: customer.phone,
  };
}

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

    const result = await prismaDb.vtc_rides.create({
      data: {
        customer_id: data.customerId,
        vehicle_type: data.vehicleType,
        pickup_address: data.pickupAddress,
        pickup_latitude: data.pickupLatitude,
        pickup_longitude: data.pickupLongitude,
        dropoff_address: data.dropoffAddress,
        dropoff_latitude: data.dropoffLatitude,
        dropoff_longitude: data.dropoffLongitude,
        base_fare: estimate.baseFare,
        distance_fare: estimate.distanceFare,
        time_fare: estimate.timeFare,
        surge_multiplier: estimate.surgeMultiplier,
        total_fare: estimate.totalFare,
        estimated_distance: estimate.estimatedDistance,
        estimated_duration: estimate.estimatedDuration,
        payment_method: data.paymentMethod,
        status: 'requested',
      } as Prisma.vtc_ridesUncheckedCreateInput,
    });

    return result as unknown as VtcRide;
  }

  /**
   * Get ride by ID, with driver and customer identity joined in — used by
   * both the customer-facing detail view and the admin ride detail screen.
   */
  async getRideById(rideId: number): Promise<VtcRide | null> {
    const row = await prismaDb.vtc_rides.findUnique({ where: { id: rideId }, include: rideWithJoins });
    return row ? (mapRide(row) as unknown as VtcRide) : null;
  }

  /**
   * Get customer rides
   */
  async getCustomerRides(customerId: number): Promise<VtcRide[]> {
    const rows = await prismaDb.vtc_rides.findMany({
      where: { customer_id: customerId },
      orderBy: { created_at: 'desc' },
    });
    return rows as unknown as VtcRide[];
  }

  /**
   * List rides for the admin dashboard — there is no automatic
   * driver-matching yet, so this is how staff find rides that need a
   * driver assigned by hand. Joins both the driver AND the customer: the
   * admin desktop previously showed only the driver's name, leaving staff
   * with no way to identify who actually booked a ride.
   */
  async getAllRides(status?: string, customerId?: number, driverId?: number): Promise<VtcRide[]> {
    const where: Prisma.vtc_ridesWhereInput = {};
    if (status) where.status = status;
    if (customerId) where.customer_id = customerId;
    if (driverId) where.driver_id = driverId;

    const hasFilters = Object.keys(where).length > 0;

    const rows = await prismaDb.vtc_rides.findMany({
      where,
      include: rideWithJoins,
      orderBy: { created_at: 'desc' },
      ...(hasFilters ? {} : { take: 200 }),
    });
    return rows.map((r) => mapRide(r) as unknown as VtcRide);
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
    return prismaDb.$transaction(async (tx) => {
      const updateResult = await tx.vtc_rides.updateMany({
        where: { id: rideId, status: 'requested' },
        data: { driver_id: driverId, status: 'accepted' },
      });
      if (updateResult.count === 0) return null;

      await tx.vtc_drivers.update({ where: { id: driverId }, data: { status: 'busy' } });

      return await tx.vtc_rides.findUnique({ where: { id: rideId } }) as unknown as VtcRide;
    });
  }

  /**
   * Advance a ride to the next status in its lifecycle (accepted → arrived →
   * started → completed). Rejects skipped/backwards transitions. Completing
   * a ride frees the driver back to 'online' — mirrors the 'busy' flip in
   * assignDriver.
   */
  async updateRideStatus(rideId: number, newStatus: string): Promise<VtcRide | null> {
    return prismaDb.$transaction(async (tx) => {
      const current = await tx.vtc_rides.findUnique({
        where: { id: rideId },
        select: { status: true, driver_id: true },
      });
      if (!current) return null;

      const allowed = RIDE_STATUS_TRANSITIONS[current.status ?? ''] || [];
      if (!allowed.includes(newStatus)) {
        throw new Error(
          `Transition invalide : ${current.status} → ${newStatus}`
        );
      }

      const ride = await tx.vtc_rides.update({
        where: { id: rideId },
        data: {
          status: newStatus,
          ...(newStatus === 'completed' ? { dropoff_time: new Date() } : {}),
        },
      });

      if (newStatus === 'completed' && current.driver_id) {
        await tx.vtc_drivers.update({ where: { id: current.driver_id }, data: { status: 'online' } });
      }

      return ride as unknown as VtcRide;
    });
  }

  /**
   * Cancel a ride. Also frees the assigned driver back to 'online' — same
   * reasoning as completing a ride.
   */
  async cancelRide(rideId: number, data: CancelRideDto): Promise<VtcRide | null> {
    return prismaDb.$transaction(async (tx) => {
      const updateResult = await tx.vtc_rides.updateMany({
        where: { id: rideId, status: { not: 'cancelled' } },
        data: { status: 'cancelled', cancellation_reason: data.reason, cancelled_by: data.cancelledBy },
      });
      if (updateResult.count === 0) return null;

      const ride = await tx.vtc_rides.findUnique({ where: { id: rideId } });
      if (ride?.driver_id) {
        await tx.vtc_drivers.update({ where: { id: ride.driver_id }, data: { status: 'online' } });
      }
      return ride as unknown as VtcRide;
    });
  }

  /**
   * Mark a ride's payment as completed — called right after a successful
   * wallet debit in the controller (createRide charges the wallet after the
   * row already exists, so this is a separate step rather than part of the
   * INSERT).
   */
  async markPaymentCompleted(rideId: number): Promise<VtcRide | null> {
    const result = await prismaDb.vtc_rides.updateMany({
      where: { id: rideId },
      data: { payment_status: 'completed' },
    });
    if (result.count === 0) return null;
    return await prismaDb.vtc_rides.findUnique({ where: { id: rideId } }) as unknown as VtcRide;
  }

  /**
   * Rate a ride
   */
  async rateRide(
    rideId: number,
    ratedBy: 'customer' | 'driver',
    data: RateRideDto
  ): Promise<VtcRide | null> {
    const update: Prisma.vtc_ridesUncheckedUpdateInput = ratedBy === 'customer'
      ? { driver_rating: data.rating, driver_feedback: data.feedback }
      : { customer_rating: data.rating, customer_feedback: data.feedback };

    const result = await prismaDb.vtc_rides.updateMany({ where: { id: rideId }, data: update });
    if (result.count === 0) return null;
    return await prismaDb.vtc_rides.findUnique({ where: { id: rideId } }) as unknown as VtcRide;
  }
}

export default new RideService();

/**
 * VTC Ride Tracking Service
 *
 * Reads/writes `vtc_ride_tracking`. This table existed in the schema since
 * the VTC module's first migration but nothing ever wrote to or read from
 * it — the "live tracking" shown anywhere in the apps was a client-side
 * mock. This is the real implementation (see VTC_MODULE_PLAN.md, Phase 0.3).
 *
 * Migrated to Prisma's native model API (prisma.vtc_ride_tracking.*) — see
 * BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration",
 * tier 4) and VTC_MODULE_PLAN.md.
 */

import prismaDb from '../../config/prismaClient';
import { RideTracking, CreateTrackingDto, TrackingHistory } from '../../models/vtc/tracking.model';

export class TrackingService {
  /**
   * Record one GPS point for an active ride. Also mirrors it onto
   * vtc_drivers.current_latitude/longitude so /drivers/nearby and the admin
   * driver list stay current — one GPS ping now feeds both.
   */
  async recordPoint(rideId: number, data: CreateTrackingDto): Promise<RideTracking> {
    return prismaDb.$transaction(async (tx) => {
      const point = await tx.vtc_ride_tracking.create({
        data: {
          ride_id: rideId,
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading ?? null,
          speed: data.speed ?? null,
        },
      });

      const ride = await tx.vtc_rides.findUnique({ where: { id: rideId }, select: { driver_id: true } });
      if (ride?.driver_id) {
        await tx.vtc_drivers.update({
          where: { id: ride.driver_id },
          data: { current_latitude: data.latitude, current_longitude: data.longitude, last_location_update: new Date() },
        });
      }

      return point as unknown as RideTracking;
    });
  }

  /** Full point history for a ride, oldest first — used to replay a trip's track. */
  async getHistory(rideId: number): Promise<TrackingHistory> {
    const points = await prismaDb.vtc_ride_tracking.findMany({
      where: { ride_id: rideId },
      orderBy: { recorded_at: 'asc' },
    });

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += this.haversineKm(
        Number(points[i - 1].latitude), Number(points[i - 1].longitude),
        Number(points[i].latitude), Number(points[i].longitude)
      );
    }

    const speeds = points.map((p) => p.speed).filter((s): s is NonNullable<typeof s> => s != null).map(Number);
    const averageSpeed = speeds.length
      ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length
      : 0;

    return { rideId: String(rideId), points: points as unknown as RideTracking[], totalDistance, averageSpeed };
  }

  /** Most recent point for a ride, or null if nothing has been recorded yet. */
  async getLatest(rideId: number): Promise<RideTracking | null> {
    const point = await prismaDb.vtc_ride_tracking.findFirst({
      where: { ride_id: rideId },
      orderBy: { recorded_at: 'desc' },
    });
    return point as unknown as RideTracking | null;
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

export default new TrackingService();

/**
 * VTC Ride Tracking Service
 *
 * Reads/writes `vtc_ride_tracking`. This table existed in the schema since
 * the VTC module's first migration but nothing ever wrote to or read from
 * it — the "live tracking" shown anywhere in the apps was a client-side
 * mock. This is the real implementation (see VTC_MODULE_PLAN.md, Phase 0.3).
 *
 * Migrated to Prisma via the pg-promise-shaped compat shim in
 * prisma-compat.ts — same SQL/params, `pool.tx` -> `pgTransaction`.
 */

import { pgOne, pgAny, pgOneOrNone, pgNone, pgTransaction } from '../../utils/prisma-compat';
import { RideTracking, CreateTrackingDto, TrackingHistory } from '../../models/vtc/tracking.model';

export class TrackingService {
  /**
   * Record one GPS point for an active ride. Also mirrors it onto
   * vtc_drivers.current_latitude/longitude so /drivers/nearby and the admin
   * driver list stay current — one GPS ping now feeds both.
   */
  async recordPoint(rideId: number, data: CreateTrackingDto): Promise<RideTracking> {
    return pgTransaction(async (tx) => {
      const point = await pgOne(
        `INSERT INTO vtc_ride_tracking (ride_id, latitude, longitude, heading, speed)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [rideId, data.latitude, data.longitude, data.heading ?? null, data.speed ?? null],
        tx
      );

      const ride = await pgOneOrNone(`SELECT driver_id FROM vtc_rides WHERE id = $1`, [rideId], tx);
      if (ride?.driver_id) {
        await pgNone(
          `UPDATE vtc_drivers
           SET current_latitude = $1, current_longitude = $2, last_location_update = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [data.latitude, data.longitude, ride.driver_id],
          tx
        );
      }

      return point;
    });
  }

  /** Full point history for a ride, oldest first — used to replay a trip's track. */
  async getHistory(rideId: number): Promise<TrackingHistory> {
    const points: RideTracking[] = await pgAny(
      `SELECT * FROM vtc_ride_tracking WHERE ride_id = $1 ORDER BY recorded_at ASC`,
      [rideId]
    );

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += this.haversineKm(
        points[i - 1].latitude, points[i - 1].longitude,
        points[i].latitude, points[i].longitude
      );
    }

    const speeds = points.map((p) => p.speed).filter((s): s is number => s != null);
    const averageSpeed = speeds.length
      ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length
      : 0;

    return { rideId: String(rideId), points, totalDistance, averageSpeed };
  }

  /** Most recent point for a ride, or null if nothing has been recorded yet. */
  async getLatest(rideId: number): Promise<RideTracking | null> {
    return pgOneOrNone(
      `SELECT * FROM vtc_ride_tracking WHERE ride_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [rideId]
    );
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

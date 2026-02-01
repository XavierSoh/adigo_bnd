/**
 * VTC Driver Service
 * Business logic for driver management
 */

import pool from '../../config/database';
import {
  VtcDriver,
  CreateDriverDto,
  UpdateDriverLocationDto,
  DriverStatus
} from '../../models/vtc/driver.model';

export class DriverService {
  /**
   * Get nearby drivers
   */
  async getNearbyDrivers(
    latitude: number,
    longitude: number,
    vehicleType?: string,
    radiusKm: number = 5
  ): Promise<VtcDriver[]> {
    let query = `
      SELECT *,
        (6371 * acos(
          cos(radians($1)) * cos(radians(current_latitude)) *
          cos(radians(current_longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(current_latitude))
        )) AS distance
      FROM vtc_drivers
      WHERE status = 'online'
        AND current_latitude IS NOT NULL
        AND current_longitude IS NOT NULL
    `;

    const params: any[] = [latitude, longitude];

    if (vehicleType) {
      query += ` AND vehicle_type = $3`;
      params.push(vehicleType);
      query += ` HAVING distance < $4`;
      params.push(radiusKm);
    } else {
      query += ` HAVING distance < $3`;
      params.push(radiusKm);
    }

    query += ` ORDER BY distance ASC LIMIT 10`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Update driver location
   */
  async updateDriverLocation(
    driverId: number,
    data: UpdateDriverLocationDto
  ): Promise<VtcDriver> {
    const query = `
      UPDATE vtc_drivers
      SET current_latitude = $1,
          current_longitude = $2,
          last_location_update = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [
      data.latitude, data.longitude, driverId
    ]);
    return result.rows[0];
  }

  /**
   * Update driver status
   */
  async updateDriverStatus(
    driverId: number,
    status: 'online' | 'offline' | 'busy' | 'suspended'
  ): Promise<VtcDriver> {
    const query = `
      UPDATE vtc_drivers
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [status, driverId]);
    return result.rows[0];
  }

  /**
   * Get driver by ID
   */
  async getDriverById(driverId: number): Promise<VtcDriver | null> {
    const query = 'SELECT * FROM vtc_drivers WHERE id = $1';
    const result = await pool.query(query, [driverId]);
    return result.rows[0] || null;
  }
}

export default new DriverService();

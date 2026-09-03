/**
 * VTC Driver Service
 * Business logic for driver management
 */

import { pgOne, pgAny, pgOneOrNone } from '../../utils/prisma-compat';
import {
  VtcDriver,
  CreateDriverDto,
  UpdateDriverLocationDto,
  UpdateDriverDto,
} from '../../models/vtc/driver.model';

/**
 * Migrated to Prisma (see VTC_MODULE_PLAN.md) via the pg-promise-shaped
 * compat shim in prisma-compat.ts — same SQL text and $1,$2,... params as
 * before, only the call site (`pool.one` -> `pgOne`, etc.) changed, to
 * minimize the chance of a transcription mistake on this file.
 */
export class DriverService {
  /**
   * Create a driver record. There is no driver-facing app yet — drivers are
   * onboarded by an admin (see adigo2 dashboard) until real self-signup exists.
   */
  async createDriver(data: CreateDriverDto): Promise<VtcDriver> {
    const query = `
      INSERT INTO vtc_drivers (
        user_id, first_name, last_name, phone, email, photo,
        license_number, license_expiry,
        vehicle_type, vehicle_brand, vehicle_model, vehicle_year, vehicle_color, license_plate, seats,
        insurance_number, insurance_expiry, registration_document, vehicle_photos,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'offline')
      RETURNING *
    `;
    return pgOne(query, [
      data.userId ?? null,
      data.firstName,
      data.lastName,
      data.phone,
      data.email ?? null,
      data.photo ?? null,
      data.licenseNumber,
      data.licenseExpiry,
      data.vehicleType,
      data.vehicleBrand ?? null,
      data.vehicleModel ?? null,
      data.vehicleYear ?? null,
      data.vehicleColor ?? null,
      data.licensePlate,
      data.seats ?? 4,
      data.insuranceNumber ?? null,
      data.insuranceExpiry ?? null,
      data.registrationDocument ?? null,
      data.vehiclePhotos ?? null,
    ]);
  }

  /** List drivers for the admin dashboard (optionally filtered by status). */
  async getAllDrivers(status?: string): Promise<VtcDriver[]> {
    if (status) {
      return pgAny(
        `SELECT * FROM vtc_drivers WHERE status = $1 ORDER BY first_name, last_name`,
        [status]
      );
    }
    return pgAny(`SELECT * FROM vtc_drivers ORDER BY first_name, last_name`);
  }

  /** Update driver profile fields (admin only). */
  async updateDriver(driverId: number, data: UpdateDriverDto): Promise<VtcDriver | null> {
    const query = `
      UPDATE vtc_drivers SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        photo = COALESCE($5, photo),
        license_number = COALESCE($6, license_number),
        license_expiry = COALESCE($7, license_expiry),
        vehicle_type = COALESCE($8, vehicle_type),
        vehicle_brand = COALESCE($9, vehicle_brand),
        vehicle_model = COALESCE($10, vehicle_model),
        vehicle_year = COALESCE($11, vehicle_year),
        vehicle_color = COALESCE($12, vehicle_color),
        license_plate = COALESCE($13, license_plate),
        seats = COALESCE($14, seats),
        insurance_number = COALESCE($15, insurance_number),
        insurance_expiry = COALESCE($16, insurance_expiry),
        registration_document = COALESCE($17, registration_document),
        vehicle_photos = COALESCE($18, vehicle_photos),
        status = COALESCE($19, status)
      WHERE id = $20
      RETURNING *
    `;
    return pgOneOrNone(query, [
      data.firstName ?? null,
      data.lastName ?? null,
      data.phone ?? null,
      data.email ?? null,
      data.photo ?? null,
      data.licenseNumber ?? null,
      data.licenseExpiry ?? null,
      data.vehicleType ?? null,
      data.vehicleBrand ?? null,
      data.vehicleModel ?? null,
      data.vehicleYear ?? null,
      data.vehicleColor ?? null,
      data.licensePlate ?? null,
      data.seats ?? null,
      data.insuranceNumber ?? null,
      data.insuranceExpiry ?? null,
      data.registrationDocument ?? null,
      data.vehiclePhotos ?? null,
      data.status ?? null,
      driverId,
    ]);
  }

  /**
   * Get nearby drivers
   */
  async getNearbyDrivers(
    latitude: number,
    longitude: number,
    vehicleType?: string,
    radiusKm: number = 5
  ): Promise<VtcDriver[]> {
    // `distance` is a computed alias — Postgres doesn't allow filtering on
    // a SELECT-list alias via HAVING without GROUP BY ("column distance
    // does not exist", found by actually exercising this endpoint while
    // migrating this file to Prisma; this bug pre-dates that migration,
    // this query had just never been exercised with real matching rows
    // before). Wrapped in a subquery so the outer WHERE can filter on the
    // now-real `distance` column.
    let query = `
      SELECT * FROM (
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
      query += ` ) nearby WHERE distance < $4`;
      params.push(radiusKm);
    } else {
      query += ` ) nearby WHERE distance < $3`;
      params.push(radiusKm);
    }

    query += ` ORDER BY distance ASC LIMIT 10`;

    return pgAny(query, params);
  }

  /**
   * Update driver location
   */
  async updateDriverLocation(
    driverId: number,
    data: UpdateDriverLocationDto
  ): Promise<VtcDriver | null> {
    return pgOneOrNone(
      `UPDATE vtc_drivers
       SET current_latitude = $1,
           current_longitude = $2,
           last_location_update = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [data.latitude, data.longitude, driverId]
    );
  }

  /**
   * Update driver status
   */
  async updateDriverStatus(
    driverId: number,
    status: 'online' | 'offline' | 'busy' | 'suspended'
  ): Promise<VtcDriver | null> {
    return pgOneOrNone(
      `UPDATE vtc_drivers SET status = $1 WHERE id = $2 RETURNING *`,
      [status, driverId]
    );
  }

  /**
   * Get driver by ID
   */
  async getDriverById(driverId: number): Promise<VtcDriver | null> {
    return pgOneOrNone('SELECT * FROM vtc_drivers WHERE id = $1', [driverId]);
  }
}

export default new DriverService();

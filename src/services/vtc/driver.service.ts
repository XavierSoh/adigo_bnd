/**
 * VTC Driver Service
 * Business logic for driver management
 */

// Migrated to Prisma's native model API (prisma.vtc_drivers.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration",
// tier 4) and VTC_MODULE_PLAN.md.
import { Prisma } from '@prisma/client';
import prismaDb from '../../config/prismaClient';
import {
  VtcDriver,
  CreateDriverDto,
  UpdateDriverLocationDto,
  UpdateDriverDto,
} from '../../models/vtc/driver.model';

export class DriverService {
  /**
   * Create a driver record. There is no driver-facing app yet — drivers are
   * onboarded by an admin (see adigo2 dashboard) until real self-signup exists.
   */
  async createDriver(data: CreateDriverDto): Promise<VtcDriver> {
    const result = await prismaDb.vtc_drivers.create({
      data: {
        user_id: data.userId ?? null,
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        email: data.email ?? null,
        photo: data.photo ?? null,
        license_number: data.licenseNumber,
        // SCHEMA/DRIVER DISCREPANCY FLAGGED, not silently absorbed:
        // `licenseExpiry`/`insuranceExpiry` are typed `Date` here, but a
        // multipart form body (this endpoint's real caller — see
        // vtc.router.ts's `driverDocumentsUpload` middleware) always
        // delivers plain strings like "2030-01-01" regardless of the TS
        // type. The old pg-promise-shaped shim passed that straight to
        // Postgres, which parses a bare date literal for a `@db.Date`
        // column fine. Prisma's own argument validation is stricter and
        // rejects a non-ISO-8601 string outright ("premature end of
        // input") — confirmed live, not assumed. `new Date(...)` fixes
        // it and is a no-op if a real Date object is already passed.
        license_expiry: new Date(data.licenseExpiry),
        vehicle_type: data.vehicleType,
        vehicle_brand: data.vehicleBrand ?? null,
        vehicle_model: data.vehicleModel ?? null,
        vehicle_year: data.vehicleYear ?? null,
        vehicle_color: data.vehicleColor ?? null,
        license_plate: data.licensePlate,
        seats: data.seats ?? 4,
        insurance_number: data.insuranceNumber ?? null,
        insurance_expiry: data.insuranceExpiry != null ? new Date(data.insuranceExpiry) : null,
        registration_document: data.registrationDocument ?? null,
        vehicle_photos: data.vehiclePhotos ?? undefined,
        status: 'offline',
      } as Prisma.vtc_driversUncheckedCreateInput,
    });
    return result as unknown as VtcDriver;
  }

  /** List drivers for the admin dashboard (optionally filtered by status). */
  async getAllDrivers(status?: string): Promise<VtcDriver[]> {
    const rows = await prismaDb.vtc_drivers.findMany({
      where: status ? { status } : {},
      orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    });
    return rows as unknown as VtcDriver[];
  }

  /** Update driver profile fields (admin only). */
  async updateDriver(driverId: number, data: UpdateDriverDto): Promise<VtcDriver | null> {
    const update: Prisma.vtc_driversUncheckedUpdateInput = {};
    if (data.firstName != null) update.first_name = data.firstName;
    if (data.lastName != null) update.last_name = data.lastName;
    if (data.phone != null) update.phone = data.phone;
    if (data.email != null) update.email = data.email;
    if (data.photo != null) update.photo = data.photo;
    if (data.licenseNumber != null) update.license_number = data.licenseNumber;
    if (data.licenseExpiry != null) update.license_expiry = new Date(data.licenseExpiry);
    if (data.vehicleType != null) update.vehicle_type = data.vehicleType;
    if (data.vehicleBrand != null) update.vehicle_brand = data.vehicleBrand;
    if (data.vehicleModel != null) update.vehicle_model = data.vehicleModel;
    if (data.vehicleYear != null) update.vehicle_year = data.vehicleYear;
    if (data.vehicleColor != null) update.vehicle_color = data.vehicleColor;
    if (data.licensePlate != null) update.license_plate = data.licensePlate;
    if (data.seats != null) update.seats = data.seats;
    if (data.insuranceNumber != null) update.insurance_number = data.insuranceNumber;
    if (data.insuranceExpiry != null) update.insurance_expiry = new Date(data.insuranceExpiry);
    if (data.registrationDocument != null) update.registration_document = data.registrationDocument;
    if (data.vehiclePhotos != null) update.vehicle_photos = data.vehiclePhotos;
    if (data.status != null) update.status = data.status;

    try {
      const result = await prismaDb.vtc_drivers.update({ where: { id: driverId }, data: update });
      return result as unknown as VtcDriver;
    } catch (error) {
      // Original used `pgOneOrNone` — returns null on a missing row
      // instead of throwing.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
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
    // The Haversine-ish spherical-law-of-cosines distance calculation has
    // no equivalent in the model API (no trig functions in `where`) — not
    // reached for $queryRaw; fetches every online driver with a known
    // position (a bounded, small set in practice) and computes the exact
    // same formula in JS instead, matching the original SQL term-for-term
    // (not substituted for a numerically-different haversine variant).
    const candidates = await prismaDb.vtc_drivers.findMany({
      where: {
        status: 'online',
        current_latitude: { not: null },
        current_longitude: { not: null },
        ...(vehicleType ? { vehicle_type: vehicleType } : {}),
      },
    });

    const rad = (d: number) => (d * Math.PI) / 180;
    const withDistance = candidates.map((driver) => {
      const lat2 = Number(driver.current_latitude);
      const lon2 = Number(driver.current_longitude);
      const distance = 6371 * Math.acos(
        Math.cos(rad(latitude)) * Math.cos(rad(lat2)) *
        Math.cos(rad(lon2) - rad(longitude)) +
        Math.sin(rad(latitude)) * Math.sin(rad(lat2))
      );
      return { ...driver, distance };
    });

    return withDistance
      .filter((d) => d.distance < radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10) as unknown as VtcDriver[];
  }

  /**
   * Update driver location
   */
  async updateDriverLocation(
    driverId: number,
    data: UpdateDriverLocationDto
  ): Promise<VtcDriver | null> {
    try {
      const result = await prismaDb.vtc_drivers.update({
        where: { id: driverId },
        data: { current_latitude: data.latitude, current_longitude: data.longitude, last_location_update: new Date() },
      });
      return result as unknown as VtcDriver;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update driver status
   */
  async updateDriverStatus(
    driverId: number,
    status: 'online' | 'offline' | 'busy' | 'suspended'
  ): Promise<VtcDriver | null> {
    try {
      const result = await prismaDb.vtc_drivers.update({ where: { id: driverId }, data: { status } });
      return result as unknown as VtcDriver;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get driver by ID
   */
  async getDriverById(driverId: number): Promise<VtcDriver | null> {
    const result = await prismaDb.vtc_drivers.findUnique({ where: { id: driverId } });
    return result as unknown as VtcDriver | null;
  }
}

export default new DriverService();

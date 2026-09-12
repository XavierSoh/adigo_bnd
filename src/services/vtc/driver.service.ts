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
  DriverReview,
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
    // Was settable only at creation — UpdateDriverDto declared `userId` but
    // nothing here ever read it, so an existing driver (onboarded before
    // they had a mobile account, or before Phase 2 existed at all) could
    // never be linked to a customer login afterwards. Needed for driver
    // mode (VTC_MODULE_PLAN.md Phase 2): a driver signs in through the
    // existing customer/mobile login, resolved via this same column.
    if (data.userId != null) update.user_id = data.userId;
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
    radiusKm: number = 8
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

    const withDistance = candidates.map((driver) => ({
      ...driver,
      distance: this.sphericalDistanceKm(
        latitude, longitude,
        Number(driver.current_latitude), Number(driver.current_longitude)
      ),
    }));

    return withDistance
      .filter((d) => d.distance < radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10) as unknown as VtcDriver[];
  }

  /**
   * Spherical law-of-cosines distance in km — same formula `getNearbyDrivers`
   * already used inline, extracted so `getDriverProfile`'s "temps d'arrivée
   * estimé" can reuse the exact same numbers rather than a second,
   * numerically-different haversine variant.
   */
  private sphericalDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const rad = (d: number) => (d * Math.PI) / 180;
    return 6371 * Math.acos(
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) *
      Math.cos(rad(lon2) - rad(lon1)) +
      Math.sin(rad(lat1)) * Math.sin(rad(lat2))
    );
  }

  /**
   * Everything the "choisir son chauffeur" detail view needs beyond the
   * plain driver row: recent reviews (real ones — the customer's own
   * `customer_feedback`/`customer_rating` left on past completed rides with
   * this driver, nothing fabricated), and — if the customer's pickup point
   * is known — a rough ETA from the driver's last known position to that
   * pickup, using the same distance formula and ~30km/h average-speed
   * assumption `RideService.estimateRide` already uses for trip duration
   * (not a real routing engine call — consistent with how every other
   * "preview" number on the booking screen is computed, see
   * VehicleTypeSelector's doc comment).
   */
  async getDriverProfile(
    driverId: number,
    pickupLat?: number,
    pickupLon?: number
  ): Promise<{ driver: VtcDriver; reviews: DriverReview[]; etaMinutes: number | null; etaDistanceKm: number | null } | null> {
    const driver = await this.getDriverById(driverId);
    if (!driver) return null;

    const reviews = await this.getDriverReviews(driverId);

    let etaMinutes: number | null = null;
    let etaDistanceKm: number | null = null;
    const driverAny = driver as any;
    if (
      pickupLat != null && pickupLon != null &&
      driverAny.current_latitude != null && driverAny.current_longitude != null
    ) {
      etaDistanceKm = this.sphericalDistanceKm(
        pickupLat, pickupLon,
        Number(driverAny.current_latitude), Number(driverAny.current_longitude)
      );
      etaMinutes = Math.ceil(etaDistanceKm / 0.5); // ~30 km/h average
    }

    return { driver, reviews, etaMinutes, etaDistanceKm };
  }

  /**
   * Real reviews about this driver — the `driver_feedback`/`driver_rating`
   * a rider actually left on a past *completed* ride with them, most recent
   * first. Counter-intuitive naming inherited from RideService.rateRide:
   * `driver_rating`/`driver_feedback` is the rating *of* the driver (set
   * when `ratedBy === 'customer'`), while `customer_rating`/
   * `customer_feedback` is the rating *of* the customer (set by the
   * driver) — got this backwards on the first pass, confirmed live
   * 2026-09-09 testing the full ride lifecycle (a customer's 5-star rating
   * landed in `driver_rating`, not `customer_rating`). Never fabricated: an
   * empty array here means the driver genuinely has no reviews on file yet,
   * shown as such rather than invented placeholder testimonials.
   */
  async getDriverReviews(driverId: number, limit: number = 10): Promise<DriverReview[]> {
    const rows = await prismaDb.vtc_rides.findMany({
      where: {
        driver_id: driverId,
        status: 'completed',
        driver_rating: { not: null },
      },
      orderBy: { dropoff_time: 'desc' },
      take: limit,
      select: {
        driver_rating: true,
        driver_feedback: true,
        dropoff_time: true,
        customer: { select: { first_name: true } },
      },
    });

    return rows.map((r) => ({
      rating: r.driver_rating as number,
      feedback: r.driver_feedback,
      date: r.dropoff_time,
      customerFirstName: r.customer?.first_name ?? null,
    }));
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

  /**
   * Resolve the driver profile for an authenticated user, if any. A
   * "driver" is a customer account (adigo_mobile login) with a vtc_drivers
   * row pointing back at it via `user_id` — see
   * migrate_vtc_driver_documents.ts for why that FK targets `customer`, not
   * `users`. This is how every driver-self endpoint (Phase 2,
   * VTC_MODULE_PLAN.md) and every ownership check on the shared
   * status/location/tracking endpoints turns "a valid JWT" into "is this
   * caller actually a driver, and which one."
   */
  async getDriverByUserId(userId: number): Promise<VtcDriver | null> {
    const result = await prismaDb.vtc_drivers.findFirst({ where: { user_id: userId } });
    return result as unknown as VtcDriver | null;
  }

  /**
   * Self-service driver onboarding — any logged-in customer can become a
   * driver directly from the app, no administrator involved. Until now
   * `createDriver` above was the only way in, gated behind
   * `adminRoleMiddleware` (see vtc.router.ts): a real, product-level gap
   * flagged live 2026-09-09 ("tout utilisateur doit pouvoir se comporter
   * comme chauffeur, pas l'administration").
   *
   * Name/phone/email are pulled from the customer's own account rather
   * than re-asked — a driver profile is just a `vtc_drivers` row pointing
   * back at the same customer (see getDriverByUserId's doc comment), so
   * there's no reason to duplicate data the account already has. Only the
   * driver-specific fields (license, vehicle) come from the caller.
   *
   * NOTE — deliberately NOT a moderation/KYC gate: the resulting driver
   * starts 'offline' (createDriver's default) same as an admin-onboarded
   * one, but nothing stops it from going online and accepting real paying
   * customers the moment it does. A production ride-hailing app would
   * normally hold new self-registered drivers in a pending/unverified
   * state until a document check clears — no such review step exists
   * anywhere in this codebase today, so none is faked here either; this
   * intentionally matches what was asked (remove the admin bottleneck),
   * not a claim that verification is handled.
   */
  async registerSelf(
    userId: number,
    data: Omit<CreateDriverDto, 'userId' | 'firstName' | 'lastName' | 'phone' | 'email'>
  ): Promise<VtcDriver> {
    const existing = await this.getDriverByUserId(userId);
    if (existing) {
      throw new Error('ALREADY_A_DRIVER');
    }

    const customer = await prismaDb.customer.findUnique({
      where: { id: userId },
      select: { first_name: true, last_name: true, phone: true, email: true },
    });
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    return this.createDriver({
      ...data,
      userId,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone ?? '',
      email: customer.email ?? undefined,
    });
  }
}

export default new DriverService();

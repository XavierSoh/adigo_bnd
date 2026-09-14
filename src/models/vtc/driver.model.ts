/**
 * VTC Driver Model
 * Represents a VTC/Taxi driver in the system
 */

export interface VtcDriver {
  // `vtc_drivers.id` is an auto-increment Int in schema.prisma, not a UUID —
  // this field lied about its own type since the model was first scaffolded
  // (every real caller already treated it as a number: respondToOffer,
  // getCurrentRideForDriver, updateDriverStatus, isAuthorizedForDriver's
  // `driver?.id === driverId` comparison against a parsed route param, all
  // pre-date this fix). Never caught before because the dev server runs
  // transpile-only (no type-checking) — surfaced by an explicit `tsc
  // --noEmit` run 2026-09-09.
  id: number;
  userId?: number;         // References customer(id) — a driver is a customer account with a driver profile attached
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  photo?: string;

  // License
  licenseNumber: string;
  licenseExpiry: Date;

  // Vehicle
  vehicleType: 'economy' | 'comfort' | 'premium';
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  licensePlate: string;
  seats?: number;

  // Documents
  insuranceNumber?: string;
  insuranceExpiry?: Date;
  registrationDocument?: string;
  vehiclePhotos?: string[];

  // Stats
  rating: number;
  totalRides: number;

  // Status
  status: 'online' | 'offline' | 'busy' | 'suspended';
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdate?: Date;

  // Vetting — distinct from `status` above (operational), this is whether
  // an admin has actually reviewed this driver's documents. A self-
  // registered driver can never go 'online' while this isn't 'approved' —
  // see DriverService.updateDriverStatus. Admin-onboarded drivers
  // (POST /vtc/drivers) are approved automatically — a staff member
  // entering the record by hand already is the vetting step.
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  verificationNotes?: string;
  verifiedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One real review left by a customer on a past completed ride with this
 * driver — see DriverService.getDriverReviews. `feedback` is nullable: a
 * customer can rate without leaving a comment.
 */
export interface DriverReview {
  rating: number;
  feedback: string | null;
  date: Date | null;
  customerFirstName: string | null;
}

export interface CreateDriverDto {
  userId?: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  photo?: string;
  licenseNumber: string;
  licenseExpiry: Date;
  vehicleType: 'economy' | 'comfort' | 'premium';
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  licensePlate: string;
  seats?: number;
  insuranceNumber?: string;
  insuranceExpiry?: Date;
  registrationDocument?: string;
  vehiclePhotos?: string[];
  // Not settable by a self-registering driver (registerSelf never passes
  // this through) — only DriverController.createDriver, the admin-only
  // onboarding endpoint, sets it explicitly to 'approved'. Defaults to
  // 'pending' in DriverService.createDriver when omitted.
  verificationStatus?: 'pending' | 'approved' | 'rejected';
}

export interface UpdateDriverLocationDto {
  latitude: number;
  longitude: number;
}

export interface UpdateDriverDto {
  // Declared but never read until DriverService.updateDriver's 2026-09-09
  // fix (see its doc comment) — needed so an admin can retroactively link
  // an existing driver record to a customer/mobile login (driver mode,
  // VTC_MODULE_PLAN.md Phase 2), same field CreateDriverDto already has.
  userId?: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  photo?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  vehicleType?: 'economy' | 'comfort' | 'premium';
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  licensePlate?: string;
  seats?: number;
  insuranceNumber?: string;
  insuranceExpiry?: Date;
  registrationDocument?: string;
  vehiclePhotos?: string[];
  status?: 'online' | 'offline' | 'busy' | 'suspended';
}

/** PUT /vtc/drivers/:id/verify (admin-only) — approve or reject a driver's
 * submitted documents. `notes` is required when rejecting (the driver needs
 * to know what to fix) and stored either way for an audit trail. */
export interface VerifyDriverDto {
  approved: boolean;
  notes?: string;
}

export interface DriverStatus {
  driverId: number;
  status: 'online' | 'offline' | 'busy' | 'suspended';
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdate?: Date;
}

/**
 * VTC Driver Controller
 * HTTP handlers for driver endpoints
 */

import { Request, Response } from 'express';
import driverService from '../../services/vtc/driver.service';
import { CreateDriverDto, UpdateDriverDto, UpdateDriverLocationDto } from '../../models/vtc/driver.model';

type UploadedFiles = { [fieldname: string]: Express.Multer.File[] } | undefined;

/**
 * Builds the document/photo fields shared by create and update from a
 * multipart request: `req.body` values arrive as strings (multer doesn't
 * parse them), `req.files` holds whatever `driverDocumentsUpload.fields()`
 * matched. Stored paths are the same raw multer `.path` other modules
 * already save as-is (see agency.controller.ts) — served statically,
 * turned into a full URL client-side.
 */
function parseDriverDocumentFields(req: Request): {
  seats?: number;
  insuranceExpiry?: Date;
  registrationDocument?: string;
  vehiclePhotos?: string[];
  photo?: string;
} {
  const files = req.files as UploadedFiles;
  const body = req.body;

  return {
    seats: body.seats != null && body.seats !== '' ? parseInt(body.seats) : undefined,
    insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : undefined,
    registrationDocument: files?.registrationDocument?.[0]?.path,
    vehiclePhotos: files?.vehiclePhotos?.length ? files.vehiclePhotos.map((f) => f.path) : undefined,
    photo: files?.photo?.[0]?.path,
  };
}

export class DriverController {
  /**
   * POST /v1/api/vtc/drivers
   * Admin onboards a driver — there's no driver-facing self-signup app yet.
   * Accepts multipart/form-data (photo, registrationDocument, vehiclePhotos[]
   * alongside the text fields) via driverDocumentsUpload in vtc.router.ts.
   */
  async createDriver(req: Request, res: Response): Promise<Response> {
    try {
      const docFields = parseDriverDocumentFields(req);
      const data: CreateDriverDto = {
        ...req.body,
        ...docFields,
        photo: docFields.photo ?? req.body.photo,
        vehicleYear: req.body.vehicleYear ? parseInt(req.body.vehicleYear) : undefined,
        userId: req.body.userId ? parseInt(req.body.userId) : undefined,
      };

      if (!data.firstName || !data.lastName || !data.phone || !data.licenseNumber || !data.licensePlate || !data.vehicleType) {
        return res.status(400).json({
          success: false,
          message: 'firstName, lastName, phone, licenseNumber, licensePlate et vehicleType sont requis'
        });
      }

      const driver = await driverService.createDriver(data);

      return res.status(201).json({
        success: true,
        data: driver
      });
    } catch (error: any) {
      console.error('Error creating driver:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /v1/api/vtc/drivers/register
   * Self-service: any authenticated customer becomes a driver directly,
   * no administrator needed — closes the gap `createDriver` above's doc
   * comment flagged ("no driver-facing self-signup app yet"), reported
   * live 2026-09-09. Same multipart shape as createDriver (photo/
   * vehiclePhotos optional), but name/phone/email come from the caller's
   * own account (see DriverService.registerSelf), not the request body.
   */
  async registerAsDriver(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const docFields = parseDriverDocumentFields(req);
      const data = {
        ...req.body,
        ...docFields,
        photo: docFields.photo ?? req.body.photo,
        vehicleYear: req.body.vehicleYear ? parseInt(req.body.vehicleYear) : undefined,
      };

      if (!data.licenseNumber || !data.licenseExpiry || !data.licensePlate || !data.vehicleType) {
        return res.status(400).json({
          success: false,
          message: 'licenseNumber, licenseExpiry, licensePlate et vehicleType sont requis'
        });
      }

      const driver = await driverService.registerSelf(req.userId, data);

      return res.status(201).json({ success: true, data: driver });
    } catch (error: any) {
      if (error.message === 'ALREADY_A_DRIVER') {
        return res.status(409).json({ success: false, message: 'Vous êtes déjà enregistré comme chauffeur' });
      }
      if (error.message === 'CUSTOMER_NOT_FOUND') {
        return res.status(404).json({ success: false, message: 'Compte introuvable' });
      }
      console.error('Error self-registering as driver:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /v1/api/vtc/drivers
   * Admin dashboard listing of all drivers.
   */
  async getAllDrivers(req: Request, res: Response): Promise<Response> {
    try {
      const status = req.query.status as string | undefined;
      const drivers = await driverService.getAllDrivers(status);

      return res.json({
        success: true,
        data: drivers
      });
    } catch (error: any) {
      console.error('Error listing drivers:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /v1/api/vtc/drivers/:id
   * Admin edits a driver profile.
   */
  async updateDriver(req: Request, res: Response): Promise<Response> {
    try {
      const driverId = parseInt((req.params as { id: string }).id);
      const docFields = parseDriverDocumentFields(req);
      const data: UpdateDriverDto = {
        ...req.body,
        ...docFields,
        photo: docFields.photo ?? req.body.photo,
        vehicleYear: req.body.vehicleYear ? parseInt(req.body.vehicleYear) : undefined,
        // Multipart bodies never parse numeric strings on their own (same
        // reasoning as vehicleYear above) — without this, `userId` silently
        // stayed a string and Prisma's Int column update would reject it.
        userId: req.body.userId ? parseInt(req.body.userId) : undefined,
      };

      const driver = await driverService.updateDriver(driverId, data);

      if (!driver) {
        return res.status(404).json({ success: false, message: 'Driver not found' });
      }

      return res.json({
        success: true,
        data: driver
      });
    } catch (error: any) {
      console.error('Error updating driver:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /v1/api/vtc/drivers/nearby
   * Get nearby available drivers
   */
  async getNearbyDrivers(req: Request, res: Response): Promise<Response> {
    try {
      const { latitude, longitude, vehicleType, radius } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const drivers = await driverService.getNearbyDrivers(
        parseFloat(latitude as string),
        parseFloat(longitude as string),
        vehicleType as string,
        radius ? parseFloat(radius as string) : 8
      );

      return res.json({
        success: true,
        data: drivers
      });
    } catch (error: any) {
      console.error('Error getting nearby drivers:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * True if the caller may act on `driverId`'s own record: a staff/admin
   * token (`req.userRole` set by authMiddleware only for `users` logins),
   * or a customer token whose linked vtc_drivers row (via `user_id`) is
   * exactly this one. Closes the gap flagged since Phase 0
   * (VTC_MODULE_PLAN.md §0.1: "once a driver role exists, add an ownership
   * check here") now that Phase 2 gives drivers a real, resolvable identity
   * — before this, any authenticated user (any customer, not just drivers)
   * could overwrite any driver's position/status by guessing an id.
   */
  private async isAuthorizedForDriver(req: Request, driverId: number): Promise<boolean> {
    if (req.userRole) return true;
    if (!req.userId) return false;
    const driver = await driverService.getDriverByUserId(req.userId);
    return driver?.id === driverId;
  }

  /**
   * GET /v1/api/vtc/drivers/me
   * Resolve the authenticated account's own driver profile — a "driver" is
   * a customer account (adigo_mobile login) with a vtc_drivers row pointing
   * back at it, not a separate login (see
   * migrate_vtc_driver_documents.ts). 404 if this account isn't a driver.
   */
  async getMyProfile(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const driver = await driverService.getDriverByUserId(req.userId);
      if (!driver) {
        return res.status(404).json({ success: false, message: "Aucun profil chauffeur pour ce compte" });
      }
      return res.json({ success: true, data: driver });
    } catch (error: any) {
      console.error('Error getting own driver profile:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /v1/api/vtc/drivers/me
   * "Mon véhicule & documents" — a driver edits their own vehicle/license/
   * insurance info and re-uploads photos, without an admin. Same multipart
   * shape and `parseDriverDocumentFields` helper as the admin's
   * `updateDriver` below, reused as-is — the only difference is `driverId`
   * comes from the caller's own token instead of a URL param, and `userId`
   * is stripped from the body so a driver can never re-link their own
   * profile to a different account. Closes the last piece of the "no
   * driver-facing self-signup app yet" gap alongside `registerAsDriver`
   * above: creating a profile was self-service, editing it still required
   * an admin until now.
   */
  async updateMyProfile(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const driver = await driverService.getDriverByUserId(req.userId);
      if (!driver) {
        return res.status(404).json({ success: false, message: "Aucun profil chauffeur pour ce compte" });
      }

      const docFields = parseDriverDocumentFields(req);
      // `userId` (re-linking to another account) and `status` (its own
      // dedicated, presumably-validated endpoint — /drivers/me/status) are
      // deliberately never settable through this generic profile edit.
      const { userId: _ignoredUserId, status: _ignoredStatus, ...body } = req.body;
      const data: UpdateDriverDto = {
        ...body,
        ...docFields,
        photo: docFields.photo ?? req.body.photo,
        vehicleYear: req.body.vehicleYear ? parseInt(req.body.vehicleYear) : undefined,
      };

      const updated = await driverService.updateDriver(driver.id, data);
      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Error updating own driver profile:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /v1/api/vtc/drivers/me/status
   * Driver mode: toggle own online/offline status. No id in the URL to
   * guess — resolved from the token, same as /me above.
   */
  async updateMyStatus(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const driver = await driverService.getDriverByUserId(req.userId);
      if (!driver) {
        return res.status(404).json({ success: false, message: "Aucun profil chauffeur pour ce compte" });
      }
      const updated = await driverService.updateDriverStatus(driver.id, req.body.status);
      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Error updating own driver status:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /v1/api/vtc/drivers/me/location
   * Driver mode: post own GPS position — what a real driver app sends every
   * few seconds while online/on a ride (see VTCDriverLocationService in
   * adigo_mobile).
   */
  async updateMyLocation(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const driver = await driverService.getDriverByUserId(req.userId);
      if (!driver) {
        return res.status(404).json({ success: false, message: "Aucun profil chauffeur pour ce compte" });
      }
      const data: UpdateDriverLocationDto = req.body;
      const updated = await driverService.updateDriverLocation(driver.id, data);
      return res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Error updating own driver location:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /v1/api/vtc/drivers/:id/location
   * Update driver location
   */
  async updateLocation(req: Request, res: Response): Promise<Response> {
    try {
      const driverId = parseInt((req.params as { id: string }).id);
      if (!(await this.isAuthorizedForDriver(req, driverId))) {
        return res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que votre propre position' });
      }
      const data: UpdateDriverLocationDto = req.body;

      const driver = await driverService.updateDriverLocation(driverId, data);

      if (!driver) {
        return res.status(404).json({ success: false, message: 'Driver not found' });
      }

      return res.json({
        success: true,
        data: driver
      });
    } catch (error: any) {
      console.error('Error updating driver location:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /v1/api/vtc/drivers/:id/status
   * Update driver status
   */
  async updateStatus(req: Request, res: Response): Promise<Response> {
    try {
      const driverId = parseInt((req.params as { id: string }).id);
      if (!(await this.isAuthorizedForDriver(req, driverId))) {
        return res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que votre propre statut' });
      }
      const { status } = req.body;

      const driver = await driverService.updateDriverStatus(driverId, status);

      if (!driver) {
        return res.status(404).json({ success: false, message: 'Driver not found' });
      }

      return res.json({
        success: true,
        data: driver
      });
    } catch (error: any) {
      console.error('Error updating driver status:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /v1/api/vtc/drivers/:id
   * Get driver details
   */
  async getDriver(req: Request, res: Response): Promise<Response> {
    try {
      const driverId = parseInt((req.params as { id: string }).id);
      const driver = await driverService.getDriverById(driverId);

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Driver not found'
        });
      }

      return res.json({
        success: true,
        data: driver
      });
    } catch (error: any) {
      console.error('Error getting driver:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /v1/api/vtc/drivers/:id/profile?pickupLat=&pickupLon=
   * The "choisir son chauffeur" detail view: full vehicle info + real photos,
   * registration date, rating/ride count, recent reviews, and — when the
   * customer's pickup point is passed — a rough ETA from the driver's last
   * known position. Public (no auth), same as GET /drivers/:id: a customer
   * needs to see this before they've committed to anything.
   */
  async getDriverProfile(req: Request, res: Response): Promise<Response> {
    try {
      const driverId = parseInt((req.params as { id: string }).id);
      const pickupLat = req.query.pickupLat ? parseFloat(req.query.pickupLat as string) : undefined;
      const pickupLon = req.query.pickupLon ? parseFloat(req.query.pickupLon as string) : undefined;

      const profile = await driverService.getDriverProfile(driverId, pickupLat, pickupLon);
      if (!profile) {
        return res.status(404).json({ success: false, message: 'Driver not found' });
      }

      const d: any = profile.driver;
      return res.json({
        success: true,
        data: {
          id: d.id,
          first_name: d.first_name,
          last_name: d.last_name,
          photo: d.photo,
          rating: d.rating,
          total_rides: d.total_rides,
          created_at: d.created_at,
          vehicle_brand: d.vehicle_brand,
          vehicle_model: d.vehicle_model,
          vehicle_year: d.vehicle_year,
          vehicle_color: d.vehicle_color,
          vehicle_type: d.vehicle_type,
          license_plate: d.license_plate,
          seats: d.seats,
          vehicle_photos: d.vehicle_photos ?? [],
          eta_minutes: profile.etaMinutes,
          eta_distance_km: profile.etaDistanceKm,
          reviews: profile.reviews.map((r) => ({
            rating: r.rating,
            feedback: r.feedback,
            date: r.date,
            customer_first_name: r.customerFirstName,
          })),
        },
      });
    } catch (error: any) {
      console.error('Error getting driver profile:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new DriverController();

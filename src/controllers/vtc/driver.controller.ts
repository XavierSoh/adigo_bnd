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
        radius ? parseFloat(radius as string) : 5
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
   * PUT /v1/api/vtc/drivers/:id/location
   * Update driver location
   */
  async updateLocation(req: Request, res: Response): Promise<Response> {
    try {
      const driverId = parseInt((req.params as { id: string }).id);
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
}

export default new DriverController();

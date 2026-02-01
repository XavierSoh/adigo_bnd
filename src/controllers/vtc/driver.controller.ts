/**
 * VTC Driver Controller
 * HTTP handlers for driver endpoints
 */

import { Request, Response } from 'express';
import driverService from '../../services/vtc/driver.service';
import { UpdateDriverLocationDto } from '../../models/vtc/driver.model';

export class DriverController {
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

/**
 * VTC Ride Controller
 * HTTP handlers for ride endpoints
 */

import { Request, Response } from 'express';
import rideService from '../../services/vtc/ride.service';
import { CreateRideDto, RateRideDto, CancelRideDto } from '../../models/vtc/ride.model';

export class RideController {
  /**
   * GET /v1/api/vtc/estimate
   * Estimate ride cost
   */
  async estimateRide(req: Request, res: Response): Promise<Response> {
    try {
      const { pickupLat, pickupLon, dropoffLat, dropoffLon, vehicleType } = req.query;

      if (!pickupLat || !pickupLon || !dropoffLat || !dropoffLon || !vehicleType) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }

      const estimate = await rideService.estimateRide(
        parseFloat(pickupLat as string),
        parseFloat(pickupLon as string),
        parseFloat(dropoffLat as string),
        parseFloat(dropoffLon as string),
        vehicleType as any
      );

      return res.json({
        success: true,
        data: estimate
      });
    } catch (error: any) {
      console.error('Error estimating ride:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /v1/api/vtc/rides
   * Create a new ride
   */
  async createRide(req: Request, res: Response): Promise<Response> {
    try {
      const data: CreateRideDto = req.body;

      const ride = await rideService.createRide(data);

      return res.status(201).json({
        success: true,
        data: ride
      });
    } catch (error: any) {
      console.error('Error creating ride:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /v1/api/vtc/rides/:id
   * Get ride details
   */
  async getRide(req: Request, res: Response): Promise<Response> {
    try {
      const rideId = parseInt((req.params as { id: string }).id);
      const ride = await rideService.getRideById(rideId);

      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found'
        });
      }

      return res.json({
        success: true,
        data: ride
      });
    } catch (error: any) {
      console.error('Error getting ride:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /v1/api/vtc/rides
   * Get customer rides
   */
  async getCustomerRides(req: Request, res: Response): Promise<Response> {
    try {
      const customerId = parseInt(req.query.customerId as string);

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required'
        });
      }

      const rides = await rideService.getCustomerRides(customerId);

      return res.json({
        success: true,
        data: rides
      });
    } catch (error: any) {
      console.error('Error getting customer rides:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /v1/api/vtc/rides/:id/cancel
   * Cancel a ride
   */
  async cancelRide(req: Request, res: Response): Promise<Response> {
    try {
      const rideId = parseInt((req.params as { id: string }).id);
      const data: CancelRideDto = req.body;

      const ride = await rideService.cancelRide(rideId, data);

      return res.json({
        success: true,
        data: ride
      });
    } catch (error: any) {
      console.error('Error cancelling ride:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /v1/api/vtc/rides/:id/rate
   * Rate a ride
   */
  async rateRide(req: Request, res: Response): Promise<Response> {
    try {
      const rideId = parseInt((req.params as { id: string }).id);
      const { ratedBy, ...data } = req.body;

      const ride = await rideService.rateRide(rideId, ratedBy, data as RateRideDto);

      return res.json({
        success: true,
        data: ride
      });
    } catch (error: any) {
      console.error('Error rating ride:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new RideController();

/**
 * Shipment Controller
 * HTTP handlers for parcel shipment endpoints
 */

import { Request, Response } from 'express';
import shipmentService from '../../services/parcel/shipment.service';
import pool from '../../config/database';
import { CreateShipmentDto, EstimateShipmentDto } from '../../models/parcel/shipment.model';

export class ShipmentController {
  /**
   * POST /v1/api/parcel/estimate
   * Estimate shipment cost
   */
  async estimateShipment(req: Request, res: Response): Promise<Response> {
    try {
      const data: EstimateShipmentDto = req.body;
      const estimate = await shipmentService.estimateShipment(data);

      return res.json({
        success: true,
        data: estimate
      });
    } catch (error: any) {
      console.error('Error estimating shipment:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /v1/api/parcel/shipments
   * Create a new shipment
   */
  async createShipment(req: Request, res: Response): Promise<Response> {
    try {
      const data: CreateShipmentDto = req.body;
      const shipment = await shipmentService.createShipment(data);

      return res.status(201).json({
        success: true,
        data: shipment
      });
    } catch (error: any) {
      console.error('Error creating shipment:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /v1/api/parcel/shipments/:id
   * Get shipment details
   */
  async getShipment(req: Request, res: Response): Promise<Response> {
    try {
      const shipmentId = parseInt(req.params.id);
      const shipment = await shipmentService.getShipmentById(shipmentId);

      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: 'Shipment not found'
        });
      }

      return res.json({
        success: true,
        data: shipment
      });
    } catch (error: any) {
      console.error('Error getting shipment:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /v1/api/parcel/track/:trackingNumber
   * Track shipment by tracking number
   */
  async trackShipment(req: Request, res: Response): Promise<Response> {
    try {
      const trackingNumber = req.params.trackingNumber;
      const shipment = await shipmentService.trackByNumber(trackingNumber);

      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: 'Shipment not found'
        });
      }

      // Get tracking events
      const eventsQuery = `
        SELECT * FROM parcel_tracking_events
        WHERE shipment_id = $1
        ORDER BY created_at DESC
      `;
      const eventsResult = await pool.query(eventsQuery, [shipment.id]);

      return res.json({
        success: true,
        data: {
          shipment,
          events: eventsResult.rows
        }
      });
    } catch (error: any) {
      console.error('Error tracking shipment:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /v1/api/parcel/shipments
   * Get customer shipments
   */
  async getCustomerShipments(req: Request, res: Response): Promise<Response> {
    try {
      const customerId = parseInt(req.query.customerId as string);

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required'
        });
      }

      const shipments = await shipmentService.getCustomerShipments(customerId);

      return res.json({
        success: true,
        data: shipments
      });
    } catch (error: any) {
      console.error('Error getting customer shipments:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new ShipmentController();

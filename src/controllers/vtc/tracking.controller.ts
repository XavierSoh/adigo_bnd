/**
 * VTC Ride Tracking Controller
 * HTTP handlers for real-time GPS tracking endpoints.
 */

import { Request, Response } from 'express';
import trackingService from '../../services/vtc/tracking.service';
import rideService from '../../services/vtc/ride.service';
import { CreateTrackingDto } from '../../models/vtc/tracking.model';
import { SocketService } from '../../services/socket.service';

export class TrackingController {
  /**
   * POST /v1/api/vtc/rides/:id/tracking
   * Record one GPS point for an active ride, then broadcast it to whoever
   * is watching this ride live (customer + any admin auditing it).
   */
  async recordPoint(req: Request, res: Response): Promise<Response> {
    try {
      const rideId = parseInt((req.params as { id: string }).id);
      const { latitude, longitude, heading, speed } = req.body;

      if (latitude == null || longitude == null) {
        return res.status(400).json({ success: false, message: 'latitude et longitude sont requis' });
      }

      const data: CreateTrackingDto = { rideId: String(rideId), latitude, longitude, heading, speed };
      const point = await trackingService.recordPoint(rideId, data);

      SocketService.broadcastDriverLocation(rideId, point);

      return res.status(201).json({ success: true, data: point });
    } catch (error: any) {
      console.error('Error recording tracking point:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /v1/api/vtc/rides/:id/tracking
   * Full point history for a ride (replay a completed trip, or catch up a
   * client that just opened the tracking screen). Restricted to the ride's
   * own customer or staff — a ride's GPS trail is private, not public data.
   */
  async getHistory(req: Request, res: Response): Promise<Response> {
    try {
      const rideId = parseInt((req.params as { id: string }).id);
      const ride: any = await rideService.getRideById(rideId);

      if (!ride) {
        return res.status(404).json({ success: false, message: 'Ride not found' });
      }

      const isOwner = req.userId === ride.customer_id;
      const isStaff = !!req.userRole;
      if (!isOwner && !isStaff) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const history = await trackingService.getHistory(rideId);
      return res.json({ success: true, data: history });
    } catch (error: any) {
      console.error('Error getting tracking history:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new TrackingController();

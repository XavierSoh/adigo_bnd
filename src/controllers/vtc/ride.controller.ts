/**
 * VTC Ride Controller
 * HTTP handlers for ride endpoints
 */

import { Request, Response } from 'express';
import rideService from '../../services/vtc/ride.service';
import { CreateRideDto, RateRideDto, CancelRideDto } from '../../models/vtc/ride.model';
import { SocketService } from '../../services/socket.service';
import { WalletRepository } from '../../repository/wallet.repository';
import { I18n } from '../../utils/i18n';

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
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // customerId always comes from the authenticated token, never from
      // the request body — same reasoning as the wallet/ticketing fixes.
      const data: CreateRideDto = { ...req.body, customerId: req.userId };

      // Same pattern as booking.controller.ts: pre-check the wallet balance
      // *before* creating anything when paying by wallet, so an
      // insufficient balance blocks the request cleanly instead of leaving
      // an unpaid ride behind.
      if (data.paymentMethod === 'wallet') {
        const estimate = await rideService.estimateRide(
          data.pickupLatitude, data.pickupLongitude,
          data.dropoffLatitude, data.dropoffLongitude,
          data.vehicleType
        );
        const balanceCheck = await WalletRepository.getBalance(req.userId);
        const currentBalance = balanceCheck.status ? (balanceCheck.body?.wallet_balance ?? 0) : 0;

        if (currentBalance < estimate.totalFare) {
          return res.status(400).json({
            success: false,
            message: I18n.t('insufficient_wallet_balance', req.lang, {
              current: currentBalance.toString(),
              required: estimate.totalFare.toString()
            })
          });
        }
      }

      const ride: any = await rideService.createRide(data);

      // Charge the wallet now that the ride exists. If this fails (balance
      // moved between the check above and here), cancel the just-created
      // ride rather than leaving one on the books that was never paid.
      if (data.paymentMethod === 'wallet' && ride.total_fare > 0) {
        const paymentResult = await WalletRepository.recordPayment(
          req.userId,
          ride.total_fare,
          `Course VTC #${ride.id}`
        );
        if (!paymentResult.status) {
          await rideService.cancelRide(ride.id, { reason: 'Paiement wallet échoué', cancelledBy: 'system' });
          return res.status(400).json({
            success: false,
            message: paymentResult.message || I18n.t('insufficient_wallet_balance', req.lang, {
              current: '?',
              required: ride.total_fare.toString()
            })
          });
        }
        const paid: any = await rideService.markPaymentCompleted(ride.id);
        ride.payment_status = paid?.payment_status ?? 'completed';
      }

      SocketService.broadcastNewRideRequested(ride);

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
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Always the authenticated customer's own rides — a ?customerId=
      // query param would otherwise let anyone read anyone else's ride history.
      const rides = await rideService.getCustomerRides(req.userId);

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

      const ride: any = await rideService.cancelRide(rideId, data);

      if (!ride) {
        // cancelRide's WHERE guards against re-cancelling an already
        // cancelled ride (so it can't be refunded twice) — distinguish
        // that from a genuinely missing ride id.
        const existing = await rideService.getRideById(rideId);
        if (!existing) {
          return res.status(404).json({ success: false, message: 'Ride not found' });
        }
        return res.status(400).json({ success: false, message: 'Course déjà annulée' });
      }
      SocketService.broadcastRideStatusChanged(ride);

      // Cancellation always refunds to the wallet, regardless of the
      // original payment method (cash, mobile money, or wallet) — same
      // deliberate business decision already applied to booking
      // cancellations (see BOOKING_MODULE_NOTES.md): there's no automated
      // way to reverse a cash/mobile-money charge through the app, so
      // crediting the wallet is how the refund actually reaches the client.
      if (ride.total_fare > 0) {
        await WalletRepository.recordRefund(
          ride.customer_id,
          ride.total_fare,
          `Remboursement course VTC annulée #${ride.id} (payée via ${ride.payment_method})`
        );
      }

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
   * GET /v1/api/vtc/rides/admin/all
   * Admin dashboard listing — used to find rides needing a driver assigned
   * by hand, since there's no automatic matching yet. ?customerId= lets the
   * desktop "Courses VTC" button on a customer's file show just their rides.
   */
  async getAllRides(req: Request, res: Response): Promise<Response> {
    try {
      const status = req.query.status as string | undefined;
      const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
      const driverId = req.query.driverId ? parseInt(req.query.driverId as string) : undefined;
      const rides = await rideService.getAllRides(status, customerId, driverId);

      return res.json({
        success: true,
        data: rides
      });
    } catch (error: any) {
      console.error('Error listing rides:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /v1/api/vtc/rides/:id/assign
   * Admin assigns a driver to a pending ride.
   */
  async assignDriver(req: Request, res: Response): Promise<Response> {
    try {
      const rideId = parseInt((req.params as { id: string }).id);
      const { driverId } = req.body;

      if (!driverId) {
        return res.status(400).json({ success: false, message: 'driverId is required' });
      }

      const ride = await rideService.assignDriver(rideId, driverId);

      if (!ride) {
        return res.status(409).json({
          success: false,
          message: 'Course introuvable ou déjà attribuée'
        });
      }
      SocketService.broadcastRideStatusChanged(ride);

      return res.json({
        success: true,
        data: ride
      });
    } catch (error: any) {
      console.error('Error assigning driver:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /v1/api/vtc/rides/:id/status
   * Advance a ride through its lifecycle (accepted → arrived → started →
   * completed). Used by the driver mode and by admin as a manual override.
   */
  async updateStatus(req: Request, res: Response): Promise<Response> {
    try {
      const rideId = parseInt((req.params as { id: string }).id);
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, message: 'status is required' });
      }

      const ride = await rideService.updateRideStatus(rideId, status);

      if (!ride) {
        return res.status(404).json({ success: false, message: 'Ride not found' });
      }
      SocketService.broadcastRideStatusChanged(ride);

      return res.json({ success: true, data: ride });
    } catch (error: any) {
      console.error('Error updating ride status:', error);
      return res.status(400).json({
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

      if (!ride) {
        return res.status(404).json({ success: false, message: 'Ride not found' });
      }

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

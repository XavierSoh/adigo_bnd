/**
 * VTC Ride Controller
 * HTTP handlers for ride endpoints
 */

import { Request, Response } from 'express';
import rideService from '../../services/vtc/ride.service';
import driverService from '../../services/vtc/driver.service';
import { CreateRideDto, RateRideDto, CancelRideDto } from '../../models/vtc/ride.model';
import { SocketService } from '../../services/socket.service';
import { WalletRepository } from '../../repository/wallet.repository';
import { I18n } from '../../utils/i18n';
import { VtcNotificationService } from '../../services/vtc/vtcNotification.service';
import promoService from '../../services/vtc/promo.service';
import commissionService from '../../services/vtc/commission.service';

export class RideController {
  /**
   * GET /v1/api/vtc/estimate
   * Estimate ride cost
   */
  async estimateRide(req: Request, res: Response): Promise<Response> {
    try {
      const { pickupLat, pickupLon, dropoffLat, dropoffLon, vehicleType, promoCode } = req.query;

      if (!pickupLat || !pickupLon || !dropoffLat || !dropoffLon || !vehicleType) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
      }

      const estimate: any = await rideService.estimateRide(
        parseFloat(pickupLat as string),
        parseFloat(pickupLon as string),
        parseFloat(dropoffLat as string),
        parseFloat(dropoffLon as string),
        vehicleType as any
      );

      // Codes promo — preview only, never blocks the base estimate. This
      // route uses optionalAuthMiddleware (anonymous price-checking must
      // keep working), so req.userId is only populated when a real token
      // was sent — a promo code can only actually be validated for a
      // logged-in customer, the per-customer "already used" check is
      // meaningless otherwise. The booking flow that actually has a
      // promo-code field is itself only ever reachable already logged in,
      // so this never blocks a real user.
      if (promoCode) {
        const preview = req.userId
          ? await promoService.preview(promoCode as string, req.userId, estimate.totalFare)
          : { valid: false, reason: 'Connectez-vous pour utiliser un code promo' };
        estimate.promoCode = {
          valid: preview.valid,
          reason: preview.reason ?? null,
          discountAmount: preview.discountAmount ?? 0,
        };
        if (preview.valid) {
          estimate.totalFareAfterPromo = estimate.totalFare - (preview.discountAmount ?? 0);
        }
      }

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
   * GET /v1/api/vtc/surge/current
   * Transparency endpoint — the same computation estimateRide already uses
   * to freeze a multiplier onto a new ride, exposed standalone so the
   * customer app can show a "high demand" badge before the user even fills
   * in pickup/dropoff, and so adigo2's dispatch screen can show it live.
   */
  async getSurgeStatus(req: Request, res: Response): Promise<Response> {
    try {
      const status = await rideService.getSurgeStatus();
      return res.json({ success: true, data: status });
    } catch (error: any) {
      console.error('Error getting surge status:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /v1/api/vtc/promo-codes/active
   * Every currently-usable VTC promo code — public/read-only (just a
   * promotional list, no per-customer state), powers the mobile
   * "Promotions" drawer entry (previously a dead "bientôt disponible" stub).
   */
  async getActivePromoCodes(req: Request, res: Response): Promise<Response> {
    try {
      const promoCodes = await promoService.listActive();
      return res.json({ success: true, data: promoCodes });
    } catch (error: any) {
      console.error('Error listing active promo codes:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /v1/api/vtc/commission/summary
   * Admin — global commission totals (pending vs. settled) for the
   * dispatch screen's "Commission" tab header. See CommissionService.
   */
  async getCommissionSummary(req: Request, res: Response): Promise<Response> {
    try {
      const summary = await commissionService.getSummary();
      return res.json({ success: true, data: summary });
    } catch (error: any) {
      console.error('Error getting commission summary:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /v1/api/vtc/commission/by-driver
   * Admin — every commission ledger row, driver identity joined in.
   */
  async getCommissionByDriver(req: Request, res: Response): Promise<Response> {
    try {
      const rows = await commissionService.getByDriver();
      return res.json({ success: true, data: rows });
    } catch (error: any) {
      console.error('Error getting commission by driver:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /v1/api/vtc/commission/:id/settle
   * Admin marks a 'pending' commission row settled by hand (cash/mobile-
   * money collected in person from a driver with no linked wallet).
   */
  async settleCommission(req: Request, res: Response): Promise<Response> {
    try {
      const ledgerId = parseInt((req.params as { id: string }).id);
      const settled = await commissionService.settle(ledgerId, req.userId);
      if (!settled) {
        return res.status(404).json({ success: false, message: 'Ligne de commission introuvable ou déjà réglée' });
      }
      return res.json({ success: true, data: settled });
    } catch (error: any) {
      console.error('Error settling commission:', error);
      return res.status(500).json({ success: false, message: error.message });
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

      // Courses programmées: reject anything too close to now to actually
      // be worth scheduling rather than just booking immediately — also
      // guards against a client sending an already-past datetime.
      if (data.scheduledFor) {
        const scheduledDate = new Date(data.scheduledFor);
        if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() < Date.now() + 30 * 60 * 1000) {
          return res.status(400).json({
            success: false,
            message: 'scheduledFor doit être une date valide au moins 30 minutes dans le futur',
          });
        }
      }

      // Idempotent replay: if adigo_mobile already successfully created a
      // ride with this exact key (e.g. this is a client retry after a
      // network timeout on the first attempt's response), return that same
      // ride — no second wallet debit, no second broadcast, no second row.
      // Checked before the balance pre-check below on purpose: a replay
      // must have zero side effects, not just avoid a double charge.
      if (data.idempotencyKey) {
        const existingRide = await rideService.findByIdempotencyKey(req.userId, data.idempotencyKey);
        if (existingRide) {
          return res.status(200).json({ success: true, data: existingRide, replay: true });
        }
      }

      // Codes promo — re-validated from scratch here (never trusts a
      // client-supplied "the preview said this was valid a moment ago":
      // the estimate's own promo preview is read-only and can go stale by
      // the time the booking button is actually tapped). Rejected outright
      // when the customer explicitly supplied a code that turns out
      // invalid — silently booking at full price instead would be more
      // confusing than a clear error naming why.
      let promoDiscountAmount = 0;
      if (data.promoCode) {
        const preEstimate = await rideService.estimateRide(
          data.pickupLatitude, data.pickupLongitude,
          data.dropoffLatitude, data.dropoffLongitude,
          data.vehicleType
        );
        const promoPreview = await promoService.preview(data.promoCode, req.userId, preEstimate.totalFare);
        if (!promoPreview.valid) {
          return res.status(400).json({ success: false, message: promoPreview.reason || 'Code promo invalide' });
        }
        promoDiscountAmount = promoPreview.discountAmount ?? 0;
        data.promoDiscountAmount = promoDiscountAmount;
      }

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
        const requiredAmount = Math.max(0, estimate.totalFare - promoDiscountAmount);
        const balanceCheck = await WalletRepository.getBalance(req.userId);
        const currentBalance = balanceCheck.status ? (balanceCheck.body?.wallet_balance ?? 0) : 0;

        if (currentBalance < requiredAmount) {
          return res.status(400).json({
            success: false,
            message: I18n.t('insufficient_wallet_balance', req.lang, {
              current: currentBalance.toString(),
              required: requiredAmount.toString()
            })
          });
        }
      }

      const ride: any = await rideService.createRide(data);

      // Record the redemption now that the ride actually exists (needed
      // for the promo_code_usage row's vtc_ride_id) — re-validates once
      // more, closing the (very small) race window between the pre-check
      // above and this point. In the rare case that loses the race (two
      // simultaneous bookings both passed the pre-check, only one can win
      // the DB-level unique constraint), the ride still proceeds at the
      // already-discounted price computed above rather than failing an
      // already-created booking over it — a rare, low-stakes inconsistency
      // preferred over a half-created ride.
      if (data.promoCode && promoDiscountAmount > 0) {
        promoService.redeem(data.promoCode, req.userId, ride.id, Number(ride.total_fare) + promoDiscountAmount).catch((err) =>
          console.error('[PromoService] redeem failed:', err)
        );
      }

      // Charge the wallet now that the ride exists. If this fails (balance
      // moved between the check above and here), cancel the just-created
      // ride rather than leaving one on the books that was never paid.
      if (data.paymentMethod === 'wallet' && ride.total_fare > 0) {
        // ride.total_fare is a Prisma Decimal, not a plain number — passed
        // as-is, WalletRepository.recordRefund's `currentBalance + amount`
        // string-concatenates instead of adding (Decimal.valueOf() returns
        // a string, and `+` treats that specially, unlike `-`/`>`), silently
        // corrupting the balance and failing inside its own try/catch
        // without the caller ever seeing it. Convert explicitly everywhere
        // a Decimal reaches a wallet helper, not just here.
        const paymentResult = await WalletRepository.recordPayment(
          req.userId,
          Number(ride.total_fare),
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

      // Customer picked a specific driver from the "nearby drivers" list
      // (GET /vtc/drivers/nearby) rather than requesting a ride and waiting
      // for admin to assign one — offer it to that driver rather than
      // locking them in outright: the driver still has to accept via PUT
      // /vtc/rides/:id/respond (see RideService.offerToDriver/
      // respondToOffer) before the ride is really theirs. A miss (the
      // driver went offline or got taken by another customer in the few
      // seconds since the nearby list was fetched) is not a booking
      // failure — the ride (and its payment, if already charged above)
      // still exists, it just falls back to the normal admin-assign queue
      // like a driver-less request would.
      let finalRide = ride;
      if (data.driverId) {
        const offered = await rideService.offerToDriver(ride.id, data.driverId);
        if (offered) finalRide = offered;
      }

      if (finalRide.status === 'offered' || finalRide.status === 'accepted') {
        SocketService.broadcastRideStatusChanged(finalRide);
        if (finalRide.status === 'offered') {
          VtcNotificationService.sendRideOffered(finalRide.id).catch((err) =>
            console.error('[VtcNotification] sendRideOffered failed:', err)
          );
        }
      } else if (finalRide.status === 'requested') {
        SocketService.broadcastNewRideRequested(finalRide);
      }
      // status === 'scheduled': no driver search yet, nothing to broadcast
      // to the dispatch queue — VtcRideExpiryService.promoteDueScheduledRides
      // broadcasts it for real once it's actually promoted to 'requested'.

      return res.status(201).json({
        success: true,
        data: finalRide
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

      // Ownership: this had NO check at all — any authenticated account
      // (any customer or driver, not just this ride's own) could cancel
      // any ride by id, up to and including triggering a real wallet
      // refund onto a stranger's ride. Flagged live 2026-09-13 during a
      // production-readiness audit. Same "staff, or resolve who this is
      // and check it's actually theirs" pattern already used by
      // updateStatus/recordPoint — a cancel can legitimately come from
      // either the ride's own customer or its assigned driver, not just
      // staff.
      if (!req.userRole) {
        const existing: any = await rideService.getRideById(rideId);
        if (!existing) {
          return res.status(404).json({ success: false, message: 'Ride not found' });
        }
        const isOwnCustomer = req.userId != null && existing.customer_id === req.userId;
        const driver = req.userId ? await driverService.getDriverByUserId(req.userId) : null;
        const isOwnDriver = driver != null && existing.driver_id === driver.id;
        if (!isOwnCustomer && !isOwnDriver) {
          return res.status(403).json({ success: false, message: "Vous n'êtes pas autorisé à annuler cette course" });
        }
      }

      // Refund-if-paid + broadcast now live in RideService.cancelRideWithRefund
      // — shared with the auto-expiry sweep (VtcRideExpiryService) so the
      // wallet rule (refund only when `payment_status === 'completed'`,
      // fixed 2026-09-05 after it let a customer mint free wallet credit by
      // cancelling an unpaid cash ride) can't drift between call sites again.
      const ride: any = await rideService.cancelRideWithRefund(rideId, data);

      if (ride) {
        VtcNotificationService.sendRideCancelled(ride.id, ride.cancelled_by).catch((err) =>
          console.error('[VtcNotification] sendRideCancelled failed:', err)
        );
      }

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
      VtcNotificationService.sendRideAccepted(ride.id).catch((err) =>
        console.error('[VtcNotification] sendRideAccepted failed:', err)
      );

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
   * GET /v1/api/vtc/rides/customer/current
   * The authenticated customer's currently active ride, or null. Registered
   * before GET /rides/:id in vtc.router.ts so "customer" isn't parsed as a
   * ride id — same placement pattern as /rides/driver/current. Lets the
   * mobile app resume watching a ride (rejoin its socket room) after a cold
   * start instead of only ever knowing about one it just created itself.
   */
  async getCurrentRideForCustomer(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const ride = await rideService.getCurrentRideForCustomer(req.userId);
      return res.json({ success: true, data: ride });
    } catch (error: any) {
      console.error('Error getting current ride for customer:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * PUT /v1/api/vtc/rides/:id/respond
   * The driver answers a customer-chosen-driver offer (see
   * RideController.createRide's driverId handling / RideService
   * .offerToDriver). Resolved from the authenticated account's own
   * vtc_drivers row, same as getCurrentRideForDriver below — a driver can
   * only respond to their own offer, never one addressed to someone else.
   */
  async respondToOffer(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const driver = await driverService.getDriverByUserId(req.userId);
      if (!driver) {
        return res.status(404).json({ success: false, message: 'Aucun profil chauffeur pour ce compte' });
      }

      const rideId = parseInt((req.params as { id: string }).id);
      const { accept } = req.body as { accept: boolean };
      if (typeof accept !== 'boolean') {
        return res.status(400).json({ success: false, message: 'accept (boolean) is required' });
      }

      const ride = await rideService.respondToOffer(rideId, driver.id, accept);
      if (!ride) {
        return res.status(409).json({
          success: false,
          message: "Cette offre n'est plus valide (déjà répondue ou expirée)"
        });
      }

      SocketService.broadcastRideStatusChanged(ride);
      if (!accept) {
        // Back in the unassigned queue — same broadcast a fresh
        // driver-less request gets, so the admin dispatch screen's list
        // picks it back up.
        SocketService.broadcastNewRideRequested(ride);
      } else {
        VtcNotificationService.sendRideAccepted(ride.id).catch((err) =>
          console.error('[VtcNotification] sendRideAccepted failed:', err)
        );
      }

      return res.json({ success: true, data: ride });
    } catch (error: any) {
      console.error('Error responding to ride offer:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /v1/api/rides/driver/current
   * Driver mode home screen: the authenticated driver's currently active
   * ride (accepted/arrived/started), or null if none. Registered before
   * GET /rides/:id in vtc.router.ts so "driver" isn't parsed as an id.
   */
  async getCurrentRideForDriver(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const driver = await driverService.getDriverByUserId(req.userId);
      if (!driver) {
        return res.status(404).json({ success: false, message: "Aucun profil chauffeur pour ce compte" });
      }
      const ride = await rideService.getCurrentRideForDriver(driver.id);
      return res.json({ success: true, data: ride });
    } catch (error: any) {
      console.error('Error getting current ride for driver:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * GET /v1/api/vtc/rides/driver/history
   * Driver mode's "Mes courses" — this driver's own past (completed/
   * cancelled) rides. Same "resolve the caller's own driver profile from
   * their JWT" ownership pattern as getCurrentRideForDriver above.
   */
  async getRideHistoryForDriver(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      const driver = await driverService.getDriverByUserId(req.userId);
      if (!driver) {
        return res.status(404).json({ success: false, message: "Aucun profil chauffeur pour ce compte" });
      }
      const rides = await rideService.getRideHistoryForDriver(driver.id);
      return res.json({ success: true, data: rides });
    } catch (error: any) {
      console.error('Error getting ride history for driver:', error);
      return res.status(500).json({ success: false, message: error.message });
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

      // Ownership: a staff/admin token may always advance a ride (manual
      // override); a customer token may only if it resolves to the ride's
      // own assigned driver. Was wide open to any authenticated user before
      // Phase 2 gave drivers a resolvable identity — flagged but deferred
      // since Phase 0 (VTC_MODULE_PLAN.md §0.1).
      if (!req.userRole) {
        const ride: any = await rideService.getRideById(rideId);
        if (!ride) {
          return res.status(404).json({ success: false, message: 'Ride not found' });
        }
        const driver = req.userId ? await driverService.getDriverByUserId(req.userId) : null;
        if (!driver || ride.driver_id !== driver.id) {
          return res.status(403).json({ success: false, message: "Vous n'êtes pas le chauffeur de cette course" });
        }
      }

      const ride = await rideService.updateRideStatus(rideId, status);

      if (!ride) {
        return res.status(404).json({ success: false, message: 'Ride not found' });
      }
      SocketService.broadcastRideStatusChanged(ride);

      if (status === 'arrived') {
        VtcNotificationService.sendDriverArrived(ride.id).catch((err) =>
          console.error('[VtcNotification] sendDriverArrived failed:', err)
        );
      } else if (status === 'started') {
        VtcNotificationService.sendRideStarted(ride.id).catch((err) =>
          console.error('[VtcNotification] sendRideStarted failed:', err)
        );
      } else if (status === 'completed') {
        VtcNotificationService.sendRideCompleted(ride.id).catch((err) =>
          console.error('[VtcNotification] sendRideCompleted failed:', err)
        );
        // Commission / revenu Adigo — see CommissionService.recordForCompletedRide.
        // Best-effort, same as every other post-completion side effect here:
        // never blocks or fails the status update itself.
        commissionService.recordForCompletedRide(ride.id).catch((err) =>
          console.error('[CommissionService] recordForCompletedRide failed:', err)
        );
      }

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

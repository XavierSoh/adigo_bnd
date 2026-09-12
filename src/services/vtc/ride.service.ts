/**
 * VTC Ride Service
 * Business logic for ride management
 *
 * Migrated to Prisma's native model API (prisma.vtc_rides.*) — see
 * BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration",
 * tier 4) and VTC_MODULE_PLAN.md.
 */

import { Prisma } from '@prisma/client';
import prismaDb from '../../config/prismaClient';
import {
  VtcRide,
  CreateRideDto,
  RideEstimate,
  RateRideDto,
  CancelRideDto,
  RIDE_STATUS_TRANSITIONS
} from '../../models/vtc/ride.model';
import { WalletRepository } from '../../repository/wallet.repository';
import { SocketService } from '../socket.service';

const rideWithJoins = {
  vtc_drivers: { select: { first_name: true, last_name: true, phone: true } },
  customer: { select: { first_name: true, last_name: true, phone: true } },
} satisfies Prisma.vtc_ridesInclude;

function mapRide<T extends { vtc_drivers: { first_name: string; last_name: string; phone: string } | null; customer: { first_name: string; last_name: string; phone: string } }>(row: T) {
  const { vtc_drivers, customer, ...rest } = row;
  return {
    ...rest,
    driver_first_name: vtc_drivers?.first_name ?? null,
    driver_last_name: vtc_drivers?.last_name ?? null,
    driver_phone: vtc_drivers?.phone ?? null,
    customer_first_name: customer.first_name,
    customer_last_name: customer.last_name,
    customer_phone: customer.phone,
  };
}

/** Internal sentinel used only to abort assignDriver's transaction — see there. */
class DriverUnavailableError extends Error {}

export class RideService {
  /**
   * How long a ride can sit 'requested' with no driver before being
   * auto-cancelled and refunded (if paid) — see cancelStaleRequestedRides
   * and getRideById's lazy check below.
   */
  private readonly RIDE_EXPIRY_MINUTES = 15;

  /**
   * How long a customer-chosen-driver "offer" (see offerToDriver) can sit
   * unanswered before it's treated as declined and the ride falls back to
   * the normal unassigned 'requested' queue. Enforced two ways: the driver
   * app itself auto-declines client-side once its own countdown UI hits
   * zero (the fast path, seconds — see VtcDriverViewModel), and
   * expireStaleOfferedRides below is the server-side safety net for a
   * driver who never responds at all (app killed, no connectivity) — swept
   * once a minute by VtcRideExpiryService, the same cadence
   * cancelStaleRequestedRides already runs at.
   */
  private readonly OFFER_EXPIRY_SECONDS = 25;

  private readonly BASE_FARE_ECONOMY = 500; // FCFA
  private readonly BASE_FARE_COMFORT = 800;
  private readonly BASE_FARE_PREMIUM = 1500;
  private readonly FARE_PER_KM = 150;
  private readonly FARE_PER_MINUTE = 50;

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Estimate ride cost and duration
   */
  async estimateRide(
    pickupLat: number, pickupLon: number,
    dropoffLat: number, dropoffLon: number,
    vehicleType: 'economy' | 'comfort' | 'premium'
  ): Promise<RideEstimate> {
    const distance = this.calculateDistance(
      pickupLat, pickupLon,
      dropoffLat, dropoffLon
    );

    const duration = Math.ceil(distance / 0.5); // ~30 km/h average

    let baseFare = this.BASE_FARE_ECONOMY;
    if (vehicleType === 'comfort') baseFare = this.BASE_FARE_COMFORT;
    if (vehicleType === 'premium') baseFare = this.BASE_FARE_PREMIUM;

    const distanceFare = distance * this.FARE_PER_KM;
    const timeFare = duration * this.FARE_PER_MINUTE;

    // Check surge pricing (simplified)
    const surgeMultiplier = 1.0;

    const totalFare = Math.round(
      (baseFare + distanceFare + timeFare) * surgeMultiplier
    );

    return {
      vehicleType,
      estimatedDistance: distance,
      estimatedDuration: duration,
      baseFare,
      distanceFare: Math.round(distanceFare),
      timeFare: Math.round(timeFare),
      surgeMultiplier,
      totalFare
    };
  }

  /**
   * Look up a ride already created for this (customer, idempotencyKey) pair
   * — the fast path RideController.createRide checks before doing anything
   * else (estimate, wallet balance check/debit, socket broadcast), so a
   * retried request (client timeout + retry, not just a UI double-tap —
   * that's handled client-side in adigo_mobile) replays the original result
   * instead of creating a second ride and a second wallet debit. Found
   * missing during the 2026-09-05 VTC audit.
   */
  async findByIdempotencyKey(customerId: number, idempotencyKey: string): Promise<VtcRide | null> {
    const row = await prismaDb.vtc_rides.findFirst({
      // A cancelled (or completed) row is a *finished* intent, not one that
      // might still need replaying — matching it here meant a customer who
      // cancelled and then tapped "book" again without changing anything
      // (so the idempotency key never got regenerated) got the same
      // already-cancelled ride silently handed back as a "success", with
      // no new row ever created and therefore no offer ever reaching a
      // driver. Flagged live 2026-09-11: "il ne reçoit pas la commande
      // après que le client ait annulé". A genuinely fresh booking must
      // always be allowed to create a new ride once the old one it might
      // share a (possibly stale) key with is no longer in flight.
      where: { customer_id: customerId, idempotency_key: idempotencyKey, status: { notIn: ['completed', 'cancelled'] } },
    });
    return row as unknown as VtcRide | null;
  }

  /**
   * Create a new ride request
   */
  async createRide(data: CreateRideDto): Promise<VtcRide> {
    const estimate = await this.estimateRide(
      data.pickupLatitude, data.pickupLongitude,
      data.dropoffLatitude, data.dropoffLongitude,
      data.vehicleType
    );

    try {
      const result = await prismaDb.vtc_rides.create({
        data: {
          customer_id: data.customerId,
          vehicle_type: data.vehicleType,
          pickup_address: data.pickupAddress,
          pickup_latitude: data.pickupLatitude,
          pickup_longitude: data.pickupLongitude,
          dropoff_address: data.dropoffAddress,
          dropoff_latitude: data.dropoffLatitude,
          dropoff_longitude: data.dropoffLongitude,
          base_fare: estimate.baseFare,
          distance_fare: estimate.distanceFare,
          time_fare: estimate.timeFare,
          surge_multiplier: estimate.surgeMultiplier,
          total_fare: estimate.totalFare,
          estimated_distance: estimate.estimatedDistance,
          estimated_duration: estimate.estimatedDuration,
          payment_method: data.paymentMethod,
          idempotency_key: data.idempotencyKey ?? null,
          status: 'requested',
        } as Prisma.vtc_ridesUncheckedCreateInput,
      });

      return result as unknown as VtcRide;
    } catch (error) {
      // Belt-and-suspenders for a true race (two requests with the same key
      // reaching this insert within microseconds of each other, both having
      // passed the controller's findByIdempotencyKey check before either
      // committed) — the unique (customer_id, idempotency_key) index lets
      // only one insert win; the loser gets Postgres error 23505 surfaced by
      // Prisma as P2002. Return the winner's row instead of a 500.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        data.idempotencyKey
      ) {
        const existing = await this.findByIdempotencyKey(data.customerId, data.idempotencyKey);
        if (existing) return existing;
      }
      throw error;
    }
  }

  /**
   * Get ride by ID, with driver and customer identity joined in — used by
   * both the customer-facing detail view and the admin ride detail screen.
   */
  async getRideById(rideId: number): Promise<VtcRide | null> {
    const row = await prismaDb.vtc_rides.findUnique({ where: { id: rideId }, include: rideWithJoins });
    if (!row) return null;

    // Lazy safety net for the same expiry cancelStaleRequestedRides sweeps
    // periodically (see VtcRideExpiryService) — catches it here too on
    // whatever next read actually happens (a customer reopening the
    // tracking screen, an admin opening the ride, the driver-mode poll),
    // so an abandoned 'requested' ride still gets unstuck+refunded even if
    // the periodic sweep is slow, missed a tick, or (in an environment
    // where a long-lived cron process isn't guaranteed to keep running)
    // never fires at all. Found necessary during the 2026-09-05 audit,
    // where the periodic sweep alone could not be confirmed firing in the
    // local dev process within a reasonable wait.
    if (row.status === 'requested' && this.isStale(row.created_at)) {
      const cancelled = await this.cancelRideWithRefund(rideId, {
        reason: 'Aucun chauffeur disponible dans le délai imparti',
        cancelledBy: 'system',
      });
      if (cancelled) return cancelled;
    }

    return mapRide(row) as unknown as VtcRide;
  }

  private isStale(createdAt: Date | null): boolean {
    if (!createdAt) return false;
    return Date.now() - createdAt.getTime() > this.RIDE_EXPIRY_MINUTES * 60 * 1000;
  }

  /**
   * Get customer rides
   */
  async getCustomerRides(customerId: number): Promise<VtcRide[]> {
    const rows = await prismaDb.vtc_rides.findMany({
      where: { customer_id: customerId },
      orderBy: { created_at: 'desc' },
    });
    return rows as unknown as VtcRide[];
  }

  /**
   * The customer's currently active ride (requested/offered/accepted/
   * arrived/started), if any. Symmetric with getCurrentRideForDriver below,
   * but this one didn't exist until 2026-09-09: the customer app only ever
   * learned about a ride from the in-memory result of `requestRide()` and
   * the socket room it joined right after, so a killed-and-reopened app (or
   * any fresh VTCViewModel instance) had no way to rediscover an already
   * in-progress ride or rejoin its `vtc_ride_<id>` room — live tracking
   * silently went dark, flagged live watching a driver "arrive" with no
   * visible marker movement on the customer's map.
   */
  async getCurrentRideForCustomer(customerId: number): Promise<VtcRide | null> {
    const row = await prismaDb.vtc_rides.findFirst({
      where: { customer_id: customerId, status: { in: ['requested', 'offered', 'accepted', 'arrived', 'started'] } },
      include: rideWithJoins,
      orderBy: { created_at: 'desc' },
    });
    return row ? (mapRide(row) as unknown as VtcRide) : null;
  }

  /**
   * The driver's currently active ride (accepted/arrived/started), if any —
   * what a driver-mode home screen shows. At most one should ever exist per
   * driver (assignDriver only assigns 'online' drivers and flips them
   * 'busy'), but `findFirst` rather than assuming that invariant never
   * breaks.
   */
  async getCurrentRideForDriver(driverId: number): Promise<VtcRide | null> {
    // 'offered' included so the driver app's existing 8s idle poll (see
    // VtcDriverViewModel._tick's doc comment — there's no per-driver push
    // channel yet) is also how a driver notices a customer just picked
    // them and is waiting on an accept/decline, not just an
    // already-confirmed ride.
    const row = await prismaDb.vtc_rides.findFirst({
      where: { driver_id: driverId, status: { in: ['offered', 'accepted', 'arrived', 'started'] } },
      include: rideWithJoins,
      orderBy: { created_at: 'desc' },
    });
    return row ? (mapRide(row) as unknown as VtcRide) : null;
  }

  /**
   * Driver mode's own "Mes courses" — every ride this driver has ever been
   * assigned that's no longer in progress (completed or cancelled),
   * customer identity joined in the same way getAllRides already does for
   * the admin dashboard. Was a real, confirmed gap until now: the driver
   * app could only ever see its single *current* ride via
   * getCurrentRideForDriver above, nothing historical — flagged live
   * 2026-09-09 testing the full ride lifecycle end-to-end.
   */
  async getRideHistoryForDriver(driverId: number, limit: number = 50): Promise<VtcRide[]> {
    const rows = await prismaDb.vtc_rides.findMany({
      where: { driver_id: driverId, status: { in: ['completed', 'cancelled'] } },
      include: rideWithJoins,
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    return rows.map((r) => mapRide(r) as unknown as VtcRide);
  }

  /**
   * List rides for the admin dashboard — there is no automatic
   * driver-matching yet, so this is how staff find rides that need a
   * driver assigned by hand. Joins both the driver AND the customer: the
   * admin desktop previously showed only the driver's name, leaving staff
   * with no way to identify who actually booked a ride.
   */
  async getAllRides(status?: string, customerId?: number, driverId?: number): Promise<VtcRide[]> {
    const where: Prisma.vtc_ridesWhereInput = {};
    if (status) where.status = status;
    if (customerId) where.customer_id = customerId;
    if (driverId) where.driver_id = driverId;

    const hasFilters = Object.keys(where).length > 0;

    const rows = await prismaDb.vtc_rides.findMany({
      where,
      include: rideWithJoins,
      orderBy: { created_at: 'desc' },
      ...(hasFilters ? {} : { take: 200 }),
    });
    return rows.map((r) => mapRide(r) as unknown as VtcRide);
  }

  /**
   * Manually assign a driver to a ride (admin action — no automatic
   * matching exists). Only succeeds while the ride is still 'requested',
   * so two staff members racing to assign the same ride can't both win.
   * Also requires the driver to still be 'online' at this exact moment,
   * flipping them to 'busy' atomically — a live audit (2026-09-05) found
   * that the previous version flipped the driver to 'busy' on success but
   * never checked that status on a *later* call, so the same driver could
   * be assigned to a second (or third...) simultaneous ride with no
   * rejection at all. Reproduced live: assigning an already-'busy' driver
   * to a second ride succeeded outright.
   */
  async assignDriver(rideId: number, driverId: number): Promise<VtcRide | null> {
    try {
      return await prismaDb.$transaction(async (tx) => {
        const updateResult = await tx.vtc_rides.updateMany({
          where: { id: rideId, status: 'requested' },
          data: { driver_id: driverId, status: 'accepted' },
        });
        if (updateResult.count === 0) return null;

        // Atomic guard: flips 'online' → 'busy' only if the driver is
        // *still* 'online' right now. A plain `.update()` (the old code)
        // writes 'busy' unconditionally, whatever the driver's current
        // status — no signal that the assignment should have been refused.
        const driverFlip = await tx.vtc_drivers.updateMany({
          where: { id: driverId, status: 'online' },
          data: { status: 'busy' },
        });
        if (driverFlip.count === 0) {
          // Not 'online' (already busy/offline/suspended, or a bad id) —
          // abort the whole transaction, including the ride update above.
          // A `return null` here would still commit that update; only a
          // thrown error rolls back an interactive Prisma transaction.
          throw new DriverUnavailableError();
        }

        return await tx.vtc_rides.findUnique({ where: { id: rideId } }) as unknown as VtcRide;
      });
    } catch (error) {
      if (error instanceof DriverUnavailableError) return null;
      throw error;
    }
  }

  /**
   * Customer picked a specific driver at booking time (the "choisir son
   * chauffeur" list, GET /vtc/drivers/nearby) — unlike assignDriver (an
   * admin action that jumps straight to 'accepted'), this only *offers* the
   * ride: the driver still has to accept via respondToOffer below before
   * it's really theirs. The driver is flipped 'online' -> 'offered' (not
   * 'busy') atomically, both so a second customer's nearby-drivers query
   * won't also try to offer them a ride while this one is still pending,
   * and so declining/expiring can cleanly put them straight back 'online'.
   */
  async offerToDriver(rideId: number, driverId: number): Promise<VtcRide | null> {
    try {
      return await prismaDb.$transaction(async (tx) => {
        // `updated_at` isn't `@updatedAt` in schema.prisma (it never bumps
        // on its own on any update anywhere in this model) — set it here
        // explicitly, since expireStaleOfferedRides' cutoff is measured
        // from it. Without this it would compare against the ride's
        // original `created_at`-seeded value and could expire an offer
        // that was just made a second ago if the ride itself had already
        // been sitting 'requested' for a while first.
        const updateResult = await tx.vtc_rides.updateMany({
          where: { id: rideId, status: 'requested' },
          data: { driver_id: driverId, status: 'offered', updated_at: new Date() },
        });
        if (updateResult.count === 0) return null;

        const driverFlip = await tx.vtc_drivers.updateMany({
          where: { id: driverId, status: 'online' },
          data: { status: 'offered' },
        });
        if (driverFlip.count === 0) throw new DriverUnavailableError();

        return await tx.vtc_rides.findUnique({ where: { id: rideId } }) as unknown as VtcRide;
      });
    } catch (error) {
      if (error instanceof DriverUnavailableError) return null;
      throw error;
    }
  }

  /**
   * The driver answers an offer from offerToDriver. Accept: 'offered' ->
   * 'accepted' (ride) / 'offered' -> 'busy' (driver), same shape as
   * assignDriver. Decline: ride falls back to unassigned 'requested' (picks
   * up the normal admin-assign queue, or another customer's nearby list)
   * and the driver goes straight back to 'online'. Both are atomic and only
   * apply to *this* driver's *own* offer — a driverId that doesn't match
   * the ride's current driver_id (stale/replayed request) is a no-op,
   * returning null rather than silently touching someone else's ride.
   */
  async respondToOffer(rideId: number, driverId: number, accept: boolean): Promise<VtcRide | null> {
    return prismaDb.$transaction(async (tx) => {
      const rideUpdate = await tx.vtc_rides.updateMany({
        where: { id: rideId, driver_id: driverId, status: 'offered' },
        data: accept
          ? { status: 'accepted' }
          : { status: 'requested', driver_id: null },
      });
      if (rideUpdate.count === 0) return null;

      await tx.vtc_drivers.updateMany({
        where: { id: driverId, status: 'offered' },
        data: { status: accept ? 'busy' : 'online' },
      });

      return await tx.vtc_rides.findUnique({ where: { id: rideId } }) as unknown as VtcRide;
    });
  }

  /**
   * Server-side safety net for an offer nobody ever answered (driver's app
   * killed, no connectivity — the fast path is the driver app's own
   * countdown calling respondToOffer(accept: false) itself). Swept from the
   * same per-minute cron as cancelStaleRequestedRides, see
   * VtcRideExpiryService.
   */
  async expireStaleOfferedRides(timeoutSeconds: number = this.OFFER_EXPIRY_SECONDS): Promise<VtcRide[]> {
    const cutoff = new Date(Date.now() - timeoutSeconds * 1000);
    const stale = await prismaDb.vtc_rides.findMany({
      where: { status: 'offered', updated_at: { lt: cutoff } },
      select: { id: true, driver_id: true },
    });

    const expired: VtcRide[] = [];
    for (const { id, driver_id } of stale) {
      if (driver_id == null) continue;
      const ride = await this.respondToOffer(id, driver_id, false);
      if (ride) {
        SocketService.broadcastNewRideRequested(ride);
        expired.push(ride);
      }
    }
    return expired;
  }

  /**
   * Advance a ride to the next status in its lifecycle (accepted → arrived →
   * started → completed). Rejects skipped/backwards transitions. Completing
   * a ride frees the driver back to 'online' — mirrors the 'busy' flip in
   * assignDriver.
   */
  async updateRideStatus(rideId: number, newStatus: string): Promise<VtcRide | null> {
    return prismaDb.$transaction(async (tx) => {
      const current = await tx.vtc_rides.findUnique({
        where: { id: rideId },
        select: { status: true, driver_id: true },
      });
      if (!current) return null;

      const allowed = RIDE_STATUS_TRANSITIONS[current.status ?? ''] || [];
      if (!allowed.includes(newStatus)) {
        throw new Error(
          `Transition invalide : ${current.status} → ${newStatus}`
        );
      }

      const ride = await tx.vtc_rides.update({
        where: { id: rideId },
        data: {
          status: newStatus,
          ...(newStatus === 'completed' ? { dropoff_time: new Date() } : {}),
        },
      });

      if (newStatus === 'completed' && current.driver_id) {
        await tx.vtc_drivers.update({ where: { id: current.driver_id }, data: { status: 'online' } });
      }

      return ride as unknown as VtcRide;
    });
  }

  /**
   * Cancel a ride. Also frees the assigned driver back to 'online' — same
   * reasoning as completing a ride.
   */
  async cancelRide(rideId: number, data: CancelRideDto): Promise<VtcRide | null> {
    return prismaDb.$transaction(async (tx) => {
      const updateResult = await tx.vtc_rides.updateMany({
        where: { id: rideId, status: { not: 'cancelled' } },
        // Clearing `idempotency_key` here is what actually makes
        // findByIdempotencyKey's 2026-09-11 fix work end to end: excluding
        // a cancelled row from that *lookup* means a follow-up booking
        // with the same key is no longer treated as a replay of it — but
        // the unique `(customer_id, idempotency_key)` index doesn't know
        // about status at all, so the follow-up's actual INSERT still hit
        // that constraint and 500'd (found live 2026-09-12, writing the
        // regression test for the original fix). Postgres never treats two
        // NULLs as equal for a plain unique index, so any number of
        // cancelled rides can freely share a now-NULL key.
        data: { status: 'cancelled', cancellation_reason: data.reason, cancelled_by: data.cancelledBy, idempotency_key: null },
      });
      if (updateResult.count === 0) return null;

      const ride = await tx.vtc_rides.findUnique({ where: { id: rideId } });
      if (ride?.driver_id) {
        await tx.vtc_drivers.update({ where: { id: ride.driver_id }, data: { status: 'online' } });
      }
      return ride as unknown as VtcRide;
    });
  }

  /**
   * Cancel a ride, refund it if (and only if) it was actually paid, and
   * broadcast the change — the combination RideController.cancelRide used
   * to do inline. Moved here so the same, single, already-audited refund
   * rule (2026-09-05: refund only when `payment_status === 'completed'` —
   * see cancelRide's own history) backs every caller, including the
   * auto-expiry sweep below, instead of each call site re-implementing it
   * and risking the two drifting apart.
   */
  async cancelRideWithRefund(rideId: number, data: CancelRideDto): Promise<VtcRide | null> {
    const ride: any = await this.cancelRide(rideId, data);
    if (!ride) return ride;

    SocketService.broadcastRideStatusChanged(ride);

    if (ride.total_fare > 0 && ride.payment_status === 'completed') {
      const refundResult = await WalletRepository.recordRefund(
        ride.customer_id,
        Number(ride.total_fare),
        `Remboursement course VTC annulée #${ride.id} (payée via ${ride.payment_method})`
      );
      if (!refundResult.status) {
        console.error(`Wallet refund failed for cancelled ride #${ride.id}:`, refundResult.message);
      }
    }

    return ride;
  }

  /**
   * Auto-cancels rides stuck in 'requested' too long. There is no automatic
   * driver matching — an admin assigns one by hand from the desktop — so
   * without this, a customer who requests a ride, pays by wallet, and then
   * just closes the app (no admin ever gets to it) would have their money
   * held on a 'requested' row forever. Run every minute by
   * VtcRideExpiryService.
   */
  async cancelStaleRequestedRides(timeoutMinutes: number = this.RIDE_EXPIRY_MINUTES): Promise<VtcRide[]> {
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    const stale = await prismaDb.vtc_rides.findMany({
      where: { status: 'requested', created_at: { lt: cutoff } },
      select: { id: true },
    });

    const cancelled: VtcRide[] = [];
    for (const { id } of stale) {
      const ride = await this.cancelRideWithRefund(id, {
        reason: 'Aucun chauffeur disponible dans le délai imparti',
        cancelledBy: 'system',
      });
      if (ride) cancelled.push(ride);
    }
    return cancelled;
  }

  /**
   * Mark a ride's payment as completed — called right after a successful
   * wallet debit in the controller (createRide charges the wallet after the
   * row already exists, so this is a separate step rather than part of the
   * INSERT).
   */
  async markPaymentCompleted(rideId: number): Promise<VtcRide | null> {
    const result = await prismaDb.vtc_rides.updateMany({
      where: { id: rideId },
      data: { payment_status: 'completed' },
    });
    if (result.count === 0) return null;
    return await prismaDb.vtc_rides.findUnique({ where: { id: rideId } }) as unknown as VtcRide;
  }

  /**
   * Rate a ride
   */
  async rateRide(
    rideId: number,
    ratedBy: 'customer' | 'driver',
    data: RateRideDto
  ): Promise<VtcRide | null> {
    const update: Prisma.vtc_ridesUncheckedUpdateInput = ratedBy === 'customer'
      ? { driver_rating: data.rating, driver_feedback: data.feedback }
      : { customer_rating: data.rating, customer_feedback: data.feedback };

    const result = await prismaDb.vtc_rides.updateMany({ where: { id: rideId }, data: update });
    if (result.count === 0) return null;
    return await prismaDb.vtc_rides.findUnique({ where: { id: rideId } }) as unknown as VtcRide;
  }
}

export default new RideService();

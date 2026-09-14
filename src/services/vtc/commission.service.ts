/**
 * Commission / revenu Adigo — "manquements pour la production" audit,
 * 2026-09-13/14: VTC rides are cash-direct-to-driver with zero platform
 * revenue capture. 10% confirmed with the user (matches the existing
 * ticketing resale commission — event-ticket-resale.model.ts).
 *
 * One ledger row per completed ride (vtc_commission_ledger — see
 * migrate_vtc_commission.ts). A driver with a linked customer wallet
 * (self-registered, `vtc_drivers.user_id` set) gets debited immediately —
 * `status: 'settled'` right away; an admin-onboarded driver (no wallet to
 * debit) stays `status: 'pending'` until a staff member settles it by hand
 * (cash/mobile-money collected in person) via PUT /vtc/commission/:id/settle.
 */
import prismaDb from '../../config/prismaClient';
import { WalletRepository } from '../../repository/wallet.repository';

export class CommissionService {
  private readonly DEFAULT_RATE = 10.0; // percent

  /**
   * Called once, right after a ride actually completes (see
   * RideService.updateRideStatus). Idempotent — a ride_id already ledgered
   * is left untouched rather than double-charged, in case this is ever
   * invoked more than once for the same ride.
   */
  async recordForCompletedRide(rideIdRaw: number | string): Promise<void> {
    // `rideIdRaw` accepts number|string because callers pass the ride row's
    // own `.id` straight through, and that field is typed `string` in the
    // legacy (pre-Prisma-migration) VtcRide interface even though it's a
    // real integer at runtime — same ambiguity VtcNotificationService
    // already has to accept.
    const rideId = Number(rideIdRaw);
    const ride = await prismaDb.vtc_rides.findUnique({
      where: { id: rideId },
      select: { driver_id: true, total_fare: true },
    });
    // No driver assigned shouldn't be reachable for a 'completed' ride (the
    // whole lifecycle requires one), but defensive rather than crashing the
    // status-update it's piggybacking on.
    if (!ride?.driver_id) return;

    const existing = await prismaDb.vtc_commission_ledger.findUnique({ where: { ride_id: rideId } });
    if (existing) return;

    // Gross fare already reflects any promo-code discount (subtracted onto
    // `total_fare` at booking time — see RideService.createRide) — the
    // commission is naturally computed on the net amount, never negative.
    const grossFare = Number(ride.total_fare);
    const commissionAmount = Math.round((grossFare * this.DEFAULT_RATE) / 100);

    const driver = await prismaDb.vtc_drivers.findUnique({
      where: { id: ride.driver_id },
      select: { user_id: true },
    });

    let status: 'settled' | 'pending' = 'pending';
    let settledAt: Date | null = null;
    if (driver?.user_id) {
      const result = await WalletRepository.recordPayment(
        driver.user_id,
        commissionAmount,
        `Commission Adigo course VTC #${rideId}`
      );
      if (result.status) {
        status = 'settled';
        settledAt = new Date();
      }
      // A failed debit (insufficient wallet balance, etc.) just leaves this
      // 'pending' for manual settlement — never blocks the ride completion
      // it's piggybacking on.
    }

    await prismaDb.vtc_commission_ledger.create({
      data: {
        ride_id: rideId,
        driver_id: ride.driver_id,
        gross_fare: grossFare,
        commission_rate: this.DEFAULT_RATE,
        commission_amount: commissionAmount,
        status,
        settled_at: settledAt,
      },
    });
  }

  /** Global totals for the admin "Commission" tab's header. */
  async getSummary() {
    const [pendingAgg, settledAgg] = await Promise.all([
      prismaDb.vtc_commission_ledger.aggregate({ where: { status: 'pending' }, _sum: { commission_amount: true }, _count: true }),
      prismaDb.vtc_commission_ledger.aggregate({ where: { status: 'settled' }, _sum: { commission_amount: true }, _count: true }),
    ]);
    return {
      pendingAmount: Number(pendingAgg._sum.commission_amount ?? 0),
      pendingCount: pendingAgg._count,
      settledAmount: Number(settledAgg._sum.commission_amount ?? 0),
      settledCount: settledAgg._count,
    };
  }

  /** Per-driver breakdown — who owes what, and their settlement history. */
  async getByDriver() {
    const rows = await prismaDb.vtc_commission_ledger.findMany({
      include: {
        vtc_drivers: { select: { first_name: true, last_name: true, phone: true } },
      },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      rideId: r.ride_id,
      driverId: r.driver_id,
      driverName: `${r.vtc_drivers.first_name} ${r.vtc_drivers.last_name}`,
      driverPhone: r.vtc_drivers.phone,
      grossFare: Number(r.gross_fare),
      commissionRate: Number(r.commission_rate),
      commissionAmount: Number(r.commission_amount),
      status: r.status,
      settledAt: r.settled_at,
      createdAt: r.created_at,
    }));
  }

  /** Admin marks a 'pending' row settled by hand (cash/mobile-money collected in person). */
  async settle(ledgerId: number, adminId?: number) {
    const result = await prismaDb.vtc_commission_ledger.updateMany({
      where: { id: ledgerId, status: 'pending' },
      data: { status: 'settled', settled_at: new Date(), settled_by: adminId ?? null },
    });
    if (result.count === 0) return null;
    return prismaDb.vtc_commission_ledger.findUnique({ where: { id: ledgerId } });
  }
}

export default new CommissionService();

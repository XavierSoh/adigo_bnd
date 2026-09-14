/**
 * VTC promo codes — "manquements vs. Uber/Bolt/inDrive" audit,
 * 2026-09-13/14. `promo_code` (admin CRUD only, `AdminPromoRepository`) and
 * its `uses_count` counter already existed for ticketing, but no
 * validation/redemption route existed anywhere for any module — this is
 * the first one. Reused rather than duplicated: `applies_to` scopes a code
 * to a module (default 'all', so pre-existing ticketing codes keep working
 * unchanged), and the new `promo_code_usage` table (see
 * migrate_vtc_promo.ts) is what actually stops the same customer redeeming
 * a code twice — the existing `uses_count` is only a global counter.
 *
 * Since VTC stays cash-direct-to-driver (no online payment for the ride
 * itself — confirmed with the user), a promo discount is never "charged"
 * anywhere: it simply reduces the cash amount the customer owes the
 * driver. The corresponding reduction in Adigo's cut is handled on the
 * commission side (RideService.updateRideStatus), not here.
 */
import prismaDb from '../../config/prismaClient';

export interface PromoPreview {
  valid: boolean;
  reason?: string;
  promoCodeId?: number;
  discountType?: string;
  discountValue?: number;
  /** FCFA amount actually deducted from `fareBeforeDiscount` — never more than the fare itself. */
  discountAmount?: number;
}

export class PromoService {
  /**
   * Read-only check — used by estimateRide to show a live preview as the
   * customer types a code. Never throws: an invalid code is just
   * `{ valid: false, reason }`, not an error, so a typo mid-entry doesn't
   * break the price preview.
   */
  async preview(code: string, customerId: number, fareBeforeDiscount: number): Promise<PromoPreview> {
    const promo = await prismaDb.promo_code.findUnique({ where: { code: code.toUpperCase() } });
    if (!promo || promo.is_deleted) return { valid: false, reason: 'Code promo invalide' };
    if (!promo.is_active) return { valid: false, reason: 'Ce code promo est désactivé' };

    const appliesTo = promo.applies_to ?? 'all';
    if (appliesTo !== 'all' && appliesTo !== 'vtc') {
      return { valid: false, reason: "Ce code promo ne s'applique pas au VTC" };
    }

    const now = new Date();
    if (promo.valid_from && now < promo.valid_from) return { valid: false, reason: "Ce code promo n'est pas encore actif" };
    if (promo.valid_until && now > promo.valid_until) return { valid: false, reason: 'Ce code promo a expiré' };
    if (promo.max_uses != null && promo.uses_count >= promo.max_uses) {
      return { valid: false, reason: 'Ce code promo a atteint son nombre maximal d\'utilisations' };
    }
    if (promo.min_purchase_amount && fareBeforeDiscount < promo.min_purchase_amount) {
      return { valid: false, reason: `Montant minimum requis : ${promo.min_purchase_amount} FCFA` };
    }

    const alreadyUsed = await prismaDb.promo_code_usage.findFirst({
      where: { promo_code_id: promo.id, customer_id: customerId },
      select: { id: true },
    });
    if (alreadyUsed) return { valid: false, reason: 'Vous avez déjà utilisé ce code promo' };

    const discountAmount = this.computeDiscount(promo.discount_type, promo.discount_value, fareBeforeDiscount);
    return {
      valid: true,
      promoCodeId: promo.id,
      discountType: promo.discount_type,
      discountValue: promo.discount_value,
      discountAmount,
    };
  }

  /**
   * Every currently-active code a VTC customer could actually use — 'vtc'
   * and 'all'-scoped, excludes 'ticketing'-only codes. Powers the
   * customer-facing "Promotions" screen (mobile drawer entry, previously a
   * dead "bientôt disponible" stub).
   */
  async listActive() {
    const now = new Date();
    return prismaDb.promo_code.findMany({
      where: {
        is_deleted: false,
        is_active: true,
        applies_to: { in: ['vtc', 'all'] },
        OR: [{ valid_until: null }, { valid_until: { gte: now } }],
      },
      orderBy: { created_at: 'desc' },
      select: {
        code: true, discount_type: true, discount_value: true,
        min_purchase_amount: true, valid_until: true,
      },
    });
  }

  private computeDiscount(discountType: string, discountValue: number, fareBeforeDiscount: number): number {
    const raw = discountType === 'percentage'
      ? Math.round((fareBeforeDiscount * discountValue) / 100)
      : discountValue;
    // Never discounts below zero — a fixed-amount code larger than the fare
    // just makes the ride free, not negative.
    return Math.max(0, Math.min(raw, fareBeforeDiscount));
  }

  /**
   * Applies a promo code to a ride actually being created. Re-validates
   * from scratch server-side (never trusts a client-supplied
   * "this was valid a moment ago" — the estimate's preview could be stale
   * by the time the booking button is tapped) and records the redemption
   * transactionally, so a race between two requests for the same
   * (promo, customer) pair can't both succeed (the DB-level unique
   * constraint on promo_code_usage is the actual guarantee — P2002 on the
   * loser, treated the same as "already used").
   */
  async redeem(code: string, customerId: number, rideId: number, fareBeforeDiscount: number): Promise<PromoPreview> {
    const preview = await this.preview(code, customerId, fareBeforeDiscount);
    if (!preview.valid || !preview.promoCodeId) return preview;

    try {
      await prismaDb.$transaction([
        prismaDb.promo_code.update({
          where: { id: preview.promoCodeId },
          data: { uses_count: { increment: 1 } },
        }),
        prismaDb.promo_code_usage.create({
          data: { promo_code_id: preview.promoCodeId, customer_id: customerId, vtc_ride_id: rideId },
        }),
      ]);
      return preview;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return { valid: false, reason: 'Vous avez déjà utilisé ce code promo' };
      }
      throw error;
    }
  }
}

export default new PromoService();

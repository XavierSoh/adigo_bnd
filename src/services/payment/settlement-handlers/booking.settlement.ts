import { registerSettlementHandler } from "../payment-settlement.registry";
import { BookingRepository } from "../../../repository/booking.repository";
import { TierService } from "../../tier.service";
import { pgOneOrNone, pgAny } from "../../../utils/prisma-compat";

/**
 * Wired to both booking payment entry points:
 * - POST /v1/api/booking/pay/orange-money (single seat)
 * - POST /v1/api/booking/multiple with payment_method 'orangeMoney'
 *   (BookingController.createMultiple) — group bookings share one payment,
 *   so on success this confirms every booking in the group, not just the
 *   one the transaction happens to reference.
 */
registerSettlementHandler('booking', async (transaction) => {
    if (!transaction.purpose_ref_id) {
        console.error(`⚠️ booking settlement: no purpose_ref_id on transaction ${transaction.id}`);
        return;
    }
    const reference = transaction.provider_txn_id || transaction.pay_token || undefined;

    const booking = await pgOneOrNone(
        `SELECT id, group_id FROM booking WHERE id = $1`,
        [transaction.purpose_ref_id]
    );
    if (!booking) {
        console.error(`⚠️ booking settlement: booking ${transaction.purpose_ref_id} not found`);
        return;
    }

    const bookingIds: number[] = booking.group_id
        ? (await pgAny(
              `SELECT id FROM booking WHERE group_id = $1 AND is_deleted = FALSE`,
              [booking.group_id]
          )).map((b: any) => b.id)
        : [booking.id];

    for (const id of bookingIds) {
        const result = await BookingRepository.update(id, {
            status: 'confirmed',
            payment_reference: reference,
        } as any);
        if (!result.status) {
            console.error(
                `⚠️ Booking settlement failed for booking ${id} (payment_transaction ${transaction.id}):`,
                result.message
            );
            continue;
        }
        // BookingRepository.create() only awards loyalty points for
        // bookings that are already 'confirmed' at insert time (wallet,
        // cash) — Orange Money bookings start 'pending', so award them here
        // instead, now that the charge is actually verified.
        const confirmed = result.body as any;
        if (confirmed?.total_price) {
            await TierService.addLoyaltyPoints(
                confirmed.customer_id,
                confirmed.total_price,
                `Booking ${confirmed.booking_reference || confirmed.id}`
            );
        }
    }
});

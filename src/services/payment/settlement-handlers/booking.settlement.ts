// Migrated to Prisma's native model API — see BOOKING_MODULE_NOTES.md
// ("Full Prisma relational-API migration", tier 4).
import { registerSettlementHandler } from "../payment-settlement.registry";
import { BookingRepository } from "../../../repository/booking.repository";
import { TierService } from "../../tier.service";
import prismaDb from "../../../config/prismaClient";

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

    const booking = await prismaDb.booking.findUnique({
        where: { id: transaction.purpose_ref_id },
        select: { id: true, group_id: true },
    });
    if (!booking) {
        console.error(`⚠️ booking settlement: booking ${transaction.purpose_ref_id} not found`);
        return;
    }

    let bookingIds: number[];
    if (booking.group_id) {
        const groupResult = await BookingRepository.findByGroupId(booking.group_id);
        bookingIds = groupResult.status ? (groupResult.body as any[]).map((b) => b.id) : [];
    } else {
        bookingIds = [booking.id];
    }

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

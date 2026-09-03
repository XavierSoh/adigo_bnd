import { Request, Response } from "express";
import { BookingRepository } from "../repository/booking.repository";
import { CustomerRepository } from "../repository/customer.repository";
import { WalletRepository } from "../repository/wallet.repository";
import { GeneratedTripRepository } from "../repository/generated-trip.repository";
import { GeneratedTripSeatRepository } from "../repository/generated_trip_seat_repository";
import { Booking } from "../models/booking.model";
import { I18n } from "../utils/i18n";
import { calculateTierDiscount } from "../config/tier.config";
import { SocketService } from "../services/socket.service";
import { PaymentService } from "../services/payment/payment.service";

export class BookingController {
    /**
     * Creates a booking in 'pending' status and initiates a real Orange
     * Money payment for it — the booking only becomes 'confirmed' once the
     * customer approves the charge on their own phone (see
     * settlement-handlers/booking.settlement.ts).
     *
     * This is a new, separate entry point from create(): it does not change
     * the existing behavior of POST /booking, which still lets a caller
     * mark any booking 'confirmed' immediately regardless of payment_method
     * (a known, still-open gap for that endpoint specifically — see the
     * production audit). Mobile needs to be updated to call this instead
     * for Orange Money bookings before that gap is closed there too.
     */
    static async initiateOrangeMoneyPayment(req: Request, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ status: false, message: "Unauthorized", code: 401 });
                return;
            }

            const { generated_trip_id, generated_trip_seat_id, total_price, subscriber_msisdn } = req.body;

            if (!generated_trip_id || !generated_trip_seat_id || !total_price || !subscriber_msisdn) {
                res.status(400).json({
                    status: false,
                    message: "generated_trip_id, generated_trip_seat_id, total_price et subscriber_msisdn sont requis",
                    code: 400
                });
                return;
            }

            const availabilityCheck = await BookingRepository.checkSeatAvailability(
                generated_trip_id,
                generated_trip_seat_id
            );
            if (availabilityCheck.body && !(availabilityCheck.body as any).available) {
                res.status(409).json({
                    status: false,
                    message: "Ce siège est déjà réservé pour ce voyage",
                    code: 409
                });
                return;
            }

            const createResult = await BookingRepository.create({
                generated_trip_id,
                customer_id: req.userId,
                generated_trip_seat_id,
                total_price,
                payment_method: "orangeMoney",
                status: "pending",
                booking_date: new Date().toISOString(),
            } as unknown as Booking);

            if (!createResult.status) {
                res.status(createResult.code).json(createResult);
                return;
            }

            const booking = createResult.body as any;

            const paymentResult = await PaymentService.initiate({
                customerId: req.userId,
                purpose: "booking",
                purposeRefId: booking.id,
                subscriberMsisdn: subscriber_msisdn,
                amount: total_price,
                description: `Réservation ${booking.booking_reference || booking.id}`.slice(0, 100),
            });

            if (!paymentResult.status) {
                await BookingRepository.update(booking.id, {
                    status: "cancelled",
                    cancellation_reason: paymentResult.message,
                } as Partial<Booking>);
                res.status(paymentResult.code).json(paymentResult);
                return;
            }

            res.status(200).json({
                status: true,
                message: paymentResult.message,
                body: { booking, payment: paymentResult.body },
                code: 200
            });
        } catch (error) {
            res.status(500).json({ status: false, message: "Erreur serveur", code: 500 });
        }
    }

    // Réservation multiple avec infos passager
    static async createMultiple(req: Request, res: Response): Promise<void> {
        try {
            const { generated_trip_id, customer_id, seats, payment_method, created_by, subscriber_msisdn } = req.body;

            console.log(`🎫 [BookingController] Creating multiple bookings for customer ${customer_id}, trip ${generated_trip_id}, ${seats?.length} seats`);

            if (!generated_trip_id || !customer_id || !Array.isArray(seats) || seats.length === 0) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('required_fields', req.lang),
                    code: 400
                });
                return;
            }

            // A customer token (no role on it — see customer JWT payload)
            // can only book for itself; a staff token may book for any
            // customer (counter booking on the dashboard).
            if (!req.userRole && req.userId !== Number(customer_id)) {
                res.status(403).json({
                    status: false,
                    message: "Vous ne pouvez réserver que pour votre propre compte",
                    code: 403
                });
                return;
            }

            // MTN Mobile Money isn't wired to a real payment provider on
            // either side (mobile or backend) — refusing it here is safer
            // than silently confirming a real seat for an unpaid booking.
            if (payment_method === 'mtn') {
                res.status(400).json({
                    status: false,
                    message: "MTN Mobile Money n'est pas encore disponible. Choisissez Orange Money, le portefeuille Adigo, ou le paiement en espèces.",
                    code: 400
                });
                return;
            }

            let totalPrice = 0;
            const bookings = [];
            // Générer un group_id unique pour cette opération
            const group_id = `GRP${Date.now()}${Math.floor(Math.random()*10000)}`;

            console.log(`🆔 [BookingController] Generated group_id: ${group_id}`);

            // Get customer tier for discount calculation
            const customerData = await CustomerRepository.findById(customer_id);
            if (!customerData.status) {
                res.status(customerData.code).json(customerData);
                return;
            }
            const customerTier = (customerData.body as any).customer_tier || 'regular';

            // Orange Money needs a number to charge. The mobile app always
            // sends the customer's own number; the dashboard's counter-
            // booking form doesn't collect one yet, so fall back to
            // whatever the customer already has saved on their profile.
            const orangeMoneyMsisdn = subscriber_msisdn || (customerData.body as any).default_orange_money_number;
            if (payment_method === 'orangeMoney' && !orangeMoneyMsisdn) {
                res.status(400).json({
                    status: false,
                    message: "Le numéro Orange Money du client est requis (aucun numéro enregistré sur son profil)",
                    code: 400
                });
                return;
            }

            // Fetch trip price from database (source of truth)
            const tripPriceResult = await GeneratedTripRepository.getTripPrice(generated_trip_id);

            if (!tripPriceResult.status) {
                res.status(tripPriceResult.code).json(tripPriceResult);
                return;
            }

            const baseTripPrice = Number((tripPriceResult.body as { price: unknown }).price);
            console.log(`💰 [BookingController] Trip base price from database: ${baseTripPrice} XAF`);

            // If payment method is wallet, check balance first before processing any bookings
            if (payment_method === 'wallet') {
                // Calculate total price for all seats first (with tier discount applied)
                let estimatedTotal = 0;
                for (const seat of seats) {
                    const available = await BookingRepository.checkSeatAvailability(generated_trip_id, seat.generated_trip_seat_id);
                    if (!available.body || !(available.body as any).available) {
                        res.status(409).json({ status: false, message: `Siège ${seat.generated_trip_seat_id} déjà réservé`, code: 409 });
                        return;
                    }
                    // Apply tier discount to base trip price
                    const discount = calculateTierDiscount(baseTripPrice, customerTier);
                    const discountedPrice = baseTripPrice - discount;
                    estimatedTotal += discountedPrice;
                }

                // Get current wallet balance
                const balanceCheck = await CustomerRepository.getWalletBalance(customer_id);
                if (!balanceCheck.status) {
                    res.status(balanceCheck.code).json(balanceCheck);
                    return;
                }

                const currentBalance = (balanceCheck.body as any).balance || 0;

                // Check if sufficient balance for all bookings
                if (currentBalance < estimatedTotal) {
                    res.status(400).json({
                        status: false,
                        message: I18n.t('insufficient_wallet_balance', req.lang, {
                            current: currentBalance.toString(),
                            required: estimatedTotal.toString()
                        }),
                        code: 400
                    });
                    return;
                }
            }

            for (const seat of seats) {
                // Vérifier la disponibilité du siège
                const available = await BookingRepository.checkSeatAvailability(generated_trip_id, seat.generated_trip_seat_id);
                if (!available.body || !(available.body as any).available) {
                    res.status(409).json({ status: false, message: `Siège ${seat.generated_trip_seat_id} déjà réservé`, code: 409 });
                    return;
                }

                // Calculate price with tier discount (using database price, not client-provided)
                const discount = calculateTierDiscount(baseTripPrice, customerTier);
                const finalPrice = baseTripPrice - discount;

                // Créer la réservation avec tous les champs requis.
                // Orange Money bookings start 'pending' — they only become
                // 'confirmed' once the settlement handler runs after the
                // customer approves the charge on their phone (see below
                // and settlement-handlers/booking.settlement.ts). Wallet is
                // already verified/deducted above; cash is pay-on-boarding.
                const now = new Date().toISOString();
                const booking: Booking = {
                    id: 0, // sera ignoré par la DB
                    generated_trip_id,
                    customer_id,
                    created_by: created_by || customer_id, // Utiliser customer_id si created_by n'est pas fourni
                    generated_trip_seat_id: seat.generated_trip_seat_id,
                    booking_date: now,
                    status: payment_method === 'orangeMoney' ? 'pending' : 'confirmed',
                    payment_method,
                    is_deleted: false,
                    total_price: finalPrice,
                    group_id
                };
                const result = await BookingRepository.create(booking);
                if (!result.status) {
                    res.status(500).json({ status: false, message: "Erreur lors de la réservation", code: 500 });
                    return;
                }
                const bookingResult = result.body as Booking;
                bookings.push(bookingResult);
                // Ajouter le passager si infos fournies
                if (seat.name || seat.phone || seat.document_type || seat.document_number) {
                    await BookingRepository.addPassenger(
                        bookingResult.id,
                        seat.name,
                        seat.phone,
                        seat.document_type,
                        seat.document_number
                    );
                }
                totalPrice += bookingResult.total_price || 0;

                console.log(`✅ [BookingController] Created booking ${bookingResult.id} with price: ${bookingResult.total_price} XAF`);
            }

            console.log(`💰 [BookingController] Total price for ${bookings.length} bookings: ${totalPrice} XAF`);

            // If payment method is wallet, deduct total amount and record transaction
            if (payment_method === 'wallet' && totalPrice > 0) {
                const paymentResult = await WalletRepository.recordPayment(
                    customer_id,
                    totalPrice,
                    `Booking payment for ${bookings.length} seat(s) - Group ${group_id}`
                );

                if (!paymentResult.status) {
                    // If payment fails, we should ideally rollback bookings
                    // For now, just return error
                    res.status(500).json({
                        status: false,
                        message: paymentResult.message || I18n.t('bookings_created_wallet_error', req.lang),
                        code: 500
                    });
                    return;
                }
            }

            // Orange Money: bookings above were created 'pending'. Kick off
            // the real charge now — the customer still has to approve it on
            // their phone. Settlement (booking.settlement.ts) confirms every
            // booking in this group once Orange Money verifies the payment;
            // if we can't even start the charge, release the seats instead
            // of leaving them stuck 'pending' forever.
            let paymentInfo: any = undefined;
            if (payment_method === 'orangeMoney' && totalPrice > 0) {
                const paymentResult = await PaymentService.initiate({
                    customerId: customer_id,
                    purpose: 'booking',
                    purposeRefId: bookings[0].id,
                    subscriberMsisdn: orangeMoneyMsisdn,
                    amount: totalPrice,
                    description: `Réservation ${group_id} (${bookings.length} place${bookings.length > 1 ? 's' : ''})`.slice(0, 100),
                });

                if (!paymentResult.status) {
                    await BookingRepository.cancelBatch(
                        bookings.map(b => b.id),
                        paymentResult.message || 'Échec initiation paiement Orange Money'
                    );
                    res.status(paymentResult.code).json(paymentResult);
                    return;
                }
                paymentInfo = paymentResult.body;
            }

            // Fetch complete booking details with all related data
            const detailedBookings = await BookingRepository.findByGroupId(group_id);

            // Broadcast new booking notification to dashboard
            const bookingData = {
                customer_id,
                generated_trip_id,
                total_price: totalPrice,
                seats_count: seats.length,
                payment_method,
                group_id,
                timestamp: new Date().toISOString()
            };
            SocketService.broadcastNewBooking(bookingData).catch(err =>
                console.error('Error broadcasting booking:', err)
            );

            res.status(201).json({
                status: true,
                message: paymentInfo
                    ? "Réservation en attente — confirmez le paiement sur votre téléphone"
                    : I18n.t('bookings_created', req.lang),
                bookings: detailedBookings.status ? detailedBookings.body : bookings,
                total_price: totalPrice,
                group_id: group_id,
                payment: paymentInfo,
                code: 201
            });
        } catch (error) {
            res.status(500).json({ status: false, message: "Erreur serveur", code: 500 });
        }
    }
    // Create new booking
    static async create(req: Request, res: Response): Promise<void> {
        try {
            const booking: Booking = req.body;

            // Validate required fields
            if (!booking.generated_trip_id || !booking.customer_id || !booking.generated_trip_seat_id) {
                res.status(400).json({
                    status: false,
                    message: "generated_trip_id, customer_id et generated_trip_seat_id sont requis",
                    code: 400
                });
                return;
            }

            if (!req.userRole && req.userId !== Number(booking.customer_id)) {
                res.status(403).json({
                    status: false,
                    message: "Vous ne pouvez réserver que pour votre propre compte",
                    code: 403
                });
                return;
            }

            // Check seat availability
            const availabilityCheck = await BookingRepository.checkSeatAvailability(
                booking.generated_trip_id,
                booking.generated_trip_seat_id
            );

            if (availabilityCheck.body && !(availabilityCheck.body as any).available) {
                res.status(409).json({
                    status: false,
                    message: "Ce siège est déjà réservé pour ce voyage",
                    code: 409
                });
                return;
            }

            // Get customer tier and apply discount to booking price
            const customerData = await CustomerRepository.findById(booking.customer_id);
            if (!customerData.status) {
                res.status(customerData.code).json(customerData);
                return;
            }
            const customerTier = (customerData.body as any).customer_tier || 'regular';

            // Apply tier discount if total_price is provided
            if (booking.total_price && booking.total_price > 0) {
                const discount = calculateTierDiscount(booking.total_price, customerTier);
                booking.total_price = booking.total_price - discount;

                console.log(`💎 Tier discount applied for ${customerTier}: -${discount} XAF (${booking.total_price + discount} → ${booking.total_price})`);
            }

            // Wallet balance is checked BEFORE creating anything — same
            // pre-check shape as createMultiple below. Was: create the
            // booking, then try to charge the wallet, and if that failed
            // just log a warning and return the booking as successfully
            // created (code 201) anyway — a booking could end up confirmed
            // with the wallet never actually charged, silently, with no
            // error reaching the client at all.
            if (booking.payment_method === 'wallet' && booking.total_price > 0) {
                const balanceCheck = await CustomerRepository.getWalletBalance(booking.customer_id);
                if (!balanceCheck.status) {
                    res.status(balanceCheck.code).json(balanceCheck);
                    return;
                }
                const currentBalance = (balanceCheck.body as any).balance || 0;

                if (currentBalance < booking.total_price) {
                    res.status(400).json({
                        status: false,
                        message: I18n.t('insufficient_wallet_balance', req.lang, {
                            current: currentBalance.toString(),
                            required: booking.total_price.toString()
                        }),
                        code: 400
                    });
                    return;
                }
            }

            // Create the booking
            const result = await BookingRepository.create(booking);

            if (!result.status) {
                res.status(result.code).json(result);
                return;
            }

            // Record the wallet payment transaction (balance already
            // verified sufficient above).
            if (booking.payment_method === 'wallet' && booking.total_price > 0) {
                const createdBooking = result.body as Booking;
                const paymentResult = await WalletRepository.recordPayment(
                    booking.customer_id,
                    booking.total_price,
                    `Booking payment - ${createdBooking.booking_reference || 'Ref: ' + createdBooking.id}`
                );

                if (!paymentResult.status) {
                    // Balance was fine moments ago but the debit itself
                    // failed (race with another concurrent charge, DB
                    // error...) — undo the booking rather than leave it
                    // confirmed unpaid.
                    await BookingRepository.softDelete(createdBooking.id, booking.created_by);
                    res.status(400).json({
                        status: false,
                        message: paymentResult.message || I18n.t('insufficient_wallet_balance', req.lang, {
                            current: '?',
                            required: booking.total_price.toString()
                        }),
                        code: 400
                    });
                    return;
                }
            }

            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get booking by ID
    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt((req.params as { id: string }).id);
            
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }

            const result = await BookingRepository.findById(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get all bookings with filters
    static async getAll(req: Request, res: Response): Promise<void> {
        try {
            const {
                agency_id,
                trip_id,
                user_id,
                status,
                group_id,
                with_details,
                include_deleted
            } = req.query;

            let result;

            console.log(`Agency ID |||||||____ ${agency_id}`)

            if (with_details === 'true') {
                result = await BookingRepository.findAllWithDetails(
                    agency_id ? parseInt(agency_id as string) : undefined
                );
            } else if (group_id) {
                result = await BookingRepository.findByGroupId(group_id as string);
            } else if (agency_id) {
                result = await BookingRepository.findByAgency(parseInt(agency_id as string));
            } else if (trip_id) {
                if (status) {
                    result = await BookingRepository.findByTripAndStatus(
                        parseInt(trip_id as string),
                        status as string
                    );
                } else {
                    result = await BookingRepository.findByTrip(parseInt(trip_id as string));
                }
            } else if (user_id) {
                result = await BookingRepository.findByUser(parseInt(user_id as string));
            } else if (status) {
                result = await BookingRepository.findByStatus(status as string);
            } else {
                result = await BookingRepository.findAll(include_deleted === 'true');
            }

            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Update booking
    static async update(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt((req.params as { id: string }).id);
            const booking: Partial<Booking> = req.body;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }

            // If seat or trip is being changed, check availability
            if (booking.generated_trip_seat_id && booking.generated_trip_id) {
                const availabilityCheck = await BookingRepository.checkSeatAvailability(
                    booking.generated_trip_id,
                    booking.generated_trip_seat_id,
                    id
                );

                if (availabilityCheck.body && !(availabilityCheck.body as any).available) {
                    res.status(409).json({
                        status: false,
                        message: "Ce siège est déjà réservé pour ce voyage",
                        code: 409
                    });
                    return;
                }
            }

            // Fetched once, used by both wallet checks below (payment-method
            // change and cancellation refund), and only when either could
            // actually matter — no need to hit the DB for a status-only
            // edit that leaves both alone.
            let existingBooking: Booking | null = null;
            if (booking.payment_method === 'wallet' || booking.status === 'cancelled') {
                const existing = await BookingRepository.findById(id);
                if (!existing.status) {
                    res.status(existing.code).json(existing);
                    return;
                }
                existingBooking = existing.body as Booking;
            }

            // Only `create`/`createMultiple` deducted the wallet — editing an
            // existing booking (e.g. staff correcting its payment method to
            // "wallet" after the fact) silently left the balance untouched.
            // Deduct here too, but only on the actual cash→wallet /
            // orangeMoney→wallet transition, and before applying the
            // update, so an insufficient balance blocks the save instead of
            // leaving a booking marked "wallet" that was never charged.
            if (booking.payment_method === 'wallet' && existingBooking) {
                if (existingBooking.payment_method !== 'wallet' && existingBooking.total_price > 0) {
                    const paymentResult = await WalletRepository.recordPayment(
                        existingBooking.customer_id,
                        existingBooking.total_price,
                        `Booking payment - ${existingBooking.booking_reference || 'Ref: ' + existingBooking.id}`
                    );

                    if (!paymentResult.status) {
                        res.status(400).json({
                            status: false,
                            message: paymentResult.message || "Solde du portefeuille insuffisant",
                            code: 400
                        });
                        return;
                    }
                }
            }

            // Refund back to the customer's wallet when a booking actually
            // transitions to cancelled (not already cancelled — re-saving
            // an already-cancelled booking must not refund it a second
            // time) — regardless of how it was originally paid. The wallet
            // is the one place we can hand money back through the app: for
            // cash and Orange Money/MTN there's no automated reversal, so
            // crediting the wallet (which the client can spend on a future
            // booking) is how a refund actually reaches them.
            if (
                booking.status === 'cancelled' &&
                existingBooking &&
                existingBooking.status !== 'cancelled' &&
                existingBooking.total_price > 0
            ) {
                const refundResult = await WalletRepository.recordRefund(
                    existingBooking.customer_id,
                    existingBooking.total_price,
                    `Booking cancellation refund (paid via ${existingBooking.payment_method}) - ${existingBooking.booking_reference || 'Ref: ' + existingBooking.id}`
                );

                if (!refundResult.status) {
                    console.error('⚠️ Warning: Booking cancelled but wallet refund failed:', refundResult.message);
                }
            }

            const result = await BookingRepository.update(id, booking);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Soft delete booking
    static async softDelete(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt((req.params as { id: string }).id);
            const { deleted_by } = req.body;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }

            const result = await BookingRepository.softDelete(id, deleted_by);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Restore booking
    static async restore(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt((req.params as { id: string }).id);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }

            const result = await BookingRepository.restore(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Hard delete booking
    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt((req.params as { id: string }).id);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }

            const result = await BookingRepository.delete(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get booked seat IDs for a trip
    static async getBookedSeats(req: Request, res: Response): Promise<void> {
        try {
            const { trip_id } = req.query;

            if (!trip_id) {
                res.status(400).json({
                    status: false,
                    message: "trip_id est requis",
                    code: 400
                });
                return;
            }

            const result = await BookingRepository.getBookedSeatIds(parseInt(trip_id as string));
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Check seat availability
    static async checkSeatAvailability(req: Request, res: Response): Promise<void> {
        try {
            const { trip_id, seat_id, exclude_booking_id } = req.query;

            if (!trip_id || !seat_id) {
                res.status(400).json({
                    status: false,
                    message: "trip_id et seat_id sont requis",
                    code: 400
                });
                return;
            }

            const result = await BookingRepository.checkSeatAvailability(
                parseInt(trip_id as string),
                parseInt(seat_id as string),
                exclude_booking_id ? parseInt(exclude_booking_id as string) : undefined
            );
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get statistics
    static async getStatistics(req: Request, res: Response): Promise<void> {
        try {
            const { agency_id } = req.query;

            const result = await BookingRepository.getStatistics(
                agency_id ? parseInt(agency_id as string) : undefined
            );
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get revenue statistics
    static async getRevenueStatistics(req: Request, res: Response): Promise<void> {
        try {
            const { agency_id, start_date, end_date } = req.query;

            const result = await BookingRepository.getRevenueStatistics(
                agency_id ? parseInt(agency_id as string) : undefined,
                start_date ? new Date(start_date as string) : undefined,
                end_date ? new Date(end_date as string) : undefined
            );
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Search bookings
    static async search(req: Request, res: Response): Promise<void> {
        try {
            const {
                customer_name,
                departure_city,
                arrival_city,
                status,
                start_date,
                end_date,
                agency_id,
                customer,
                payment_reference
            } = req.query;

            const filters: any = {};

            if (customer_name || customer) {
                filters.customerName = (customer_name || customer) as string;
            }
            if (departure_city) filters.departureCity = departure_city as string;
            if (arrival_city) filters.arrivalCity = arrival_city as string;
            if (status) filters.status = status as string;
            if (start_date) filters.startDate = new Date(start_date as string);
            if (end_date) filters.endDate = new Date(end_date as string);
            if (agency_id) filters.agencyId = parseInt(agency_id as string);

            const result = await BookingRepository.search(filters);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get bookings by date range
    static async getByDateRange(req: Request, res: Response): Promise<void> {
        try {
            const { start_date, end_date, date } = req.query;

            if (!start_date && !end_date && !date) {
                res.status(400).json({
                    status: false,
                    message: "start_date et end_date ou date sont requis",
                    code: 400
                });
                return;
            }

            // If single date is provided
            if (date) {
                const selectedDate = new Date(date as string);
                const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
                const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
                
                const result = await BookingRepository.findByDateRange(startOfDay, endOfDay);
                res.status(result.code).json(result);
                return;
            }

            const result = await BookingRepository.findByDateRange(
                new Date(start_date as string),
                new Date(end_date as string)
            );
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get recent bookings
    static async getRecent(req: Request, res: Response): Promise<void> {
        try {
            const { limit, agency_id } = req.query;

            const result = await BookingRepository.findRecent(
                limit ? parseInt(limit as string) : 10,
                agency_id ? parseInt(agency_id as string) : undefined
            );
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Cancel batch bookings
    static async cancelBatch(req: Request, res: Response): Promise<void> {
        try {
            const { booking_ids, cancellation_reason } = req.body;

            if (!booking_ids || !Array.isArray(booking_ids) || booking_ids.length === 0) {
                res.status(400).json({
                    status: false,
                    message: "booking_ids (array) est requis",
                    code: 400
                });
                return;
            }

            if (!cancellation_reason) {
                res.status(400).json({
                    status: false,
                    message: "cancellation_reason est requis",
                    code: 400
                });
                return;
            }

            const result = await BookingRepository.cancelBatch(booking_ids, cancellation_reason);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Create batch bookings
    static async createBatch(req: Request, res: Response): Promise<void> {
        try {
            const { bookings } = req.body;

            if (!bookings || !Array.isArray(bookings) || bookings.length === 0) {
                res.status(400).json({
                    status: false,
                    message: "bookings (array) est requis",
                    code: 400
                });
                return;
            }

            // Create each booking
            const results = [];
            for (const booking of bookings) {
                const result = await BookingRepository.create(booking);
                if (result.status) {
                    results.push(result.body);
                }
            }

            res.status(201).json({
                status: true,
                message: "Réservations créées",
                body: results,
                code: 201
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Cleanup soft deleted bookings
    static async cleanup(req: Request, res: Response): Promise<void> {
        try {
            const { older_than_days } = req.query;

            const result = await BookingRepository.cleanupSoftDeleted(
                older_than_days ? parseInt(older_than_days as string) : 30
            );
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get soft deleted bookings
    static async getSoftDeleted(req: Request, res: Response): Promise<void> {
        try {
            const { agency_id } = req.query;

            const result = await BookingRepository.findAll(true);
            
            // Filter only soft deleted
            if (result.status && result.body && Array.isArray(result.body)) {
                result.body = result.body.filter((booking: any) => booking.is_deleted === true);
            }

            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    /**
     * Cancel a single booking with validation rules
     * Rules:
     * - Booking must exist and belong to the requesting customer
     * - Status must be 'confirmed' or 'pending'
     * - Booking must not be already cancelled or completed
     */
    static async cancelSingle(req: Request, res: Response): Promise<void> {
        try {
            const { booking_id } = req.params as { booking_id: string };
            const { cancellation_reason, customer_id } = req.body;

            console.log(`🚫 [BookingController] Cancel booking ${booking_id} for customer ${customer_id}`);

            if (!booking_id || !customer_id || !cancellation_reason) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('required_fields', req.lang),
                    code: 400
                });
                return;
            }

            if (!req.userRole && req.userId !== Number(customer_id)) {
                res.status(403).json({ status: false, message: I18n.t('unauthorized', req.lang), code: 403 });
                return;
            }

            // Get booking details
            const bookingResult = await BookingRepository.findById(parseInt(booking_id));
            if (!bookingResult.status || !bookingResult.body) {
                res.status(404).json({
                    status: false,
                    message: I18n.t('booking_not_found', req.lang),
                    code: 404
                });
                return;
            }

            const booking = bookingResult.body as any;

            // Verify booking belongs to customer
            if (booking.customer_id !== customer_id) {
                res.status(403).json({
                    status: false,
                    message: I18n.t('unauthorized', req.lang),
                    code: 403
                });
                return;
            }

            // Check if booking can be cancelled
            const status = booking.status.toLowerCase();
            if (status !== 'confirmed' && status !== 'pending') {
                res.status(400).json({
                    status: false,
                    message: I18n.t('cannot_cancel_booking', req.lang) || 'Cette réservation ne peut pas être annulée',
                    code: 400
                });
                return;
            }

            // If booking has a group_id, cancel all bookings in the group
            let bookingIds = [parseInt(booking_id)];
            if (booking.group_id) {
                console.log(`📦 [BookingController] Cancelling group: ${booking.group_id}`);
                const groupBookingsResult = await BookingRepository.findByGroupId(booking.group_id);

                if (groupBookingsResult.status && groupBookingsResult.body) {
                    // Only include bookings that can be cancelled
                    bookingIds = (groupBookingsResult.body as any[])
                        .filter((b: any) => {
                            const s = b.status.toLowerCase();
                            return s === 'confirmed' || s === 'pending';
                        })
                        .map((b: any) => b.id);
                    console.log(`   Found ${bookingIds.length} bookings to cancel in group`);
                }
            }
            const result = await BookingRepository.cancelBatch(bookingIds, cancellation_reason);
            res.status(result.code).json(result);
        } catch (error) {
            console.error('❌ Error cancelling booking:', error);
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    /**
     * Modify a single booking (change seat)
     * Rules:
     * - Booking must exist and belong to the requesting customer
     * - Status must be 'confirmed'
     * - Departure time must be at least 2 hours in the future
     * - New seat must be available
     */
    static async modifySingle(req: Request, res: Response): Promise<void> {
        try {
            const { booking_id } = req.params as { booking_id: string };
            const { customer_id, new_seat_id } = req.body;

            console.log(`✏️ [BookingController] Modify booking ${booking_id} for customer ${customer_id}, new seat: ${new_seat_id}`);

            if (!booking_id || !customer_id || !new_seat_id) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('required_fields', req.lang),
                    code: 400
                });
                return;
            }

            if (!req.userRole && req.userId !== Number(customer_id)) {
                res.status(403).json({ status: false, message: I18n.t('unauthorized', req.lang), code: 403 });
                return;
            }

            // Get booking details
            const bookingResult = await BookingRepository.findById(parseInt(booking_id));
            if (!bookingResult.status || !bookingResult.body) {
                res.status(404).json({
                    status: false,
                    message: I18n.t('booking_not_found', req.lang),
                    code: 404
                });
                return;
            }

            const booking = bookingResult.body as any;

            // Verify booking belongs to customer
            if (booking.customer_id !== customer_id) {
                res.status(403).json({
                    status: false,
                    message: I18n.t('unauthorized', req.lang),
                    code: 403
                });
                return;
            }

            // Check if booking status is 'confirmed'
            if (booking.status.toLowerCase() !== 'confirmed') {
                res.status(400).json({
                    status: false,
                    message: I18n.t('cannot_modify_booking', req.lang) || 'Cette réservation ne peut pas être modifiée',
                    code: 400
                });
                return;
            }

            // Check if departure time is at least 2 hours in the future
            const generatedTripResult = await GeneratedTripRepository.findById(booking.generated_trip_id);

            if (generatedTripResult.status && generatedTripResult.body) {
                const departureTime = new Date((generatedTripResult.body as any).actual_departure_time);
                const now = new Date();
                const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);

                if (hoursUntilDeparture < 2) {
                    res.status(400).json({
                        status: false,
                        message: I18n.t('too_close_to_departure', req.lang) || 'Modification impossible: le départ est dans moins de 2 heures',
                        code: 400
                    });
                    return;
                }
            }

            // Check if new seat is available
            const seatCheck = await GeneratedTripSeatRepository.findRawStatus(new_seat_id, booking.generated_trip_id);

            if (!seatCheck) {
                res.status(404).json({
                    status: false,
                    message: I18n.t('seat_not_found', req.lang) || 'Siège non trouvé',
                    code: 404
                });
                return;
            }

            if (seatCheck.status !== 'available') {
                res.status(400).json({
                    status: false,
                    message: I18n.t('seat_not_available', req.lang) || 'Ce siège n\'est pas disponible',
                    code: 400
                });
                return;
            }

            // Update booking with new seat
            await BookingRepository.update(parseInt(booking_id), {
                generated_trip_seat_id: new_seat_id,
            } as Partial<Booking>);

            // Mark old seat as available
            await GeneratedTripSeatRepository.setStatus(booking.generated_trip_seat_id, 'available');

            // Mark new seat as reserved
            await GeneratedTripSeatRepository.setStatus(new_seat_id, 'reserved');

            // Get updated booking
            const updatedBooking = await BookingRepository.findById(parseInt(booking_id));

            res.status(200).json({
                status: true,
                message: I18n.t('booking_modified', req.lang) || 'Réservation modifiée avec succès',
                body: updatedBooking.body,
                code: 200
            });
        } catch (error) {
            console.error('❌ Error modifying booking:', error);
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }
}
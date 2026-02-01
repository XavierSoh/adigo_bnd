import { Request, Response } from "express";
import { BookingRepository } from "../repository/booking.repository";
import { CustomerRepository } from "../repository/customer.repository";
import { WalletRepository } from "../repository/wallet.repository";
import { Booking } from "../models/booking.model";
import { I18n } from "../utils/i18n";
import { calculateTierDiscount } from "../config/tier.config";
import pgpDb from "../config/pgdb";
import { SocketService } from "../services/socket.service";

export class BookingController {
    // Réservation multiple avec infos passager
    static async createMultiple(req: Request, res: Response): Promise<void> {
        try {
            const { generated_trip_id, customer_id, seats, payment_method, created_by } = req.body;

            console.log(`🎫 [BookingController] Creating multiple bookings for customer ${customer_id}, trip ${generated_trip_id}, ${seats?.length} seats`);

            if (!generated_trip_id || !customer_id || !Array.isArray(seats) || seats.length === 0) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('required_fields', req.lang),
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

            // Fetch trip price from database (source of truth)
            const tripPriceQuery = await pgpDb.oneOrNone(
                `SELECT t.price
                 FROM trip t
                 JOIN generated_trip gt ON gt.trip_id = t.id
                 WHERE gt.id = $1`,
                [generated_trip_id]
            );

            if (!tripPriceQuery || !tripPriceQuery.price) {
                res.status(404).json({
                    status: false,
                    message: 'Trip not found or price not set',
                    code: 404
                });
                return;
            }

            const baseTripPrice = parseFloat(tripPriceQuery.price);
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

                // Créer la réservation avec tous les champs requis
                const now = new Date().toISOString();
                const booking: Booking = {
                    id: 0, // sera ignoré par la DB
                    generated_trip_id,
                    customer_id,
                    created_by: created_by || customer_id, // Utiliser customer_id si created_by n'est pas fourni
                    generated_trip_seat_id: seat.generated_trip_seat_id,
                    booking_date: now,
                    status: "confirmed",
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
                message: I18n.t('bookings_created', req.lang),
                bookings: detailedBookings.status ? detailedBookings.body : bookings,
                total_price: totalPrice,
                group_id: group_id,
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

            // Create the booking first
            const result = await BookingRepository.create(booking);

            if (!result.status) {
                res.status(result.code).json(result);
                return;
            }

            // If payment method is wallet, record the payment transaction
            if (booking.payment_method === 'wallet' && booking.total_price > 0) {
                const createdBooking = result.body as Booking;
                const paymentResult = await WalletRepository.recordPayment(
                    booking.customer_id,
                    booking.total_price,
                    `Booking payment - ${createdBooking.booking_reference || 'Ref: ' + createdBooking.id}`
                );

                if (!paymentResult.status) {
                    // Payment recording failed, but booking was created
                    // This is not ideal, but we return the booking anyway
                    console.error('⚠️ Warning: Booking created but wallet transaction failed:', paymentResult.message);
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
                const groupBookingsResult = await pgpDb.manyOrNone(
                    `SELECT id, status FROM booking WHERE group_id = $1 AND is_deleted = false`,
                    [booking.group_id]
                );

                if (groupBookingsResult) {
                    // Only include bookings that can be cancelled
                    bookingIds = groupBookingsResult
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
            const departureTimeResult = await pgpDb.oneOrNone(
                `SELECT actual_departure_time
                 FROM generated_trip
                 WHERE id = $1`,
                [booking.generated_trip_id]
            );

            if (departureTimeResult) {
                const departureTime = new Date(departureTimeResult.actual_departure_time);
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
            const seatCheck = await pgpDb.oneOrNone(
                `SELECT id, status
                 FROM generated_trip_seat
                 WHERE id = $1 AND generated_trip_id = $2`,
                [new_seat_id, booking.generated_trip_id]
            );

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
            await pgpDb.none(
                `UPDATE booking
                 SET generated_trip_seat_id = $1,
                     updated_at = NOW()
                 WHERE id = $2`,
                [new_seat_id, booking_id]
            );

            // Mark old seat as available
            await pgpDb.none(
                `UPDATE generated_trip_seat
                 SET status = 'available'
                 WHERE id = $1`,
                [booking.generated_trip_seat_id]
            );

            // Mark new seat as reserved
            await pgpDb.none(
                `UPDATE generated_trip_seat
                 SET status = 'reserved'
                 WHERE id = $1`,
                [new_seat_id]
            );

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
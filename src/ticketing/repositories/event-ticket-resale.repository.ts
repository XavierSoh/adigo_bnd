import pgpDb from '../../config/pgdb';
import {
    EventTicketResale,
    EventTicketResaleCreateDto,
    EventTicketResaleUpdateDto,
    EventTicketResalePurchaseDto,
    EventTicketResaleSearchParams
} from '../models/event-ticket-resale.model';

/**
 * Event Ticket Resale Repository
 *
 * Handles ticket resale marketplace with 10% ADIGO commission
 */

export class EventTicketResaleRepository {

    /**
     * Create a new ticket resale listing
     */
    static async create(
        data: EventTicketResaleCreateDto,
        created_by?: number
    ): Promise<{ status: boolean; message: string; body?: EventTicketResale; code: number }> {
        try {
            // Verify ticket exists and is resellable
            const ticket = await pgpDb.oneOrNone(`
                SELECT
                    id,
                    status,
                    customer_id,
                    is_validated,
                    event_id
                FROM event_ticket_purchase
                WHERE id = $1
                AND is_deleted = FALSE
            `, [data.ticket_purchase_id]);

            if (!ticket) {
                return {
                    status: false,
                    message: 'Ticket not found',
                    code: 404
                };
            }

            // Check ticket is resellable
            if (ticket.status !== 'confirmed' && ticket.status !== 'pending') {
                return {
                    status: false,
                    message: `Ticket cannot be resold (status: ${ticket.status})`,
                    code: 400
                };
            }

            if (ticket.is_validated) {
                return {
                    status: false,
                    message: 'Ticket already used, cannot be resold',
                    code: 400
                };
            }

            // Verify seller owns the ticket
            if (ticket.customer_id !== data.seller_id) {
                return {
                    status: false,
                    message: 'You do not own this ticket',
                    code: 403
                };
            }

            // Check if ticket is already listed
            const existingListing = await pgpDb.oneOrNone(`
                SELECT id, status
                FROM event_ticket_resale
                WHERE ticket_purchase_id = $1
                AND status = 'listed'
                AND is_deleted = FALSE
            `, [data.ticket_purchase_id]);

            if (existingListing) {
                return {
                    status: false,
                    message: 'Ticket already listed for resale',
                    code: 400
                };
            }

            // Create resale listing
            const resale = await pgpDb.one(`
                INSERT INTO event_ticket_resale (
                    ticket_purchase_id,
                    event_id,
                    ticket_type_id,
                    seller_id,
                    original_price,
                    resale_price,
                    listing_description,
                    reason_for_sale,
                    expires_at,
                    created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `, [
                data.ticket_purchase_id,
                data.event_id,
                data.ticket_type_id,
                data.seller_id,
                data.original_price,
                data.resale_price,
                data.listing_description || null,
                data.reason_for_sale || null,
                data.expires_at || null,
                created_by || data.seller_id
            ]);

            console.log(`✅ Ticket resale listed: ${resale.resale_code} for ${resale.resale_price} FCFA`);

            return {
                status: true,
                message: 'Ticket listed for resale successfully',
                body: resale,
                code: 201
            };

        } catch (error) {
            console.error('Error creating resale listing:', error);
            return {
                status: false,
                message: 'Failed to create resale listing',
                code: 500
            };
        }
    }

    /**
     * Find resale by ID
     */
    static async findById(id: number): Promise<{ status: boolean; message: string; body?: any; code: number }> {
        try {
            const resale = await pgpDb.oneOrNone(`
                SELECT
                    r.*,
                    json_build_object(
                        'id', e.id,
                        'title', e.title,
                        'event_code', e.event_code,
                        'event_date', e.event_date,
                        'venue_name', e.venue_name,
                        'poster_image', e.poster_image
                    ) as event,
                    json_build_object(
                        'id', tt.id,
                        'name', tt.name,
                        'description', tt.description,
                        'original_price', tt.price
                    ) as ticket_type,
                    json_build_object(
                        'id', seller.id,
                        'first_name', seller.first_name,
                        'last_name', seller.last_name
                    ) as seller,
                    json_build_object(
                        'id', buyer.id,
                        'first_name', buyer.first_name,
                        'last_name', buyer.last_name
                    ) as buyer
                FROM event_ticket_resale r
                LEFT JOIN event e ON r.event_id = e.id
                LEFT JOIN event_ticket_type tt ON r.ticket_type_id = tt.id
                LEFT JOIN customer seller ON r.seller_id = seller.id
                LEFT JOIN customer buyer ON r.buyer_id = buyer.id
                WHERE r.id = $1
                AND r.is_deleted = FALSE
            `, [id]);

            if (!resale) {
                return {
                    status: false,
                    message: 'Resale not found',
                    code: 404
                };
            }

            return {
                status: true,
                message: 'Resale found',
                body: resale,
                code: 200
            };

        } catch (error) {
            console.error('Error finding resale:', error);
            return {
                status: false,
                message: 'Failed to find resale',
                code: 500
            };
        }
    }

    /**
     * Find by resale code
     */
    static async findByResaleCode(resaleCode: string): Promise<{ status: boolean; message: string; body?: any; code: number }> {
        try {
            const resale = await pgpDb.oneOrNone(`
                SELECT
                    r.*,
                    json_build_object(
                        'id', e.id,
                        'title', e.title,
                        'event_code', e.event_code,
                        'event_date', e.event_date,
                        'venue_name', e.venue_name
                    ) as event
                FROM event_ticket_resale r
                LEFT JOIN event e ON r.event_id = e.id
                WHERE r.resale_code = $1
                AND r.is_deleted = FALSE
            `, [resaleCode]);

            if (!resale) {
                return {
                    status: false,
                    message: 'Resale not found',
                    code: 404
                };
            }

            return {
                status: true,
                message: 'Resale found',
                body: resale,
                code: 200
            };

        } catch (error) {
            console.error('Error finding resale by code:', error);
            return {
                status: false,
                message: 'Failed to find resale',
                code: 500
            };
        }
    }

    /**
     * Search resales with filters
     */
    static async search(params: EventTicketResaleSearchParams): Promise<{ status: boolean; message: string; body?: any[]; code: number }> {
        try {
            let whereConditions = ['r.is_deleted = FALSE'];
            let queryParams: any[] = [];
            let paramIndex = 1;

            if (params.event_id) {
                whereConditions.push(`r.event_id = $${paramIndex}`);
                queryParams.push(params.event_id);
                paramIndex++;
            }

            if (params.seller_id) {
                whereConditions.push(`r.seller_id = $${paramIndex}`);
                queryParams.push(params.seller_id);
                paramIndex++;
            }

            if (params.buyer_id) {
                whereConditions.push(`r.buyer_id = $${paramIndex}`);
                queryParams.push(params.buyer_id);
                paramIndex++;
            }

            if (params.status) {
                whereConditions.push(`r.status = $${paramIndex}`);
                queryParams.push(params.status);
                paramIndex++;
            }

            if (params.min_price) {
                whereConditions.push(`r.resale_price >= $${paramIndex}`);
                queryParams.push(params.min_price);
                paramIndex++;
            }

            if (params.max_price) {
                whereConditions.push(`r.resale_price <= $${paramIndex}`);
                queryParams.push(params.max_price);
                paramIndex++;
            }

            const whereClause = whereConditions.join(' AND ');
            const limit = params.limit || 50;
            const offset = params.offset || 0;

            const resales = await pgpDb.any(`
                SELECT
                    r.*,
                    json_build_object(
                        'id', e.id,
                        'title', e.title,
                        'event_code', e.event_code,
                        'event_date', e.event_date,
                        'venue_name', e.venue_name,
                        'poster_image', e.poster_image
                    ) as event,
                    json_build_object(
                        'id', tt.id,
                        'name', tt.name
                    ) as ticket_type
                FROM event_ticket_resale r
                LEFT JOIN event e ON r.event_id = e.id
                LEFT JOIN event_ticket_type tt ON r.ticket_type_id = tt.id
                WHERE ${whereClause}
                ORDER BY r.listed_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `, [...queryParams, limit, offset]);

            return {
                status: true,
                message: `Found ${resales.length} resale listings`,
                body: resales,
                code: 200
            };

        } catch (error) {
            console.error('Error searching resales:', error);
            return {
                status: false,
                message: 'Failed to search resales',
                code: 500
            };
        }
    }

    /**
     * Get active listings for an event
     */
    static async findActiveByEvent(eventId: number): Promise<{ status: boolean; message: string; body?: any[]; code: number }> {
        try {
            const resales = await pgpDb.any(`
                SELECT
                    r.*,
                    json_build_object(
                        'id', tt.id,
                        'name', tt.name
                    ) as ticket_type
                FROM event_ticket_resale r
                LEFT JOIN event_ticket_type tt ON r.ticket_type_id = tt.id
                WHERE r.event_id = $1
                AND r.status = 'listed'
                AND (r.expires_at IS NULL OR r.expires_at > CURRENT_TIMESTAMP)
                AND r.is_deleted = FALSE
                ORDER BY r.resale_price ASC
            `, [eventId]);

            return {
                status: true,
                message: `Found ${resales.length} active resale listings`,
                body: resales,
                code: 200
            };

        } catch (error) {
            console.error('Error finding active resales:', error);
            return {
                status: false,
                message: 'Failed to find active resales',
                code: 500
            };
        }
    }

    /**
     * Purchase a resale ticket
     */
    static async purchase(
        purchaseData: EventTicketResalePurchaseDto
    ): Promise<{ status: boolean; message: string; body?: any; code: number }> {
        try {
            // Get resale listing
            const resale = await pgpDb.oneOrNone(`
                SELECT * FROM event_ticket_resale
                WHERE id = $1
                AND status = 'listed'
                AND is_deleted = FALSE
            `, [purchaseData.resale_id]);

            if (!resale) {
                return {
                    status: false,
                    message: 'Resale listing not found or not available',
                    code: 404
                };
            }

            // Check if expired
            if (resale.expires_at && new Date(resale.expires_at) < new Date()) {
                await pgpDb.none(`
                    UPDATE event_ticket_resale
                    SET status = 'expired'
                    WHERE id = $1
                `, [resale.id]);

                return {
                    status: false,
                    message: 'Resale listing has expired',
                    code: 400
                };
            }

            // Cannot buy your own ticket
            if (purchaseData.buyer_id === resale.seller_id) {
                return {
                    status: false,
                    message: 'Cannot purchase your own ticket',
                    code: 400
                };
            }

            // Process payment (wallet deduction)
            const buyer = await pgpDb.oneOrNone(
                'SELECT wallet_balance FROM customer WHERE id = $1',
                [purchaseData.buyer_id]
            );

            if (!buyer || buyer.wallet_balance < resale.resale_price) {
                return {
                    status: false,
                    message: 'Insufficient wallet balance',
                    code: 400
                };
            }

            // Start transaction
            await pgpDb.tx(async t => {
                // Deduct from buyer
                await t.none(`
                    UPDATE customer
                    SET wallet_balance = wallet_balance - $2
                    WHERE id = $1
                `, [purchaseData.buyer_id, resale.resale_price]);

                // Credit seller (90%)
                await t.none(`
                    UPDATE customer
                    SET wallet_balance = wallet_balance + $2
                    WHERE id = $1
                `, [resale.seller_id, resale.seller_receives]);

                // Update resale status
                await t.none(`
                    UPDATE event_ticket_resale
                    SET
                        status = 'sold',
                        buyer_id = $2,
                        payment_method = $3,
                        payment_status = 'paid',
                        payment_reference = $4,
                        sold_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [
                    resale.id,
                    purchaseData.buyer_id,
                    purchaseData.payment_method,
                    purchaseData.payment_reference || null
                ]);

                // Transfer ticket ownership
                await t.none(`
                    UPDATE event_ticket_purchase
                    SET customer_id = $2
                    WHERE id = $1
                `, [resale.ticket_purchase_id, purchaseData.buyer_id]);
            });

            console.log(`💰 Ticket resale completed: ${resale.resale_code}`);
            console.log(`   Seller receives: ${resale.seller_receives} FCFA`);
            console.log(`   ADIGO commission: ${resale.commission_amount} FCFA`);

            const updatedResale = await this.findById(resale.id);

            return {
                status: true,
                message: 'Ticket purchased successfully',
                body: updatedResale.body,
                code: 200
            };

        } catch (error) {
            console.error('Error purchasing resale ticket:', error);
            return {
                status: false,
                message: 'Failed to purchase ticket',
                code: 500
            };
        }
    }

    /**
     * Update resale listing
     */
    static async update(
        id: number,
        data: EventTicketResaleUpdateDto
    ): Promise<{ status: boolean; message: string; body?: EventTicketResale; code: number }> {
        try {
            const updates: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            if (data.resale_price !== undefined) {
                updates.push(`resale_price = $${paramIndex}`);
                params.push(data.resale_price);
                paramIndex++;
            }

            if (data.listing_description !== undefined) {
                updates.push(`listing_description = $${paramIndex}`);
                params.push(data.listing_description);
                paramIndex++;
            }

            if (data.status) {
                updates.push(`status = $${paramIndex}`);
                params.push(data.status);
                paramIndex++;
            }

            if (updates.length === 0) {
                return {
                    status: false,
                    message: 'No fields to update',
                    code: 400
                };
            }

            params.push(id);

            const resale = await pgpDb.oneOrNone(`
                UPDATE event_ticket_resale
                SET ${updates.join(', ')}
                WHERE id = $${paramIndex}
                AND is_deleted = FALSE
                RETURNING *
            `, params);

            if (!resale) {
                return {
                    status: false,
                    message: 'Resale not found',
                    code: 404
                };
            }

            return {
                status: true,
                message: 'Resale updated successfully',
                body: resale,
                code: 200
            };

        } catch (error) {
            console.error('Error updating resale:', error);
            return {
                status: false,
                message: 'Failed to update resale',
                code: 500
            };
        }
    }

    /**
     * Cancel resale listing
     */
    static async cancel(
        id: number,
        sellerId: number,
        reason?: string
    ): Promise<{ status: boolean; message: string; code: number }> {
        try {
            const result = await pgpDb.result(`
                UPDATE event_ticket_resale
                SET
                    status = 'cancelled',
                    cancelled_at = CURRENT_TIMESTAMP,
                    cancellation_reason = $3
                WHERE id = $1
                AND seller_id = $2
                AND status = 'listed'
                AND is_deleted = FALSE
            `, [id, sellerId, reason || null]);

            if (result.rowCount === 0) {
                return {
                    status: false,
                    message: 'Resale not found or cannot be cancelled',
                    code: 404
                };
            }

            return {
                status: true,
                message: 'Resale cancelled successfully',
                code: 200
            };

        } catch (error) {
            console.error('Error cancelling resale:', error);
            return {
                status: false,
                message: 'Failed to cancel resale',
                code: 500
            };
        }
    }

    /**
     * Expire old resale listings
     */
    static async expireOldListings(): Promise<number> {
        try {
            const result = await pgpDb.result(`
                UPDATE event_ticket_resale
                SET status = 'expired'
                WHERE status = 'listed'
                AND expires_at < CURRENT_TIMESTAMP
                AND is_deleted = FALSE
            `);

            const expiredCount = result.rowCount;

            if (expiredCount > 0) {
                console.log(`⏰ Expired ${expiredCount} resale listing(s)`);
            }

            return expiredCount;

        } catch (error) {
            console.error('Error expiring resale listings:', error);
            return 0;
        }
    }

    /**
     * Get resale statistics
     */
    static async getStatistics(eventId?: number): Promise<{ status: boolean; body?: any; code: number }> {
        try {
            let whereClause = 'WHERE r.is_deleted = FALSE';
            const params: any[] = [];

            if (eventId) {
                whereClause += ' AND r.event_id = $1';
                params.push(eventId);
            }

            const stats = await pgpDb.one(`
                SELECT
                    COUNT(*) as total_listings,
                    COUNT(*) FILTER (WHERE status = 'listed') as active_listings,
                    COUNT(*) FILTER (WHERE status = 'sold') as sold_listings,
                    COALESCE(SUM(resale_price) FILTER (WHERE status = 'sold'), 0) as total_resale_value,
                    COALESCE(SUM(commission_amount) FILTER (WHERE status = 'sold'), 0) as total_commission,
                    COALESCE(AVG(resale_price) FILTER (WHERE status = 'listed'), 0) as avg_listing_price
                FROM event_ticket_resale r
                ${whereClause}
            `, params);

            return {
                status: true,
                body: stats,
                code: 200
            };

        } catch (error) {
            console.error('Error getting resale statistics:', error);
            return {
                status: false,
                code: 500
            };
        }
    }

    /**
     * Soft delete
     */
    static async softDelete(id: number, deleted_by?: number): Promise<{ status: boolean; message: string; code: number }> {
        try {
            const result = await pgpDb.result(`
                UPDATE event_ticket_resale
                SET
                    is_deleted = TRUE,
                    deleted_at = CURRENT_TIMESTAMP,
                    deleted_by = $2
                WHERE id = $1
                AND is_deleted = FALSE
            `, [id, deleted_by || null]);

            if (result.rowCount === 0) {
                return {
                    status: false,
                    message: 'Resale not found',
                    code: 404
                };
            }

            return {
                status: true,
                message: 'Resale deleted successfully',
                code: 200
            };

        } catch (error) {
            console.error('Error deleting resale:', error);
            return {
                status: false,
                message: 'Failed to delete resale',
                code: 500
            };
        }
    }
}

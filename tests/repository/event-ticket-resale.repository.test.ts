import { EventTicketResaleRepository } from '../../src/repository/event-ticket-resale.repository';
import pgpDb from '../../src/config/pgdb';

jest.mock('../../src/config/pgdb');

describe('EventTicketResaleRepository', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create resale listing successfully', async () => {
            const mockTicket = {
                id: 100,
                status: 'confirmed',
                customer_id: 123,
                is_validated: false,
                event_id: 10
            };

            const mockResale = {
                id: 1,
                resale_code: 'RSL-2025-001',
                ticket_purchase_id: 100,
                event_id: 10,
                seller_id: 123,
                resale_price: 20000,
                commission_rate: 10,
                commission_amount: 2000,
                seller_receives: 18000,
                status: 'listed'
            };

            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce(mockTicket) // Ticket verification
                .mockResolvedValueOnce(null); // No existing listing

            (pgpDb.one as jest.Mock).mockResolvedValue(mockResale);

            const createData = {
                ticket_purchase_id: 100,
                event_id: 10,
                ticket_type_id: 2,
                seller_id: 123,
                original_price: 25000,
                resale_price: 20000,
                listing_description: 'Cannot attend',
                reason_for_sale: 'Schedule conflict'
            };

            const result = await EventTicketResaleRepository.create(createData);

            expect(result.status).toBe(true);
            expect(result.code).toBe(201);
            expect(result.message).toBe('Ticket listed for resale successfully');
            expect(result.body?.resale_code).toBe('RSL-2025-001');
            expect(result.body?.commission_amount).toBe(2000);
            expect(result.body?.seller_receives).toBe(18000);
        });

        it('should fail if ticket not found', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(null);

            const createData = {
                ticket_purchase_id: 999,
                event_id: 10,
                ticket_type_id: 2,
                seller_id: 123,
                original_price: 25000,
                resale_price: 20000
            };

            const result = await EventTicketResaleRepository.create(createData);

            expect(result.status).toBe(false);
            expect(result.code).toBe(404);
            expect(result.message).toBe('Ticket not found');
        });

        it('should fail if ticket already validated', async () => {
            const mockTicket = {
                id: 100,
                status: 'confirmed',
                customer_id: 123,
                is_validated: true,
                event_id: 10
            };

            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(mockTicket);

            const createData = {
                ticket_purchase_id: 100,
                event_id: 10,
                ticket_type_id: 2,
                seller_id: 123,
                original_price: 25000,
                resale_price: 20000
            };

            const result = await EventTicketResaleRepository.create(createData);

            expect(result.status).toBe(false);
            expect(result.code).toBe(400);
            expect(result.message).toBe('Ticket already used, cannot be resold');
        });

        it('should fail if ticket status not resellable', async () => {
            const mockTicket = {
                id: 100,
                status: 'cancelled',
                customer_id: 123,
                is_validated: false,
                event_id: 10
            };

            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(mockTicket);

            const createData = {
                ticket_purchase_id: 100,
                event_id: 10,
                ticket_type_id: 2,
                seller_id: 123,
                original_price: 25000,
                resale_price: 20000
            };

            const result = await EventTicketResaleRepository.create(createData);

            expect(result.status).toBe(false);
            expect(result.code).toBe(400);
            expect(result.message).toContain('cannot be resold');
        });

        it('should fail if seller does not own ticket', async () => {
            const mockTicket = {
                id: 100,
                status: 'confirmed',
                customer_id: 456, // Different owner
                is_validated: false,
                event_id: 10
            };

            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(mockTicket);

            const createData = {
                ticket_purchase_id: 100,
                event_id: 10,
                ticket_type_id: 2,
                seller_id: 123,
                original_price: 25000,
                resale_price: 20000
            };

            const result = await EventTicketResaleRepository.create(createData);

            expect(result.status).toBe(false);
            expect(result.code).toBe(403);
            expect(result.message).toBe('You do not own this ticket');
        });

        it('should fail if ticket already listed', async () => {
            const mockTicket = {
                id: 100,
                status: 'confirmed',
                customer_id: 123,
                is_validated: false,
                event_id: 10
            };

            const mockExistingListing = {
                id: 50,
                status: 'listed'
            };

            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce(mockTicket)
                .mockResolvedValueOnce(mockExistingListing);

            const createData = {
                ticket_purchase_id: 100,
                event_id: 10,
                ticket_type_id: 2,
                seller_id: 123,
                original_price: 25000,
                resale_price: 20000
            };

            const result = await EventTicketResaleRepository.create(createData);

            expect(result.status).toBe(false);
            expect(result.code).toBe(400);
            expect(result.message).toBe('Ticket already listed for resale');
        });

        it('should handle database errors', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockRejectedValue(new Error('Database error'));

            const createData = {
                ticket_purchase_id: 100,
                event_id: 10,
                ticket_type_id: 2,
                seller_id: 123,
                original_price: 25000,
                resale_price: 20000
            };

            const result = await EventTicketResaleRepository.create(createData);

            expect(result.status).toBe(false);
            expect(result.code).toBe(500);
            expect(result.message).toBe('Failed to create resale listing');
        });
    });

    describe('findById', () => {
        it('should find resale by ID with full details', async () => {
            const mockResale = {
                id: 1,
                resale_code: 'RSL-2025-001',
                resale_price: 20000,
                status: 'listed',
                event: { id: 10, title: 'Concert', event_code: 'EVT-001' },
                ticket_type: { id: 2, name: 'VIP' },
                seller: { id: 123, first_name: 'John', last_name: 'Doe' },
                buyer: null
            };

            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(mockResale);

            const result = await EventTicketResaleRepository.findById(1);

            expect(result.status).toBe(true);
            expect(result.code).toBe(200);
            expect(result.body?.resale_code).toBe('RSL-2025-001');
            expect(result.body?.event.title).toBe('Concert');
        });

        it('should return 404 if resale not found', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(null);

            const result = await EventTicketResaleRepository.findById(999);

            expect(result.status).toBe(false);
            expect(result.code).toBe(404);
            expect(result.message).toBe('Resale not found');
        });

        it('should handle database errors', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockRejectedValue(new Error('Database error'));

            const result = await EventTicketResaleRepository.findById(1);

            expect(result.status).toBe(false);
            expect(result.code).toBe(500);
        });
    });

    describe('findByResaleCode', () => {
        it('should find resale by code', async () => {
            const mockResale = {
                id: 1,
                resale_code: 'RSL-2025-001',
                resale_price: 20000,
                event: { id: 10, title: 'Concert' }
            };

            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(mockResale);

            const result = await EventTicketResaleRepository.findByResaleCode('RSL-2025-001');

            expect(result.status).toBe(true);
            expect(result.body?.resale_code).toBe('RSL-2025-001');
        });

        it('should return 404 if not found', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(null);

            const result = await EventTicketResaleRepository.findByResaleCode('INVALID');

            expect(result.status).toBe(false);
            expect(result.code).toBe(404);
        });
    });

    describe('search', () => {
        it('should search resales with filters', async () => {
            const mockResales = [
                { id: 1, resale_code: 'RSL-001', resale_price: 20000 },
                { id: 2, resale_code: 'RSL-002', resale_price: 15000 }
            ];

            (pgpDb.any as jest.Mock).mockResolvedValue(mockResales);

            const params = {
                event_id: 10,
                status: 'listed',
                min_price: 10000,
                max_price: 25000,
                limit: 20,
                offset: 0
            };

            const result = await EventTicketResaleRepository.search(params);

            expect(result.status).toBe(true);
            expect(result.code).toBe(200);
            expect(result.body).toHaveLength(2);
            expect(result.message).toContain('Found 2 resale listings');
        });

        it('should search with seller_id filter', async () => {
            (pgpDb.any as jest.Mock).mockResolvedValue([]);

            const params = { seller_id: 123 };

            const result = await EventTicketResaleRepository.search(params);

            expect(result.status).toBe(true);
            expect(pgpDb.any).toHaveBeenCalledWith(
                expect.stringContaining('r.seller_id'),
                expect.arrayContaining([123])
            );
        });

        it('should use default limit and offset', async () => {
            (pgpDb.any as jest.Mock).mockResolvedValue([]);

            const result = await EventTicketResaleRepository.search({});

            expect(pgpDb.any).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([50, 0]) // Default limit=50, offset=0
            );
        });

        it('should handle database errors', async () => {
            (pgpDb.any as jest.Mock).mockRejectedValue(new Error('Database error'));

            const result = await EventTicketResaleRepository.search({});

            expect(result.status).toBe(false);
            expect(result.code).toBe(500);
        });
    });

    describe('findActiveByEvent', () => {
        it('should find active resales for event', async () => {
            const mockResales = [
                { id: 1, status: 'listed', resale_price: 15000 },
                { id: 2, status: 'listed', resale_price: 20000 }
            ];

            (pgpDb.any as jest.Mock).mockResolvedValue(mockResales);

            const result = await EventTicketResaleRepository.findActiveByEvent(10);

            expect(result.status).toBe(true);
            expect(result.body).toHaveLength(2);
            expect(result.message).toContain('Found 2 active resale listings');
        });

        it('should return empty array if no active listings', async () => {
            (pgpDb.any as jest.Mock).mockResolvedValue([]);

            const result = await EventTicketResaleRepository.findActiveByEvent(10);

            expect(result.status).toBe(true);
            expect(result.body).toHaveLength(0);
        });
    });

    describe('purchase', () => {
        it('should purchase resale ticket successfully', async () => {
            const mockResale = {
                id: 1,
                resale_code: 'RSL-2025-001',
                ticket_purchase_id: 100,
                seller_id: 123,
                resale_price: 20000,
                commission_amount: 2000,
                seller_receives: 18000,
                status: 'listed',
                expires_at: null
            };

            const mockBuyer = { wallet_balance: 50000 };

            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce(mockResale) // Get resale
                .mockResolvedValueOnce(mockBuyer); // Get buyer balance

            const mockTx = {
                none: jest.fn().mockResolvedValue(undefined)
            };
            (pgpDb.tx as jest.Mock).mockImplementation((fn) => fn(mockTx));

            // Mock findById for final result
            jest.spyOn(EventTicketResaleRepository, 'findById').mockResolvedValue({
                status: true,
                message: 'Found',
                body: { ...mockResale, status: 'sold' },
                code: 200
            });

            const purchaseData = {
                resale_id: 1,
                buyer_id: 456,
                payment_method: 'wallet',
                payment_reference: 'PAY-001'
            };

            const result = await EventTicketResaleRepository.purchase(purchaseData);

            expect(result.status).toBe(true);
            expect(result.code).toBe(200);
            expect(result.message).toBe('Ticket purchased successfully');

            // Verify transaction calls
            expect(mockTx.none).toHaveBeenCalledTimes(4);
            expect(mockTx.none).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE customer'),
                [456, 20000] // Deduct from buyer
            );
            expect(mockTx.none).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE customer'),
                [123, 18000] // Credit seller (90%)
            );
        });

        it('should fail if resale not found or not available', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(null);

            const purchaseData = {
                resale_id: 999,
                buyer_id: 456,
                payment_method: 'wallet'
            };

            const result = await EventTicketResaleRepository.purchase(purchaseData);

            expect(result.status).toBe(false);
            expect(result.code).toBe(404);
            expect(result.message).toBe('Resale listing not found or not available');
        });

        it('should fail if resale expired', async () => {
            const mockResale = {
                id: 1,
                status: 'listed',
                expires_at: new Date('2020-01-01') // Expired
            };

            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(mockResale);
            (pgpDb.none as jest.Mock).mockResolvedValue(undefined);

            const purchaseData = {
                resale_id: 1,
                buyer_id: 456,
                payment_method: 'wallet'
            };

            const result = await EventTicketResaleRepository.purchase(purchaseData);

            expect(result.status).toBe(false);
            expect(result.code).toBe(400);
            expect(result.message).toBe('Resale listing has expired');

            // Should update status to expired
            expect(pgpDb.none).toHaveBeenCalledWith(
                expect.stringContaining('status = \'expired\''),
                [1]
            );
        });

        it('should fail if buyer tries to purchase own ticket', async () => {
            const mockResale = {
                id: 1,
                seller_id: 123,
                status: 'listed',
                expires_at: null
            };

            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(mockResale);

            const purchaseData = {
                resale_id: 1,
                buyer_id: 123, // Same as seller
                payment_method: 'wallet'
            };

            const result = await EventTicketResaleRepository.purchase(purchaseData);

            expect(result.status).toBe(false);
            expect(result.code).toBe(400);
            expect(result.message).toBe('Cannot purchase your own ticket');
        });

        it('should fail if insufficient wallet balance', async () => {
            const mockResale = {
                id: 1,
                seller_id: 123,
                resale_price: 20000,
                status: 'listed',
                expires_at: null
            };

            const mockBuyer = { wallet_balance: 10000 }; // Insufficient

            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce(mockResale)
                .mockResolvedValueOnce(mockBuyer);

            const purchaseData = {
                resale_id: 1,
                buyer_id: 456,
                payment_method: 'wallet'
            };

            const result = await EventTicketResaleRepository.purchase(purchaseData);

            expect(result.status).toBe(false);
            expect(result.code).toBe(400);
            expect(result.message).toBe('Insufficient wallet balance');
        });

        it('should handle transaction errors', async () => {
            const mockResale = {
                id: 1,
                seller_id: 123,
                resale_price: 20000,
                status: 'listed',
                expires_at: null
            };

            const mockBuyer = { wallet_balance: 50000 };

            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce(mockResale)
                .mockResolvedValueOnce(mockBuyer);

            (pgpDb.tx as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

            const purchaseData = {
                resale_id: 1,
                buyer_id: 456,
                payment_method: 'wallet'
            };

            const result = await EventTicketResaleRepository.purchase(purchaseData);

            expect(result.status).toBe(false);
            expect(result.code).toBe(500);
        });
    });

    describe('update', () => {
        it('should update resale price', async () => {
            const mockUpdated = {
                id: 1,
                resale_price: 18000,
                status: 'listed'
            };

            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(mockUpdated);

            const result = await EventTicketResaleRepository.update(1, { resale_price: 18000 });

            expect(result.status).toBe(true);
            expect(result.code).toBe(200);
            expect(result.body?.resale_price).toBe(18000);
        });

        it('should fail if no fields to update', async () => {
            const result = await EventTicketResaleRepository.update(1, {});

            expect(result.status).toBe(false);
            expect(result.code).toBe(400);
            expect(result.message).toBe('No fields to update');
        });

        it('should return 404 if resale not found', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(null);

            const result = await EventTicketResaleRepository.update(999, { resale_price: 15000 });

            expect(result.status).toBe(false);
            expect(result.code).toBe(404);
        });
    });

    describe('cancel', () => {
        it('should cancel resale listing', async () => {
            (pgpDb.result as jest.Mock).mockResolvedValue({ rowCount: 1 });

            const result = await EventTicketResaleRepository.cancel(1, 123, 'Changed my mind');

            expect(result.status).toBe(true);
            expect(result.code).toBe(200);
            expect(result.message).toBe('Resale cancelled successfully');
        });

        it('should fail if resale not found or cannot be cancelled', async () => {
            (pgpDb.result as jest.Mock).mockResolvedValue({ rowCount: 0 });

            const result = await EventTicketResaleRepository.cancel(999, 123);

            expect(result.status).toBe(false);
            expect(result.code).toBe(404);
        });

        it('should handle database errors', async () => {
            (pgpDb.result as jest.Mock).mockRejectedValue(new Error('Database error'));

            const result = await EventTicketResaleRepository.cancel(1, 123);

            expect(result.status).toBe(false);
            expect(result.code).toBe(500);
        });
    });

    describe('expireOldListings', () => {
        it('should expire old listings and return count', async () => {
            (pgpDb.result as jest.Mock).mockResolvedValue({ rowCount: 5 });

            const count = await EventTicketResaleRepository.expireOldListings();

            expect(count).toBe(5);
            expect(pgpDb.result).toHaveBeenCalledWith(
                expect.stringContaining('status = \'expired\'')
            );
        });

        it('should return 0 if no listings expired', async () => {
            (pgpDb.result as jest.Mock).mockResolvedValue({ rowCount: 0 });

            const count = await EventTicketResaleRepository.expireOldListings();

            expect(count).toBe(0);
        });

        it('should handle database errors', async () => {
            (pgpDb.result as jest.Mock).mockRejectedValue(new Error('Database error'));

            const count = await EventTicketResaleRepository.expireOldListings();

            expect(count).toBe(0);
        });
    });

    describe('getStatistics', () => {
        it('should get resale statistics for specific event', async () => {
            const mockStats = {
                total_listings: 10,
                active_listings: 5,
                sold_listings: 3,
                total_resale_value: 60000,
                total_commission: 6000,
                avg_listing_price: 15000
            };

            (pgpDb.one as jest.Mock).mockResolvedValue(mockStats);

            const result = await EventTicketResaleRepository.getStatistics(10);

            expect(result.status).toBe(true);
            expect(result.code).toBe(200);
            expect(result.body?.total_listings).toBe(10);
            expect(result.body?.total_commission).toBe(6000);
        });

        it('should get global statistics if no event specified', async () => {
            const mockStats = {
                total_listings: 100,
                active_listings: 40,
                sold_listings: 50
            };

            (pgpDb.one as jest.Mock).mockResolvedValue(mockStats);

            const result = await EventTicketResaleRepository.getStatistics();

            expect(result.status).toBe(true);
            expect(result.body?.total_listings).toBe(100);
        });

        it('should handle database errors', async () => {
            (pgpDb.one as jest.Mock).mockRejectedValue(new Error('Database error'));

            const result = await EventTicketResaleRepository.getStatistics();

            expect(result.status).toBe(false);
            expect(result.code).toBe(500);
        });
    });

    describe('softDelete', () => {
        it('should soft delete resale', async () => {
            (pgpDb.result as jest.Mock).mockResolvedValue({ rowCount: 1 });

            const result = await EventTicketResaleRepository.softDelete(1, 999);

            expect(result.status).toBe(true);
            expect(result.code).toBe(200);
            expect(result.message).toBe('Resale deleted successfully');
        });

        it('should fail if resale not found', async () => {
            (pgpDb.result as jest.Mock).mockResolvedValue({ rowCount: 0 });

            const result = await EventTicketResaleRepository.softDelete(999);

            expect(result.status).toBe(false);
            expect(result.code).toBe(404);
        });

        it('should handle database errors', async () => {
            (pgpDb.result as jest.Mock).mockRejectedValue(new Error('Database error'));

            const result = await EventTicketResaleRepository.softDelete(1);

            expect(result.status).toBe(false);
            expect(result.code).toBe(500);
        });
    });
});

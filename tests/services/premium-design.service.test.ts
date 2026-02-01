import { PremiumDesignService } from '../../src/services/premium-design.service';
import pgpDb from '../../src/config/pgdb';

jest.mock('../../src/config/pgdb');

describe('PremiumDesignService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateDesignPrice', () => {
        it('should return correct pricing for small events (≤200)', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({
                tier: 'small',
                price: 15000,
                min_capacity: 0,
                max_capacity: 200,
                name_en: 'Premium Ticket Design - Small Events',
                name_fr: 'Design Premium Tickets - Petits Événements',
                description_en: 'Professional ticket design for events up to 200 attendees',
                description_fr: 'Design professionnel de tickets pour événements jusqu\'à 200 participants'
            });

            const result = await PremiumDesignService.calculateDesignPrice(150);

            expect(result).toBeDefined();
            expect(result?.tier).toBe('small');
            expect(result?.price).toBe(15000);
            expect(result?.capacity).toBe(150);
        });

        it('should return correct pricing for medium events (201-1000)', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({
                tier: 'medium',
                price: 25000,
                min_capacity: 201,
                max_capacity: 1000,
                name_en: 'Premium Ticket Design - Medium Events',
                name_fr: 'Design Premium Tickets - Événements Moyens',
                description_en: 'Professional ticket design for events 201-1000 attendees',
                description_fr: 'Design professionnel de tickets pour événements de 201-1000 participants'
            });

            const result = await PremiumDesignService.calculateDesignPrice(500);

            expect(result).toBeDefined();
            expect(result?.tier).toBe('medium');
            expect(result?.price).toBe(25000);
        });

        it('should return correct pricing for large events (1001-5000)', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({
                tier: 'large',
                price: 40000,
                min_capacity: 1001,
                max_capacity: 5000,
                name_en: 'Premium Ticket Design - Large Events',
                name_fr: 'Design Premium Tickets - Grands Événements',
                description_en: 'Professional ticket design for events 1001-5000 attendees',
                description_fr: 'Design professionnel de tickets pour événements de 1001-5000 participants'
            });

            const result = await PremiumDesignService.calculateDesignPrice(3000);

            expect(result).toBeDefined();
            expect(result?.tier).toBe('large');
            expect(result?.price).toBe(40000);
        });

        it('should return correct pricing for xlarge events (>5000)', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({
                tier: 'xlarge',
                price: 60000,
                min_capacity: 5001,
                max_capacity: null,
                name_en: 'Premium Ticket Design - Extra Large Events',
                name_fr: 'Design Premium Tickets - Très Grands Événements',
                description_en: 'Professional ticket design for events over 5000 attendees',
                description_fr: 'Design professionnel de tickets pour événements de plus de 5000 participants'
            });

            const result = await PremiumDesignService.calculateDesignPrice(10000);

            expect(result).toBeDefined();
            expect(result?.tier).toBe('xlarge');
            expect(result?.price).toBe(60000);
        });

        it('should return null if no pricing found', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(null);

            const result = await PremiumDesignService.calculateDesignPrice(999999);

            expect(result).toBeNull();
        });

        it('should handle database errors', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockRejectedValue(new Error('Database error'));

            await expect(
                PremiumDesignService.calculateDesignPrice(100)
            ).rejects.toThrow('Failed to calculate premium design price');
        });
    });

    describe('getAllDesignPricing', () => {
        it('should return all design pricing tiers', async () => {
            const mockPricing = [
                { tier: 'small', price: 15000, min_capacity: 0, max_capacity: 200, name_en: 'Small', name_fr: 'Petit', description_en: 'Desc', description_fr: 'Desc' },
                { tier: 'medium', price: 25000, min_capacity: 201, max_capacity: 1000, name_en: 'Medium', name_fr: 'Moyen', description_en: 'Desc', description_fr: 'Desc' },
                { tier: 'large', price: 40000, min_capacity: 1001, max_capacity: 5000, name_en: 'Large', name_fr: 'Grand', description_en: 'Desc', description_fr: 'Desc' },
                { tier: 'xlarge', price: 60000, min_capacity: 5001, max_capacity: null, name_en: 'XLarge', name_fr: 'Très Grand', description_en: 'Desc', description_fr: 'Desc' }
            ];

            (pgpDb.any as jest.Mock).mockResolvedValue(mockPricing);

            const result = await PremiumDesignService.getAllDesignPricing();

            expect(result).toHaveLength(4);
            expect(result[0].tier).toBe('small');
            expect(result[3].tier).toBe('xlarge');
        });
    });

    describe('markDesignAsPaid', () => {
        it('should mark design as paid for an event', async () => {
            (pgpDb.none as jest.Mock).mockResolvedValue(undefined);

            const result = await PremiumDesignService.markDesignAsPaid(10, 25000);

            expect(result).toBe(true);
            expect(pgpDb.none).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE event'),
                [10, 25000]
            );
        });

        it('should handle errors gracefully', async () => {
            (pgpDb.none as jest.Mock).mockRejectedValue(new Error('Update failed'));

            const result = await PremiumDesignService.markDesignAsPaid(10, 25000);

            expect(result).toBe(false);
        });
    });

    describe('hasEventPaidForDesign', () => {
        it('should return true if design is paid', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({
                premium_design_paid: true
            });

            const result = await PremiumDesignService.hasEventPaidForDesign(10);

            expect(result).toBe(true);
        });

        it('should return false if design is not paid', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({
                premium_design_paid: false
            });

            const result = await PremiumDesignService.hasEventPaidForDesign(10);

            expect(result).toBe(false);
        });

        it('should return false if event not found', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(null);

            const result = await PremiumDesignService.hasEventPaidForDesign(999);

            expect(result).toBe(false);
        });
    });

    describe('validateDesignRequirement', () => {
        it('should return canPublish true if design is already paid', async () => {
            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce({
                    total_tickets: 500,
                    premium_design_paid: true,
                    premium_design_amount: 25000
                })
                .mockResolvedValueOnce({
                    tier: 'medium',
                    price: 25000,
                    min_capacity: 201,
                    max_capacity: 1000,
                    name_en: 'Premium Ticket Design - Medium Events',
                    name_fr: 'Design Premium Tickets - Événements Moyens',
                    description_en: 'Professional ticket design for events 201-1000 attendees',
                    description_fr: 'Design professionnel de tickets pour événements de 201-1000 participants'
                });

            const result = await PremiumDesignService.validateDesignRequirement(10);

            expect(result.required).toBe(true);
            expect(result.paid).toBe(true);
            expect(result.canPublish).toBe(true);
            expect(result.message).toBe('Premium design already paid');
        });

        it('should return canPublish false if design is not paid', async () => {
            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce({
                    total_tickets: 500,
                    premium_design_paid: false,
                    premium_design_amount: 0
                })
                .mockResolvedValueOnce({
                    tier: 'medium',
                    price: 25000,
                    name_en: 'Premium Ticket Design - Medium Events'
                });

            const result = await PremiumDesignService.validateDesignRequirement(10);

            expect(result.required).toBe(true);
            expect(result.paid).toBe(false);
            expect(result.canPublish).toBe(false);
            expect(result.amount).toBe(25000);
            expect(result.message).toContain('Premium design required');
        });

        it('should return error if event not found', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(null);

            const result = await PremiumDesignService.validateDesignRequirement(999);

            expect(result.required).toBe(true);
            expect(result.paid).toBe(false);
            expect(result.canPublish).toBe(false);
            expect(result.message).toBe('Event not found');
        });

        it('should handle pricing calculation errors', async () => {
            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce({
                    total_tickets: 500,
                    premium_design_paid: false,
                    premium_design_amount: 0
                })
                .mockResolvedValueOnce(null); // No pricing found

            const result = await PremiumDesignService.validateDesignRequirement(10);

            expect(result.required).toBe(true);
            expect(result.paid).toBe(false);
            expect(result.canPublish).toBe(false);
            expect(result.message).toBe('Unable to calculate design pricing');
        });
    });
});

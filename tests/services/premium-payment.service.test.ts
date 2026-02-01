import { PremiumPaymentService } from '../../src/services/premium-payment.service';
import { PremiumDesignService } from '../../src/services/premium-design.service';
import { VisibilityBoostService } from '../../src/services/visibility-boost.service';
import pgpDb from '../../src/config/pgdb';

jest.mock('../../src/config/pgdb');
jest.mock('../../src/services/premium-design.service');
jest.mock('../../src/services/visibility-boost.service');

describe('PremiumPaymentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('calculateTotalCost', () => {
        it('should calculate cost for design only (mandatory)', async () => {
            (pgpDb.one as jest.Mock).mockResolvedValue({ total_tickets: 500 });
            (PremiumDesignService.calculateDesignPrice as jest.Mock).mockResolvedValue({
                tier: 'medium',
                price: 25000,
                capacity: 500
            });

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true
            };

            const breakdown = await PremiumPaymentService.calculateTotalCost(request);

            expect(breakdown.design).toBe(25000);
            expect(breakdown.boostHomepage).toBe(0);
            expect(breakdown.boostCategory).toBe(0);
            expect(breakdown.fieldService).toBe(0);
            expect(breakdown.marketing).toBe(0);
            expect(breakdown.sms).toBe(0);
            expect(breakdown.total).toBe(25000);
            expect(breakdown.details.designTier).toBe('medium');
        });

        it('should calculate cost with homepage boost', async () => {
            (pgpDb.one as jest.Mock).mockResolvedValue({ total_tickets: 500 });
            (PremiumDesignService.calculateDesignPrice as jest.Mock).mockResolvedValue({
                tier: 'medium',
                price: 25000,
                capacity: 500
            });
            (VisibilityBoostService.getBoostPricing as jest.Mock).mockResolvedValue({
                type: 'homepage',
                duration: 7,
                price: 5000,
                name_en: 'Homepage 7d',
                name_fr: 'Accueil 7j',
                description_en: 'Desc',
                description_fr: 'Desc'
            });

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true,
                boostHomepage: true,
                boostDurationDays: 7 as const
            };

            const breakdown = await PremiumPaymentService.calculateTotalCost(request);

            expect(breakdown.design).toBe(25000);
            expect(breakdown.boostHomepage).toBe(5000);
            expect(breakdown.boostCategory).toBe(0);
            expect(breakdown.total).toBe(30000);
            expect(breakdown.details.boostDuration).toBe(7);
        });

        it('should calculate cost with both homepage and category boost', async () => {
            (pgpDb.one as jest.Mock).mockResolvedValue({ total_tickets: 500 });
            (PremiumDesignService.calculateDesignPrice as jest.Mock).mockResolvedValue({
                tier: 'medium',
                price: 25000,
                capacity: 500
            });
            (VisibilityBoostService.getBoostPricing as jest.Mock)
                .mockResolvedValueOnce({
                    type: 'homepage',
                    duration: 14,
                    price: 8000,
                    name_en: 'Homepage 14d',
                    name_fr: 'Accueil 14j',
                    description_en: 'Desc',
                    description_fr: 'Desc'
                })
                .mockResolvedValueOnce({
                    type: 'category',
                    duration: 14,
                    price: 6000,
                    name_en: 'Category 14d',
                    name_fr: 'Catégorie 14j',
                    description_en: 'Desc',
                    description_fr: 'Desc'
                });

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true,
                boostHomepage: true,
                boostCategory: true,
                boostDurationDays: 14 as const
            };

            const breakdown = await PremiumPaymentService.calculateTotalCost(request);

            expect(breakdown.design).toBe(25000);
            expect(breakdown.boostHomepage).toBe(8000);
            expect(breakdown.boostCategory).toBe(6000);
            expect(breakdown.total).toBe(39000);
        });

        it('should calculate cost with field service (agents and scanners)', async () => {
            (pgpDb.one as jest.Mock).mockResolvedValue({ total_tickets: 500 });
            (PremiumDesignService.calculateDesignPrice as jest.Mock).mockResolvedValue({
                tier: 'medium',
                price: 25000,
                capacity: 500
            });
            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce({ base_price: 10000 }) // Agent price
                .mockResolvedValueOnce({ base_price: 5000 }); // Scanner price

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true,
                fieldServiceAgents: 2,
                fieldServiceScanners: 3,
                fieldServiceDays: 2
            };

            const breakdown = await PremiumPaymentService.calculateTotalCost(request);

            expect(breakdown.design).toBe(25000);
            expect(breakdown.fieldService).toBe((2 * 10000 * 2) + (3 * 5000 * 2)); // (2 agents * 10k * 2 days) + (3 scanners * 5k * 2 days) = 40k + 30k = 70k
            expect(breakdown.total).toBe(95000);
            expect(breakdown.details.fieldAgents).toBe(2);
            expect(breakdown.details.fieldScanners).toBe(3);
            expect(breakdown.details.fieldDays).toBe(2);
        });

        it('should calculate cost with marketing services', async () => {
            (pgpDb.one as jest.Mock).mockResolvedValue({ total_tickets: 500 });
            (PremiumDesignService.calculateDesignPrice as jest.Mock).mockResolvedValue({
                tier: 'medium',
                price: 25000,
                capacity: 500
            });
            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce({ base_price: 5000 }); // Basic poster

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true,
                marketingPosterBasic: true,
                marketingAdsEnabled: true,
                marketingAdsBudget: 20000
            };

            const breakdown = await PremiumPaymentService.calculateTotalCost(request);

            expect(breakdown.design).toBe(25000);
            expect(breakdown.marketing).toBe(25000); // 5k poster + 20k ads
            expect(breakdown.total).toBe(50000);
            expect(breakdown.details.posterType).toBe('basic');
            expect(breakdown.details.adsBudget).toBe(20000);
        });

        it('should calculate cost with premium poster instead of basic', async () => {
            (pgpDb.one as jest.Mock).mockResolvedValue({ total_tickets: 500 });
            (PremiumDesignService.calculateDesignPrice as jest.Mock).mockResolvedValue({
                tier: 'medium',
                price: 25000,
                capacity: 500
            });
            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce({ base_price: 10000 }); // Premium poster

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true,
                marketingPosterPremium: true
            };

            const breakdown = await PremiumPaymentService.calculateTotalCost(request);

            expect(breakdown.marketing).toBe(10000);
            expect(breakdown.details.posterType).toBe('premium');
        });

        it('should calculate cost with SMS notifications', async () => {
            (pgpDb.one as jest.Mock).mockResolvedValue({ total_tickets: 500 });
            (PremiumDesignService.calculateDesignPrice as jest.Mock).mockResolvedValue({
                tier: 'medium',
                price: 25000,
                capacity: 500
            });
            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce({ base_price: 30 }); // SMS price per message

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true,
                smsNotifications: 100
            };

            const breakdown = await PremiumPaymentService.calculateTotalCost(request);

            expect(breakdown.design).toBe(25000);
            expect(breakdown.sms).toBe(3000); // 100 * 30
            expect(breakdown.total).toBe(28000);
            expect(breakdown.details.smsCount).toBe(100);
        });

        it('should calculate cost with ALL premium services combined', async () => {
            (pgpDb.one as jest.Mock).mockResolvedValue({ total_tickets: 500 });
            (PremiumDesignService.calculateDesignPrice as jest.Mock).mockResolvedValue({
                tier: 'medium',
                price: 25000,
                capacity: 500
            });
            (VisibilityBoostService.getBoostPricing as jest.Mock)
                .mockResolvedValueOnce({ type: 'homepage', duration: 30, price: 15000, name_en: 'H', name_fr: 'H', description_en: 'D', description_fr: 'D' })
                .mockResolvedValueOnce({ type: 'category', duration: 30, price: 12000, name_en: 'C', name_fr: 'C', description_en: 'D', description_fr: 'D' });
            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce({ base_price: 10000 }) // Agent
                .mockResolvedValueOnce({ base_price: 5000 }) // Scanner
                .mockResolvedValueOnce({ base_price: 10000 }) // Premium poster
                .mockResolvedValueOnce({ base_price: 30 }); // SMS

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true,
                boostHomepage: true,
                boostCategory: true,
                boostDurationDays: 30 as const,
                fieldServiceAgents: 2,
                fieldServiceScanners: 1,
                fieldServiceDays: 3,
                marketingPosterPremium: true,
                marketingAdsEnabled: true,
                marketingAdsBudget: 50000,
                smsNotifications: 200
            };

            const breakdown = await PremiumPaymentService.calculateTotalCost(request);

            expect(breakdown.design).toBe(25000);
            expect(breakdown.boostHomepage).toBe(15000);
            expect(breakdown.boostCategory).toBe(12000);
            expect(breakdown.fieldService).toBe((2 * 10000 * 3) + (1 * 5000 * 3)); // 60k + 15k = 75k
            expect(breakdown.marketing).toBe(60000); // 10k poster + 50k ads
            expect(breakdown.sms).toBe(6000); // 200 * 30
            expect(breakdown.total).toBe(193000);
        });

        it('should handle missing design pricing gracefully', async () => {
            (pgpDb.one as jest.Mock).mockResolvedValue({ total_tickets: 500 });
            (PremiumDesignService.calculateDesignPrice as jest.Mock).mockResolvedValue(null);

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true
            };

            const breakdown = await PremiumPaymentService.calculateTotalCost(request);

            expect(breakdown.design).toBe(0);
            expect(breakdown.total).toBe(0);
        });

        it('should handle database errors', async () => {
            (pgpDb.one as jest.Mock).mockRejectedValue(new Error('Database error'));

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true
            };

            await expect(
                PremiumPaymentService.calculateTotalCost(request)
            ).rejects.toThrow('Failed to calculate premium services cost');
        });
    });

    describe('processWalletPayment', () => {
        it('should process payment successfully', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({ wallet_balance: 50000 });
            (pgpDb.none as jest.Mock).mockResolvedValue(undefined);
            (pgpDb.one as jest.Mock).mockResolvedValue({ id: 999 });

            const result = await PremiumPaymentService.processWalletPayment(
                123,
                25000,
                'Premium services payment',
                10
            );

            expect(result.success).toBe(true);
            expect(result.transactionId).toBe(999);
            expect(pgpDb.none).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE customer'),
                [123, 25000]
            );
            expect(pgpDb.one).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO wallet_transaction'),
                expect.arrayContaining([123, 25000, 50000, 'Premium services payment'])
            );
        });

        it('should fail if wallet balance insufficient', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({ wallet_balance: 10000 });

            const result = await PremiumPaymentService.processWalletPayment(
                123,
                25000,
                'Premium services payment',
                10
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Insufficient wallet balance');
            expect(pgpDb.none).not.toHaveBeenCalled();
        });

        it('should fail if customer not found', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(null);

            const result = await PremiumPaymentService.processWalletPayment(
                999,
                25000,
                'Premium services payment',
                10
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Insufficient wallet balance');
        });

        it('should continue if wallet_transaction table does not exist', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({ wallet_balance: 50000 });
            (pgpDb.none as jest.Mock).mockResolvedValue(undefined);
            (pgpDb.one as jest.Mock).mockRejectedValue(new Error('Table does not exist'));

            const result = await PremiumPaymentService.processWalletPayment(
                123,
                25000,
                'Premium services payment',
                10
            );

            expect(result.success).toBe(true);
            expect(result.transactionId).toBeUndefined();
        });

        it('should handle wallet update errors', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({ wallet_balance: 50000 });
            (pgpDb.none as jest.Mock).mockRejectedValue(new Error('Update failed'));

            const result = await PremiumPaymentService.processWalletPayment(
                123,
                25000,
                'Premium services payment',
                10
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment processing failed');
        });
    });

    describe('applyPremiumServices', () => {
        it('should apply design-only services to event', async () => {
            (pgpDb.none as jest.Mock).mockResolvedValue(undefined);

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true
            };

            const breakdown = {
                design: 25000,
                boostHomepage: 0,
                boostCategory: 0,
                fieldService: 0,
                marketing: 0,
                sms: 0,
                total: 25000,
                details: { designTier: 'medium' }
            };

            const result = await PremiumPaymentService.applyPremiumServices(request, breakdown);

            expect(result).toBe(true);
            expect(pgpDb.none).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE event'),
                expect.arrayContaining([
                    10,
                    25000,
                    false, // boost_visibility
                    0, // boost_duration_days
                    0 // boost_amount
                ])
            );
            expect(VisibilityBoostService.applyBoost).not.toHaveBeenCalled();
        });

        it('should apply design + boost services and call VisibilityBoostService', async () => {
            (pgpDb.none as jest.Mock).mockResolvedValue(undefined);
            (VisibilityBoostService.applyBoost as jest.Mock).mockResolvedValue(true);

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true,
                boostHomepage: true,
                boostDurationDays: 7 as const
            };

            const breakdown = {
                design: 25000,
                boostHomepage: 5000,
                boostCategory: 0,
                fieldService: 0,
                marketing: 0,
                sms: 0,
                total: 30000,
                details: { designTier: 'medium', boostDuration: 7 }
            };

            const result = await PremiumPaymentService.applyPremiumServices(request, breakdown);

            expect(result).toBe(true);
            expect(pgpDb.none).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE event'),
                expect.arrayContaining([
                    10,
                    25000,
                    true, // boost_visibility
                    7, // boost_duration_days
                    5000 // boost_amount
                ])
            );
            expect(VisibilityBoostService.applyBoost).toHaveBeenCalledWith(10, {
                homepage: true,
                category: false,
                duration_days: 7,
                total_cost: 5000
            });
        });

        it('should apply all premium services', async () => {
            (pgpDb.none as jest.Mock).mockResolvedValue(undefined);
            (VisibilityBoostService.applyBoost as jest.Mock).mockResolvedValue(true);

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true,
                boostHomepage: true,
                boostCategory: true,
                boostDurationDays: 30 as const,
                fieldServiceAgents: 2,
                fieldServiceScanners: 1,
                fieldServiceDays: 3,
                marketingPosterPremium: true,
                marketingAdsEnabled: true,
                marketingAdsBudget: 50000,
                smsNotifications: 200
            };

            const breakdown = {
                design: 25000,
                boostHomepage: 15000,
                boostCategory: 12000,
                fieldService: 75000,
                marketing: 60000,
                sms: 6000,
                total: 193000,
                details: {}
            };

            const result = await PremiumPaymentService.applyPremiumServices(request, breakdown);

            expect(result).toBe(true);
            expect(pgpDb.none).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE event'),
                expect.arrayContaining([
                    10,
                    25000, // design
                    true, // boost_visibility
                    30, // boost_duration_days
                    27000, // boost_amount (15k + 12k)
                    true, // field_service
                    2, // agents
                    1, // scanners
                    75000, // field_service_amount
                    false, // poster_basic
                    true, // poster_premium
                    true, // ads_enabled
                    50000, // ads_budget
                    true, // sms_enabled
                    200, // sms_count
                    6000 // sms_cost
                ])
            );
            expect(VisibilityBoostService.applyBoost).toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            (pgpDb.none as jest.Mock).mockRejectedValue(new Error('Update failed'));

            const request = {
                eventId: 10,
                customerId: 123,
                designRequired: true
            };

            const breakdown = {
                design: 25000,
                boostHomepage: 0,
                boostCategory: 0,
                fieldService: 0,
                marketing: 0,
                sms: 0,
                total: 25000,
                details: {}
            };

            const result = await PremiumPaymentService.applyPremiumServices(request, breakdown);

            expect(result).toBe(false);
        });
    });
});

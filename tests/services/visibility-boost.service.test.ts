import { VisibilityBoostService } from '../../src/services/visibility-boost.service';
import pgpDb from '../../src/config/pgdb';

jest.mock('../../src/config/pgdb');

describe('VisibilityBoostService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getBoostPricing', () => {
        it('should return homepage boost pricing for 7 days', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({
                price: 5000,
                duration: 7,
                name_en: 'Homepage Featured - 7 Days',
                name_fr: 'Page d\'accueil vedette - 7 jours',
                description_en: '7 days of homepage visibility',
                description_fr: '7 jours de visibilité sur la page d\'accueil'
            });

            const result = await VisibilityBoostService.getBoostPricing('homepage', 7);

            expect(result).toBeDefined();
            expect(result?.type).toBe('homepage');
            expect(result?.duration).toBe(7);
            expect(result?.price).toBe(5000);
            expect(pgpDb.oneOrNone).toHaveBeenCalledWith(
                expect.stringContaining('boost_homepage'),
                ['boost_homepage', '7days']
            );
        });

        it('should return category boost pricing for 14 days', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({
                price: 6000,
                duration: 14,
                name_en: 'Category Priority - 14 Days',
                name_fr: 'Priorité catégorie - 14 jours',
                description_en: '14 days of category priority',
                description_fr: '14 jours de priorité dans la catégorie'
            });

            const result = await VisibilityBoostService.getBoostPricing('category', 14);

            expect(result).toBeDefined();
            expect(result?.type).toBe('category');
            expect(result?.duration).toBe(14);
            expect(result?.price).toBe(6000);
            expect(pgpDb.oneOrNone).toHaveBeenCalledWith(
                expect.stringContaining('boost_category'),
                ['boost_category', '14days']
            );
        });

        it('should return homepage boost pricing for 30 days', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({
                price: 15000,
                duration: 30,
                name_en: 'Homepage Featured - 30 Days',
                name_fr: 'Page d\'accueil vedette - 30 jours',
                description_en: '30 days of homepage visibility',
                description_fr: '30 jours de visibilité sur la page d\'accueil'
            });

            const result = await VisibilityBoostService.getBoostPricing('homepage', 30);

            expect(result).toBeDefined();
            expect(result?.price).toBe(15000);
            expect(result?.duration).toBe(30);
        });

        it('should return null if no pricing found', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(null);

            const result = await VisibilityBoostService.getBoostPricing('homepage', 7);

            expect(result).toBeNull();
        });

        it('should handle database errors', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockRejectedValue(new Error('Database error'));

            await expect(
                VisibilityBoostService.getBoostPricing('homepage', 7)
            ).rejects.toThrow('Failed to get boost pricing');
        });
    });

    describe('calculateBoostCost', () => {
        it('should calculate cost for homepage boost only', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({
                price: 5000,
                duration: 7,
                name_en: 'Homepage Featured - 7 Days',
                name_fr: 'Page d\'accueil vedette - 7 jours',
                description_en: '7 days',
                description_fr: '7 jours'
            });

            const cost = await VisibilityBoostService.calculateBoostCost(true, false, 7);

            expect(cost).toBe(5000);
            expect(pgpDb.oneOrNone).toHaveBeenCalledTimes(1);
        });

        it('should calculate cost for category boost only', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue({
                price: 3000,
                duration: 7,
                name_en: 'Category Priority - 7 Days',
                name_fr: 'Priorité catégorie - 7 jours',
                description_en: '7 days',
                description_fr: '7 jours'
            });

            const cost = await VisibilityBoostService.calculateBoostCost(false, true, 7);

            expect(cost).toBe(3000);
        });

        it('should calculate combined cost for both boosts', async () => {
            (pgpDb.oneOrNone as jest.Mock)
                .mockResolvedValueOnce({
                    price: 5000,
                    duration: 7,
                    name_en: 'Homepage Featured - 7 Days',
                    name_fr: 'Page d\'accueil vedette - 7 jours',
                    description_en: '7 days',
                    description_fr: '7 jours'
                })
                .mockResolvedValueOnce({
                    price: 3000,
                    duration: 7,
                    name_en: 'Category Priority - 7 Days',
                    name_fr: 'Priorité catégorie - 7 jours',
                    description_en: '7 days',
                    description_fr: '7 jours'
                });

            const cost = await VisibilityBoostService.calculateBoostCost(true, true, 7);

            expect(cost).toBe(8000); // 5000 + 3000
            expect(pgpDb.oneOrNone).toHaveBeenCalledTimes(2);
        });

        it('should return 0 if no boosts selected', async () => {
            const cost = await VisibilityBoostService.calculateBoostCost(false, false, 7);

            expect(cost).toBe(0);
            expect(pgpDb.oneOrNone).not.toHaveBeenCalled();
        });

        it('should handle pricing not found gracefully', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockResolvedValue(null);

            const cost = await VisibilityBoostService.calculateBoostCost(true, false, 7);

            expect(cost).toBe(0);
        });

        it('should handle database errors', async () => {
            (pgpDb.oneOrNone as jest.Mock).mockRejectedValue(new Error('Database error'));

            await expect(
                VisibilityBoostService.calculateBoostCost(true, false, 7)
            ).rejects.toThrow('Failed to calculate boost cost');
        });
    });

    describe('getAllBoostOptions', () => {
        it('should return all homepage and category boost options', async () => {
            const mockHomepageOptions = [
                { price: 5000, duration: 7, name_en: 'Homepage 7d', name_fr: 'Accueil 7j', description_en: 'Desc', description_fr: 'Desc' },
                { price: 8000, duration: 14, name_en: 'Homepage 14d', name_fr: 'Accueil 14j', description_en: 'Desc', description_fr: 'Desc' },
                { price: 15000, duration: 30, name_en: 'Homepage 30d', name_fr: 'Accueil 30j', description_en: 'Desc', description_fr: 'Desc' }
            ];

            const mockCategoryOptions = [
                { price: 3000, duration: 7, name_en: 'Category 7d', name_fr: 'Catégorie 7j', description_en: 'Desc', description_fr: 'Desc' },
                { price: 6000, duration: 14, name_en: 'Category 14d', name_fr: 'Catégorie 14j', description_en: 'Desc', description_fr: 'Desc' },
                { price: 12000, duration: 30, name_en: 'Category 30d', name_fr: 'Catégorie 30j', description_en: 'Desc', description_fr: 'Desc' }
            ];

            (pgpDb.any as jest.Mock)
                .mockResolvedValueOnce(mockHomepageOptions)
                .mockResolvedValueOnce(mockCategoryOptions);

            const result = await VisibilityBoostService.getAllBoostOptions();

            expect(result.homepage).toHaveLength(3);
            expect(result.category).toHaveLength(3);
            expect(result.homepage[0].type).toBe('homepage');
            expect(result.category[0].type).toBe('category');
            expect(result.homepage[0].price).toBe(5000);
            expect(result.category[0].price).toBe(3000);
        });

        it('should return empty arrays if no options found', async () => {
            (pgpDb.any as jest.Mock)
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const result = await VisibilityBoostService.getAllBoostOptions();

            expect(result.homepage).toHaveLength(0);
            expect(result.category).toHaveLength(0);
        });

        it('should handle database errors', async () => {
            (pgpDb.any as jest.Mock).mockRejectedValue(new Error('Database error'));

            await expect(
                VisibilityBoostService.getAllBoostOptions()
            ).rejects.toThrow('Failed to fetch boost options');
        });
    });

    describe('applyBoost', () => {
        it('should apply homepage boost to event', async () => {
            (pgpDb.none as jest.Mock).mockResolvedValue(undefined);

            const config = {
                homepage: true,
                category: false,
                duration_days: 7 as const,
                total_cost: 5000
            };

            const result = await VisibilityBoostService.applyBoost(10, config);

            expect(result).toBe(true);
            expect(pgpDb.none).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE event'),
                expect.arrayContaining([
                    10,
                    7,
                    5000,
                    true, // is_featured
                    expect.any(Date),
                    expect.any(Date),
                    'homepage',
                    5000
                ])
            );
        });

        it('should apply category boost to event', async () => {
            (pgpDb.none as jest.Mock).mockResolvedValue(undefined);

            const config = {
                homepage: false,
                category: true,
                duration_days: 14 as const,
                total_cost: 6000
            };

            const result = await VisibilityBoostService.applyBoost(10, config);

            expect(result).toBe(true);
            expect(pgpDb.none).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE event'),
                expect.arrayContaining([
                    10,
                    14,
                    6000,
                    true,
                    expect.any(Date),
                    expect.any(Date),
                    'category',
                    6000
                ])
            );
        });

        it('should apply both boosts to event', async () => {
            (pgpDb.none as jest.Mock).mockResolvedValue(undefined);

            const config = {
                homepage: true,
                category: true,
                duration_days: 30 as const,
                total_cost: 27000
            };

            const result = await VisibilityBoostService.applyBoost(10, config);

            expect(result).toBe(true);
            expect(pgpDb.none).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE event'),
                expect.arrayContaining([
                    10,
                    30,
                    27000,
                    true,
                    expect.any(Date),
                    expect.any(Date),
                    'both',
                    27000
                ])
            );
        });

        it('should use custom start and end dates if provided', async () => {
            (pgpDb.none as jest.Mock).mockResolvedValue(undefined);

            const startDate = new Date('2025-12-01');
            const endDate = new Date('2025-12-08');

            const config = {
                homepage: true,
                category: false,
                duration_days: 7 as const,
                total_cost: 5000,
                start_date: startDate,
                end_date: endDate
            };

            const result = await VisibilityBoostService.applyBoost(10, config);

            expect(result).toBe(true);
            expect(pgpDb.none).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE event'),
                expect.arrayContaining([
                    10,
                    7,
                    5000,
                    true,
                    startDate,
                    endDate,
                    'homepage',
                    5000
                ])
            );
        });

        it('should calculate end date based on duration if not provided', async () => {
            (pgpDb.none as jest.Mock).mockResolvedValue(undefined);

            const config = {
                homepage: true,
                category: false,
                duration_days: 7 as const,
                total_cost: 5000
            };

            await VisibilityBoostService.applyBoost(10, config);

            const callArgs = (pgpDb.none as jest.Mock).mock.calls[0][1];
            const startDate = callArgs[4] as Date;
            const endDate = callArgs[5] as Date;

            const expectedEndDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            expect(endDate.getTime()).toBe(expectedEndDate.getTime());
        });

        it('should return false on database error', async () => {
            (pgpDb.none as jest.Mock).mockRejectedValue(new Error('Update failed'));

            const config = {
                homepage: true,
                category: false,
                duration_days: 7 as const,
                total_cost: 5000
            };

            const result = await VisibilityBoostService.applyBoost(10, config);

            expect(result).toBe(false);
        });
    });

    describe('checkAndExpireBoosts', () => {
        it('should expire boosted events past their end date', async () => {
            (pgpDb.result as jest.Mock).mockResolvedValue({
                rowCount: 3
            });

            const expiredCount = await VisibilityBoostService.checkAndExpireBoosts();

            expect(expiredCount).toBe(3);
            expect(pgpDb.result).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE event')
            );
            expect(pgpDb.result).toHaveBeenCalledWith(
                expect.stringContaining('is_featured = FALSE')
            );
            expect(pgpDb.result).toHaveBeenCalledWith(
                expect.stringContaining('featured_end_date < CURRENT_TIMESTAMP')
            );
        });

        it('should return 0 if no boosts expired', async () => {
            (pgpDb.result as jest.Mock).mockResolvedValue({
                rowCount: 0
            });

            const expiredCount = await VisibilityBoostService.checkAndExpireBoosts();

            expect(expiredCount).toBe(0);
        });

        it('should handle database errors gracefully', async () => {
            (pgpDb.result as jest.Mock).mockRejectedValue(new Error('Database error'));

            const expiredCount = await VisibilityBoostService.checkAndExpireBoosts();

            expect(expiredCount).toBe(0);
        });
    });

    describe('getActiveBoostedEvents', () => {
        it('should return all active boosted events', async () => {
            const mockEvents = [
                {
                    id: 1,
                    title: 'Event 1',
                    event_code: 'EVT-2025-001',
                    is_featured: true,
                    featured_placement_type: 'homepage',
                    featured_start_date: new Date('2025-12-01'),
                    featured_end_date: new Date('2025-12-08'),
                    boost_amount: 5000
                },
                {
                    id: 2,
                    title: 'Event 2',
                    event_code: 'EVT-2025-002',
                    is_featured: true,
                    featured_placement_type: 'both',
                    featured_start_date: new Date('2025-12-01'),
                    featured_end_date: new Date('2025-12-31'),
                    boost_amount: 27000
                }
            ];

            (pgpDb.any as jest.Mock).mockResolvedValue(mockEvents);

            const result = await VisibilityBoostService.getActiveBoostedEvents();

            expect(result).toHaveLength(2);
            expect(result[0].is_featured).toBe(true);
            expect(result[0].featured_placement_type).toBe('homepage');
            expect(pgpDb.any).toHaveBeenCalledWith(
                expect.stringContaining('is_featured = TRUE')
            );
            expect(pgpDb.any).toHaveBeenCalledWith(
                expect.stringContaining('featured_end_date >= CURRENT_TIMESTAMP')
            );
        });

        it('should return empty array if no active boosts', async () => {
            (pgpDb.any as jest.Mock).mockResolvedValue([]);

            const result = await VisibilityBoostService.getActiveBoostedEvents();

            expect(result).toHaveLength(0);
        });

        it('should handle database errors gracefully', async () => {
            (pgpDb.any as jest.Mock).mockRejectedValue(new Error('Database error'));

            const result = await VisibilityBoostService.getActiveBoostedEvents();

            expect(result).toHaveLength(0);
        });
    });
});

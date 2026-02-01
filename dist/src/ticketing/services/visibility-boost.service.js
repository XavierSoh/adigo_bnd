"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisibilityBoostService = void 0;
const pgdb_1 = __importDefault(require("../../config/pgdb"));
class VisibilityBoostService {
    /**
     * Get boost pricing for a specific type and duration
     */
    static async getBoostPricing(type, duration) {
        try {
            const serviceType = type === 'homepage' ? 'boost_homepage' : 'boost_category';
            const subtype = `${duration}days`;
            const pricing = await pgdb_1.default.oneOrNone(`
                SELECT
                    base_price as price,
                    duration_days as duration,
                    name_en,
                    name_fr,
                    description_en,
                    description_fr
                FROM event_premium_service_pricing
                WHERE service_type = $1
                AND service_subtype = $2
                AND is_active = TRUE
                AND is_deleted = FALSE
            `, [serviceType, subtype]);
            if (!pricing) {
                console.warn(`⚠️  No pricing found for ${type} boost (${duration} days)`);
                return null;
            }
            return {
                type,
                duration: pricing.duration,
                price: pricing.price,
                name_en: pricing.name_en,
                name_fr: pricing.name_fr,
                description_en: pricing.description_en,
                description_fr: pricing.description_fr
            };
        }
        catch (error) {
            console.error('❌ Error getting boost pricing:', error);
            throw new Error('Failed to get boost pricing');
        }
    }
    /**
     * Calculate total cost for boost configuration
     */
    static async calculateBoostCost(homepage, category, duration) {
        try {
            let totalCost = 0;
            if (homepage) {
                const homepagePricing = await this.getBoostPricing('homepage', duration);
                if (homepagePricing) {
                    totalCost += homepagePricing.price;
                }
            }
            if (category) {
                const categoryPricing = await this.getBoostPricing('category', duration);
                if (categoryPricing) {
                    totalCost += categoryPricing.price;
                }
            }
            return totalCost;
        }
        catch (error) {
            console.error('❌ Error calculating boost cost:', error);
            throw new Error('Failed to calculate boost cost');
        }
    }
    /**
     * Get all available boost options
     */
    static async getAllBoostOptions() {
        try {
            // Homepage options
            const homepage = await pgdb_1.default.any(`
                SELECT
                    base_price as price,
                    duration_days as duration,
                    name_en,
                    name_fr,
                    description_en,
                    description_fr
                FROM event_premium_service_pricing
                WHERE service_type = 'boost_homepage'
                AND is_active = TRUE
                AND is_deleted = FALSE
                ORDER BY duration_days ASC
            `);
            // Category options
            const category = await pgdb_1.default.any(`
                SELECT
                    base_price as price,
                    duration_days as duration,
                    name_en,
                    name_fr,
                    description_en,
                    description_fr
                FROM event_premium_service_pricing
                WHERE service_type = 'boost_category'
                AND is_active = TRUE
                AND is_deleted = FALSE
                ORDER BY duration_days ASC
            `);
            return {
                homepage: homepage.map(p => ({
                    type: 'homepage',
                    duration: p.duration,
                    price: p.price,
                    name_en: p.name_en,
                    name_fr: p.name_fr,
                    description_en: p.description_en,
                    description_fr: p.description_fr
                })),
                category: category.map(p => ({
                    type: 'category',
                    duration: p.duration,
                    price: p.price,
                    name_en: p.name_en,
                    name_fr: p.name_fr,
                    description_en: p.description_en,
                    description_fr: p.description_fr
                }))
            };
        }
        catch (error) {
            console.error('❌ Error fetching boost options:', error);
            throw new Error('Failed to fetch boost options');
        }
    }
    /**
     * Apply boost to an event
     */
    static async applyBoost(eventId, config) {
        try {
            const startDate = config.start_date || new Date();
            const endDate = config.end_date || new Date(startDate.getTime() + config.duration_days * 24 * 60 * 60 * 1000);
            // Update event with boost configuration
            await pgdb_1.default.none(`
                UPDATE event
                SET
                    boost_visibility = TRUE,
                    boost_duration_days = $2,
                    boost_amount = $3,
                    is_featured = $4,
                    featured_start_date = $5,
                    featured_end_date = $6,
                    featured_placement_type = $7,
                    featured_placement_amount = $8,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [
                eventId,
                config.duration_days,
                config.total_cost,
                config.homepage || config.category,
                startDate,
                endDate,
                config.homepage && config.category ? 'both' :
                    config.homepage ? 'homepage' : 'category',
                config.total_cost
            ]);
            console.log(`✅ Boost applied to event ${eventId}:`, {
                homepage: config.homepage,
                category: config.category,
                duration: config.duration_days,
                cost: config.total_cost
            });
            return true;
        }
        catch (error) {
            console.error('❌ Error applying boost:', error);
            return false;
        }
    }
    /**
     * Check if event boost has expired
     */
    static async checkAndExpireBoosts() {
        try {
            const result = await pgdb_1.default.result(`
                UPDATE event
                SET
                    is_featured = FALSE,
                    boost_visibility = FALSE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE is_featured = TRUE
                AND featured_end_date < CURRENT_TIMESTAMP
                AND is_deleted = FALSE
            `);
            const expiredCount = result.rowCount;
            if (expiredCount > 0) {
                console.log(`⏰ Expired ${expiredCount} event boost(s)`);
            }
            return expiredCount;
        }
        catch (error) {
            console.error('❌ Error expiring boosts:', error);
            return 0;
        }
    }
    /**
     * Get active boosted events
     */
    static async getActiveBoostedEvents() {
        try {
            const events = await pgdb_1.default.any(`
                SELECT
                    id,
                    title,
                    event_code,
                    is_featured,
                    featured_placement_type,
                    featured_start_date,
                    featured_end_date,
                    boost_amount
                FROM event
                WHERE is_featured = TRUE
                AND featured_end_date >= CURRENT_TIMESTAMP
                AND is_deleted = FALSE
                ORDER BY featured_start_date DESC
            `);
            return events;
        }
        catch (error) {
            console.error('❌ Error fetching boosted events:', error);
            return [];
        }
    }
}
exports.VisibilityBoostService = VisibilityBoostService;

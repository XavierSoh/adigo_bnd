"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PremiumDesignService = void 0;
const pgdb_1 = __importDefault(require("../../config/pgdb"));
class PremiumDesignService {
    /**
     * Calculate premium design price based on event capacity
     *
     * @param totalTickets - Total number of tickets for the event
     * @returns Pricing information
     */
    static async calculateDesignPrice(totalTickets) {
        try {
            // Query pricing from database based on capacity
            const pricing = await pgdb_1.default.oneOrNone(`
                SELECT
                    service_subtype as tier,
                    base_price as price,
                    min_capacity,
                    max_capacity,
                    name_en,
                    name_fr,
                    description_en,
                    description_fr
                FROM event_premium_service_pricing
                WHERE service_type = 'design'
                AND is_active = TRUE
                AND is_deleted = FALSE
                AND (
                    (min_capacity IS NULL OR $1 >= min_capacity)
                    AND (max_capacity IS NULL OR $1 <= max_capacity)
                )
                ORDER BY min_capacity DESC
                LIMIT 1
            `, [totalTickets]);
            if (!pricing) {
                console.warn(`⚠️  No pricing found for capacity: ${totalTickets}`);
                return null;
            }
            return {
                tier: pricing.tier,
                capacity: totalTickets,
                price: pricing.price,
                name_en: pricing.name_en,
                name_fr: pricing.name_fr,
                description_en: pricing.description_en,
                description_fr: pricing.description_fr
            };
        }
        catch (error) {
            console.error('❌ Error calculating design price:', error);
            throw new Error('Failed to calculate premium design price');
        }
    }
    /**
     * Get all design pricing tiers
     */
    static async getAllDesignPricing() {
        try {
            const pricingList = await pgdb_1.default.any(`
                SELECT
                    service_subtype as tier,
                    base_price as price,
                    min_capacity,
                    max_capacity,
                    name_en,
                    name_fr,
                    description_en,
                    description_fr
                FROM event_premium_service_pricing
                WHERE service_type = 'design'
                AND is_active = TRUE
                AND is_deleted = FALSE
                ORDER BY min_capacity ASC
            `);
            return pricingList.map(p => ({
                tier: p.tier,
                capacity: p.min_capacity || 0,
                price: p.price,
                name_en: p.name_en,
                name_fr: p.name_fr,
                description_en: p.description_en,
                description_fr: p.description_fr
            }));
        }
        catch (error) {
            console.error('❌ Error fetching design pricing:', error);
            throw new Error('Failed to fetch design pricing');
        }
    }
    /**
     * Mark design as paid for an event
     */
    static async markDesignAsPaid(eventId, amount) {
        try {
            await pgdb_1.default.none(`
                UPDATE event
                SET has_premium_design = TRUE,
                    premium_design_paid = TRUE,
                    premium_design_amount = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [eventId, amount]);
            console.log(`✅ Design marked as paid for event ${eventId}: ${amount} FCFA`);
            return true;
        }
        catch (error) {
            console.error('❌ Error marking design as paid:', error);
            return false;
        }
    }
    /**
     * Check if event has paid for premium design
     */
    static async hasEventPaidForDesign(eventId) {
        try {
            const result = await pgdb_1.default.oneOrNone(`
                SELECT premium_design_paid
                FROM event
                WHERE id = $1
            `, [eventId]);
            return result?.premium_design_paid || false;
        }
        catch (error) {
            console.error('❌ Error checking design payment status:', error);
            return false;
        }
    }
    /**
     * Validate if design payment is required before publishing
     */
    static async validateDesignRequirement(eventId) {
        try {
            const event = await pgdb_1.default.oneOrNone(`
                SELECT
                    total_tickets,
                    premium_design_paid,
                    premium_design_amount
                FROM event
                WHERE id = $1
            `, [eventId]);
            if (!event) {
                return {
                    required: true,
                    paid: false,
                    canPublish: false,
                    message: 'Event not found'
                };
            }
            // Design is MANDATORY for all events
            const pricing = await this.calculateDesignPrice(event.total_tickets);
            if (!pricing) {
                return {
                    required: true,
                    paid: false,
                    canPublish: false,
                    message: 'Unable to calculate design pricing'
                };
            }
            if (event.premium_design_paid) {
                return {
                    required: true,
                    paid: true,
                    amount: event.premium_design_amount,
                    canPublish: true,
                    message: 'Premium design already paid'
                };
            }
            return {
                required: true,
                paid: false,
                amount: pricing.price,
                canPublish: false,
                message: `Premium design required: ${pricing.price} FCFA (${pricing.name_en})`
            };
        }
        catch (error) {
            console.error('❌ Error validating design requirement:', error);
            throw new Error('Failed to validate design requirement');
        }
    }
}
exports.PremiumDesignService = PremiumDesignService;

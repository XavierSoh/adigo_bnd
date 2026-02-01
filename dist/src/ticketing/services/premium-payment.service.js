"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PremiumPaymentService = void 0;
const pgdb_1 = __importDefault(require("../../config/pgdb"));
const premium_design_service_1 = require("./premium-design.service");
const visibility_boost_service_1 = require("./visibility-boost.service");
class PremiumPaymentService {
    /**
     * Calculate total cost for all requested premium services
     */
    static async calculateTotalCost(request) {
        try {
            const breakdown = {
                design: 0,
                boostHomepage: 0,
                boostCategory: 0,
                fieldService: 0,
                marketing: 0,
                sms: 0,
                total: 0,
                details: {}
            };
            // 1. MANDATORY DESIGN
            const event = await pgdb_1.default.one('SELECT total_tickets FROM event WHERE id = $1', [request.eventId]);
            const designPricing = await premium_design_service_1.PremiumDesignService.calculateDesignPrice(event.total_tickets);
            if (designPricing) {
                breakdown.design = designPricing.price;
                breakdown.details.designTier = designPricing.tier;
            }
            // 2. VISIBILITY BOOST (OPTIONAL)
            if (request.boostDurationDays) {
                breakdown.details.boostDuration = request.boostDurationDays;
                if (request.boostHomepage) {
                    const homepagePricing = await visibility_boost_service_1.VisibilityBoostService.getBoostPricing('homepage', request.boostDurationDays);
                    if (homepagePricing) {
                        breakdown.boostHomepage = homepagePricing.price;
                    }
                }
                if (request.boostCategory) {
                    const categoryPricing = await visibility_boost_service_1.VisibilityBoostService.getBoostPricing('category', request.boostDurationDays);
                    if (categoryPricing) {
                        breakdown.boostCategory = categoryPricing.price;
                    }
                }
            }
            // 3. FIELD SERVICE (OPTIONAL)
            if (request.fieldServiceAgents || request.fieldServiceScanners) {
                const agentPrice = await this.getServicePrice('field_service', 'agent_per_day');
                const scannerPrice = await this.getServicePrice('field_service', 'scanner_rental_per_day');
                const days = request.fieldServiceDays || 1;
                const agentCost = (request.fieldServiceAgents || 0) * agentPrice * days;
                const scannerCost = (request.fieldServiceScanners || 0) * scannerPrice * days;
                breakdown.fieldService = agentCost + scannerCost;
                breakdown.details.fieldAgents = request.fieldServiceAgents;
                breakdown.details.fieldScanners = request.fieldServiceScanners;
                breakdown.details.fieldDays = days;
            }
            // 4. MARKETING (OPTIONAL)
            if (request.marketingPosterBasic) {
                const posterPrice = await this.getServicePrice('marketing', 'poster_basic');
                breakdown.marketing += posterPrice;
                breakdown.details.posterType = 'basic';
            }
            if (request.marketingPosterPremium) {
                const posterPrice = await this.getServicePrice('marketing', 'poster_premium');
                breakdown.marketing += posterPrice;
                breakdown.details.posterType = 'premium';
            }
            if (request.marketingAdsEnabled && request.marketingAdsBudget) {
                breakdown.marketing += request.marketingAdsBudget;
                breakdown.details.adsBudget = request.marketingAdsBudget;
            }
            // 5. SMS NOTIFICATIONS (OPTIONAL)
            if (request.smsNotifications) {
                const smsPrice = await this.getServicePrice('sms', 'notification_per_sms');
                breakdown.sms = request.smsNotifications * smsPrice;
                breakdown.details.smsCount = request.smsNotifications;
            }
            // Calculate total
            breakdown.total =
                breakdown.design +
                    breakdown.boostHomepage +
                    breakdown.boostCategory +
                    breakdown.fieldService +
                    breakdown.marketing +
                    breakdown.sms;
            return breakdown;
        }
        catch (error) {
            console.error('❌ Error calculating premium services cost:', error);
            throw new Error('Failed to calculate premium services cost');
        }
    }
    /**
     * Get service price from database
     */
    static async getServicePrice(serviceType, serviceSubtype) {
        try {
            const result = await pgdb_1.default.oneOrNone(`
                SELECT base_price
                FROM event_premium_service_pricing
                WHERE service_type = $1
                AND service_subtype = $2
                AND is_active = TRUE
                AND is_deleted = FALSE
            `, [serviceType, serviceSubtype]);
            return result?.base_price || 0;
        }
        catch (error) {
            console.error(`❌ Error getting price for ${serviceType}/${serviceSubtype}:`, error);
            return 0;
        }
    }
    /**
     * Process payment from wallet
     */
    static async processWalletPayment(customerId, amount, description, eventId) {
        try {
            // Check wallet balance
            const balance = await pgdb_1.default.oneOrNone('SELECT wallet_balance FROM customer WHERE id = $1', [customerId]);
            if (!balance || balance.wallet_balance < amount) {
                return {
                    success: false,
                    error: 'Insufficient wallet balance'
                };
            }
            // Deduct from wallet
            await pgdb_1.default.none(`
                UPDATE customer
                SET wallet_balance = wallet_balance - $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [customerId, amount]);
            // Record transaction (if wallet_transaction table exists)
            try {
                const transaction = await pgdb_1.default.one(`
                    INSERT INTO wallet_transaction (
                        customer_id,
                        transaction_type,
                        amount,
                        balance_before,
                        balance_after,
                        description,
                        status
                    ) VALUES (
                        $1, 'debit', $2, $3, $3 - $2, $4, 'completed'
                    )
                    RETURNING id
                `, [customerId, amount, balance.wallet_balance, description]);
                console.log(`💰 Wallet payment processed: ${amount} FCFA from customer ${customerId}`);
                return {
                    success: true,
                    transactionId: transaction.id
                };
            }
            catch (txError) {
                // Wallet transaction table might not exist, continue anyway
                console.warn('⚠️  Could not record wallet transaction:', txError);
                return { success: true };
            }
        }
        catch (error) {
            console.error('❌ Error processing wallet payment:', error);
            return {
                success: false,
                error: 'Payment processing failed'
            };
        }
    }
    /**
     * Apply all paid premium services to event
     */
    static async applyPremiumServices(request, breakdown) {
        try {
            // Update event with all premium service details
            await pgdb_1.default.none(`
                UPDATE event
                SET
                    has_premium_design = TRUE,
                    premium_design_paid = TRUE,
                    premium_design_amount = $2,

                    boost_visibility = $3,
                    boost_duration_days = $4,
                    boost_amount = $5,

                    field_service = $6,
                    field_service_agents = $7,
                    field_service_scanners = $8,
                    field_service_amount = $9,

                    marketing_poster_basic = $10,
                    marketing_poster_premium = $11,
                    marketing_ads_enabled = $12,
                    marketing_ads_budget = $13,

                    sms_notifications_enabled = $14,
                    sms_count = $15,
                    sms_cost_total = $16,

                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [
                request.eventId,
                breakdown.design,
                request.boostHomepage || request.boostCategory || false,
                request.boostDurationDays || 0,
                breakdown.boostHomepage + breakdown.boostCategory,
                (request.fieldServiceAgents || 0) > 0 || (request.fieldServiceScanners || 0) > 0,
                request.fieldServiceAgents || 0,
                request.fieldServiceScanners || 0,
                breakdown.fieldService,
                request.marketingPosterBasic || false,
                request.marketingPosterPremium || false,
                request.marketingAdsEnabled || false,
                request.marketingAdsBudget || 0,
                (request.smsNotifications || 0) > 0,
                request.smsNotifications || 0,
                breakdown.sms
            ]);
            // Apply visibility boost if requested
            if (request.boostHomepage || request.boostCategory) {
                await visibility_boost_service_1.VisibilityBoostService.applyBoost(request.eventId, {
                    homepage: request.boostHomepage || false,
                    category: request.boostCategory || false,
                    duration_days: request.boostDurationDays,
                    total_cost: breakdown.boostHomepage + breakdown.boostCategory
                });
            }
            console.log(`✅ Premium services applied to event ${request.eventId}`);
            return true;
        }
        catch (error) {
            console.error('❌ Error applying premium services:', error);
            return false;
        }
    }
}
exports.PremiumPaymentService = PremiumPaymentService;

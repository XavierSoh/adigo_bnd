import pgpDb from '../../config/pgdb';
import {
    EventPremiumServicePricing,
    EventPremiumServicePricingCreateDto,
    EventPremiumServicePricingUpdateDto,
    PricingSearchParams,
    ServiceType
} from '../models/event-premium-service-pricing.model';

/**
 * Event Premium Service Pricing Repository
 *
 * Manages configurable pricing for all ADIGO premium services
 */

export class EventPremiumServicePricingRepository {

    /**
     * Create new pricing rule
     */
    static async create(
        data: EventPremiumServicePricingCreateDto
    ): Promise<{ status: boolean; message: string; body?: EventPremiumServicePricing; code: number }> {
        try {
            const pricing = await pgpDb.one(`
                INSERT INTO event_premium_service_pricing (
                    service_type,
                    service_subtype,
                    base_price,
                    min_capacity,
                    max_capacity,
                    duration_days,
                    name_en,
                    name_fr,
                    description_en,
                    description_fr
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `, [
                data.service_type,
                data.service_subtype || null,
                data.base_price,
                data.min_capacity || null,
                data.max_capacity || null,
                data.duration_days || null,
                data.name_en,
                data.name_fr,
                data.description_en || null,
                data.description_fr || null
            ]);

            return {
                status: true,
                message: 'Pricing rule created successfully',
                body: pricing,
                code: 201
            };

        } catch (error: any) {
            console.error('Error creating pricing rule:', error);

            if (error.code === '23505') {
                return {
                    status: false,
                    message: 'Pricing rule already exists for this configuration',
                    code: 409
                };
            }

            return {
                status: false,
                message: 'Failed to create pricing rule',
                code: 500
            };
        }
    }

    /**
     * Find by ID
     */
    static async findById(id: number): Promise<{ status: boolean; message: string; body?: EventPremiumServicePricing; code: number }> {
        try {
            const pricing = await pgpDb.oneOrNone(`
                SELECT * FROM event_premium_service_pricing
                WHERE id = $1
                AND is_deleted = FALSE
            `, [id]);

            if (!pricing) {
                return {
                    status: false,
                    message: 'Pricing rule not found',
                    code: 404
                };
            }

            return {
                status: true,
                message: 'Pricing rule found',
                body: pricing,
                code: 200
            };

        } catch (error) {
            console.error('Error finding pricing rule:', error);
            return {
                status: false,
                message: 'Failed to find pricing rule',
                code: 500
            };
        }
    }

    /**
     * Get all pricing rules
     */
    static async findAll(includeDeleted: boolean = false): Promise<{ status: boolean; body?: EventPremiumServicePricing[]; code: number }> {
        try {
            const whereClause = includeDeleted ? '' : 'WHERE is_deleted = FALSE';

            const pricings = await pgpDb.any(`
                SELECT * FROM event_premium_service_pricing
                ${whereClause}
                ORDER BY service_type, min_capacity NULLS FIRST, duration_days NULLS FIRST
            `);

            return {
                status: true,
                body: pricings,
                code: 200
            };

        } catch (error) {
            console.error('Error finding pricing rules:', error);
            return {
                status: false,
                code: 500
            };
        }
    }

    /**
     * Get pricing by service type
     */
    static async findByServiceType(
        serviceType: ServiceType,
        isActiveOnly: boolean = true
    ): Promise<{ status: boolean; body?: EventPremiumServicePricing[]; code: number }> {
        try {
            let whereConditions = ['service_type = $1', 'is_deleted = FALSE'];
            const params: any[] = [serviceType];

            if (isActiveOnly) {
                whereConditions.push('is_active = TRUE');
            }

            const pricings = await pgpDb.any(`
                SELECT * FROM event_premium_service_pricing
                WHERE ${whereConditions.join(' AND ')}
                ORDER BY
                    CASE
                        WHEN min_capacity IS NOT NULL THEN min_capacity
                        WHEN duration_days IS NOT NULL THEN duration_days
                        ELSE 0
                    END ASC
            `, params);

            return {
                status: true,
                body: pricings,
                code: 200
            };

        } catch (error) {
            console.error('Error finding pricing by service type:', error);
            return {
                status: false,
                code: 500
            };
        }
    }

    /**
     * Search pricing with filters
     */
    static async search(params: PricingSearchParams): Promise<{ status: boolean; body?: EventPremiumServicePricing[]; code: number }> {
        try {
            let whereConditions = ['is_deleted = FALSE'];
            const queryParams: any[] = [];
            let paramIndex = 1;

            if (params.service_type) {
                whereConditions.push(`service_type = $${paramIndex}`);
                queryParams.push(params.service_type);
                paramIndex++;
            }

            if (params.is_active !== undefined) {
                whereConditions.push(`is_active = $${paramIndex}`);
                queryParams.push(params.is_active);
                paramIndex++;
            }

            const whereClause = whereConditions.join(' AND ');

            const pricings = await pgpDb.any(`
                SELECT * FROM event_premium_service_pricing
                WHERE ${whereClause}
                ORDER BY service_type, base_price ASC
            `, queryParams);

            return {
                status: true,
                body: pricings,
                code: 200
            };

        } catch (error) {
            console.error('Error searching pricing rules:', error);
            return {
                status: false,
                code: 500
            };
        }
    }

    /**
     * Get design pricing for capacity
     */
    static async getDesignPricingForCapacity(
        capacity: number
    ): Promise<{ status: boolean; message?: string; body?: EventPremiumServicePricing; code: number }> {
        try {
            const pricing = await pgpDb.oneOrNone(`
                SELECT * FROM event_premium_service_pricing
                WHERE service_type = 'design'
                AND is_active = TRUE
                AND is_deleted = FALSE
                AND (
                    (min_capacity IS NULL OR $1 >= min_capacity)
                    AND (max_capacity IS NULL OR $1 <= max_capacity)
                )
                ORDER BY min_capacity DESC
                LIMIT 1
            `, [capacity]);

            if (!pricing) {
                return {
                    status: false,
                    message: 'No pricing found for this capacity',
                    code: 404
                };
            }

            return {
                status: true,
                body: pricing,
                code: 200
            };

        } catch (error) {
            console.error('Error getting design pricing:', error);
            return {
                status: false,
                code: 500
            };
        }
    }

    /**
     * Get boost pricing
     */
    static async getBoostPricing(
        boostType: 'homepage' | 'category',
        durationDays: number
    ): Promise<{ status: boolean; message?: string; body?: EventPremiumServicePricing; code: number }> {
        try {
            const serviceType = boostType === 'homepage' ? 'boost_homepage' : 'boost_category';

            const pricing = await pgpDb.oneOrNone(`
                SELECT * FROM event_premium_service_pricing
                WHERE service_type = $1
                AND duration_days = $2
                AND is_active = TRUE
                AND is_deleted = FALSE
            `, [serviceType, durationDays]);

            if (!pricing) {
                return {
                    status: false,
                    message: `No pricing found for ${boostType} boost (${durationDays} days)`,
                    code: 404
                };
            }

            return {
                status: true,
                body: pricing,
                code: 200
            };

        } catch (error) {
            console.error('Error getting boost pricing:', error);
            return {
                status: false,
                code: 500
            };
        }
    }

    /**
     * Update pricing rule
     */
    static async update(
        id: number,
        data: EventPremiumServicePricingUpdateDto
    ): Promise<{ status: boolean; message: string; body?: EventPremiumServicePricing; code: number }> {
        try {
            const updates: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            if (data.base_price !== undefined) {
                updates.push(`base_price = $${paramIndex}`);
                params.push(data.base_price);
                paramIndex++;
            }

            if (data.min_capacity !== undefined) {
                updates.push(`min_capacity = $${paramIndex}`);
                params.push(data.min_capacity);
                paramIndex++;
            }

            if (data.max_capacity !== undefined) {
                updates.push(`max_capacity = $${paramIndex}`);
                params.push(data.max_capacity);
                paramIndex++;
            }

            if (data.duration_days !== undefined) {
                updates.push(`duration_days = $${paramIndex}`);
                params.push(data.duration_days);
                paramIndex++;
            }

            if (data.name_en) {
                updates.push(`name_en = $${paramIndex}`);
                params.push(data.name_en);
                paramIndex++;
            }

            if (data.name_fr) {
                updates.push(`name_fr = $${paramIndex}`);
                params.push(data.name_fr);
                paramIndex++;
            }

            if (data.description_en !== undefined) {
                updates.push(`description_en = $${paramIndex}`);
                params.push(data.description_en);
                paramIndex++;
            }

            if (data.description_fr !== undefined) {
                updates.push(`description_fr = $${paramIndex}`);
                params.push(data.description_fr);
                paramIndex++;
            }

            if (data.is_active !== undefined) {
                updates.push(`is_active = $${paramIndex}`);
                params.push(data.is_active);
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

            const pricing = await pgpDb.oneOrNone(`
                UPDATE event_premium_service_pricing
                SET ${updates.join(', ')}
                WHERE id = $${paramIndex}
                AND is_deleted = FALSE
                RETURNING *
            `, params);

            if (!pricing) {
                return {
                    status: false,
                    message: 'Pricing rule not found',
                    code: 404
                };
            }

            return {
                status: true,
                message: 'Pricing rule updated successfully',
                body: pricing,
                code: 200
            };

        } catch (error) {
            console.error('Error updating pricing rule:', error);
            return {
                status: false,
                message: 'Failed to update pricing rule',
                code: 500
            };
        }
    }

    /**
     * Toggle active status
     */
    static async toggleActive(id: number): Promise<{ status: boolean; message: string; code: number }> {
        try {
            const result = await pgpDb.result(`
                UPDATE event_premium_service_pricing
                SET is_active = NOT is_active
                WHERE id = $1
                AND is_deleted = FALSE
            `, [id]);

            if (result.rowCount === 0) {
                return {
                    status: false,
                    message: 'Pricing rule not found',
                    code: 404
                };
            }

            return {
                status: true,
                message: 'Pricing rule status toggled',
                code: 200
            };

        } catch (error) {
            console.error('Error toggling pricing status:', error);
            return {
                status: false,
                message: 'Failed to toggle pricing status',
                code: 500
            };
        }
    }

    /**
     * Soft delete
     */
    static async softDelete(id: number): Promise<{ status: boolean; message: string; code: number }> {
        try {
            const result = await pgpDb.result(`
                UPDATE event_premium_service_pricing
                SET
                    is_deleted = TRUE,
                    deleted_at = CURRENT_TIMESTAMP
                WHERE id = $1
                AND is_deleted = FALSE
            `, [id]);

            if (result.rowCount === 0) {
                return {
                    status: false,
                    message: 'Pricing rule not found',
                    code: 404
                };
            }

            return {
                status: true,
                message: 'Pricing rule deleted successfully',
                code: 200
            };

        } catch (error) {
            console.error('Error deleting pricing rule:', error);
            return {
                status: false,
                message: 'Failed to delete pricing rule',
                code: 500
            };
        }
    }

    /**
     * Restore deleted pricing
     */
    static async restore(id: number): Promise<{ status: boolean; message: string; code: number }> {
        try {
            const result = await pgpDb.result(`
                UPDATE event_premium_service_pricing
                SET
                    is_deleted = FALSE,
                    deleted_at = NULL
                WHERE id = $1
                AND is_deleted = TRUE
            `, [id]);

            if (result.rowCount === 0) {
                return {
                    status: false,
                    message: 'Pricing rule not found or not deleted',
                    code: 404
                };
            }

            return {
                status: true,
                message: 'Pricing rule restored successfully',
                code: 200
            };

        } catch (error) {
            console.error('Error restoring pricing rule:', error);
            return {
                status: false,
                message: 'Failed to restore pricing rule',
                code: 500
            };
        }
    }

    /**
     * Delete permanently
     */
    static async delete(id: number): Promise<{ status: boolean; message: string; code: number }> {
        try {
            const result = await pgpDb.result(`
                DELETE FROM event_premium_service_pricing
                WHERE id = $1
            `, [id]);

            if (result.rowCount === 0) {
                return {
                    status: false,
                    message: 'Pricing rule not found',
                    code: 404
                };
            }

            return {
                status: true,
                message: 'Pricing rule deleted permanently',
                code: 200
            };

        } catch (error) {
            console.error('Error permanently deleting pricing rule:', error);
            return {
                status: false,
                message: 'Failed to permanently delete pricing rule',
                code: 500
            };
        }
    }
}

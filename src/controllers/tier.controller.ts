import { Request, Response } from 'express';
import { TierService } from '../services/tier.service';
import { TIER_CONFIGS, getPointsToNextTier } from '../config/tier.config';
import { CustomerRepository } from '../repository/customer.repository';

export class TierController {
    /**
     * Get all tier configurations
     */
    static async getTierConfigs(req: Request, res: Response): Promise<void> {
        try {
            res.status(200).json({
                status: true,
                message: 'Tier configurations retrieved',
                body: TIER_CONFIGS,
                code: 200
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Error retrieving tier configurations',
                code: 500
            });
        }
    }

    /**
     * Get customer's current tier and progress to next tier
     */
    static async getCustomerTierProgress(req: Request, res: Response): Promise<void> {
        try {
            const customerId = parseInt((req.params as { customerId: string }).customerId);

            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: 'Invalid customer ID',
                    code: 400
                });
                return;
            }

            // Get customer data
            const customerResult = await CustomerRepository.findById(customerId);
            if (!customerResult.status) {
                res.status(customerResult.code).json(customerResult);
                return;
            }

            const customer = customerResult.body as any;
            const currentPoints = customer.loyalty_points || 0;
            const currentTier = customer.customer_tier || 'regular';

            // Calculate progress to next tier
            const { nextTier, pointsNeeded } = getPointsToNextTier(currentPoints);

            res.status(200).json({
                status: true,
                message: 'Customer tier progress retrieved',
                body: {
                    currentTier,
                    currentPoints,
                    nextTier: nextTier ? nextTier.name : null,
                    pointsNeeded,
                    nextTierMinPoints: nextTier ? nextTier.minPoints : null
                },
                code: 200
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Error retrieving customer tier progress',
                code: 500
            });
        }
    }

    /**
     * Manually recalculate customer tier (admin/debug endpoint)
     */
    static async recalculateCustomerTier(req: Request, res: Response): Promise<void> {
        try {
            const customerId = parseInt((req.params as { customerId: string }).customerId);

            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: 'Invalid customer ID',
                    code: 400
                });
                return;
            }

            const result = await TierService.recalculateTier(customerId);

            if (result.success) {
                res.status(200).json({
                    status: true,
                    message: 'Tier recalculated successfully',
                    body: { tier: result.tier },
                    code: 200
                });
            } else {
                res.status(500).json({
                    status: false,
                    message: 'Error recalculating tier',
                    code: 500
                });
            }
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Error recalculating tier',
                code: 500
            });
        }
    }
}

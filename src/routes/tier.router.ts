import { Router } from 'express';
import { TierController } from '../controllers/tier.controller';

const tierRouter = Router();

// Get all tier configurations
tierRouter.get('/configs', TierController.getTierConfigs);

// Get customer's tier progress
tierRouter.get('/:customerId/progress', TierController.getCustomerTierProgress);

// Recalculate customer tier (admin endpoint)
tierRouter.post('/:customerId/recalculate', TierController.recalculateCustomerTier);

export default tierRouter;

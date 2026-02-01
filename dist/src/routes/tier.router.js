"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tier_controller_1 = require("../controllers/tier.controller");
const tierRouter = (0, express_1.Router)();
// Get all tier configurations
tierRouter.get('/configs', tier_controller_1.TierController.getTierConfigs);
// Get customer's tier progress
tierRouter.get('/:customerId/progress', tier_controller_1.TierController.getCustomerTierProgress);
// Recalculate customer tier (admin endpoint)
tierRouter.post('/:customerId/recalculate', tier_controller_1.TierController.recalculateCustomerTier);
exports.default = tierRouter;

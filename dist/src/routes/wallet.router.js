"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wallet_controller_1 = require("../controllers/wallet.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const walletRouter = (0, express_1.Router)();
// All wallet routes require a valid token; WalletController additionally
// checks that the authenticated user owns the :customerId being accessed.
walletRouter.use(auth_middleware_1.authMiddleware);
walletRouter.get("/:customerId/balance", wallet_controller_1.WalletController.getBalance);
walletRouter.post("/:customerId/top-up", wallet_controller_1.WalletController.topUp);
walletRouter.get("/:customerId/transactions", wallet_controller_1.WalletController.getTransactions);
exports.default = walletRouter;

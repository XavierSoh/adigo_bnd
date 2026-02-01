"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wallet_controller_1 = require("../controllers/wallet.controller");
const walletRouter = (0, express_1.Router)();
// Wallet routes
walletRouter.get("/:customerId/balance", wallet_controller_1.WalletController.getBalance);
walletRouter.post("/:customerId/top-up", wallet_controller_1.WalletController.topUp);
walletRouter.get("/:customerId/transactions", wallet_controller_1.WalletController.getTransactions);
exports.default = walletRouter;

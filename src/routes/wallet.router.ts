import { Router } from "express";
import { WalletController } from "../controllers/wallet.controller";

const walletRouter = Router();

// Wallet routes
walletRouter.get("/:customerId/balance", WalletController.getBalance);
walletRouter.post("/:customerId/top-up", WalletController.topUp);
walletRouter.get("/:customerId/transactions", WalletController.getTransactions);

export default walletRouter;

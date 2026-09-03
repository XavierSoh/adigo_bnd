import { Router } from "express";
import { WalletController } from "../controllers/wallet.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const walletRouter = Router();

// All wallet routes require a valid token; WalletController additionally
// checks that the authenticated user owns the :customerId being accessed.
walletRouter.use(authMiddleware);

walletRouter.get("/:customerId/balance", WalletController.getBalance);
walletRouter.post("/:customerId/top-up", WalletController.topUp);
walletRouter.get("/:customerId/transactions", WalletController.getTransactions);

export default walletRouter;

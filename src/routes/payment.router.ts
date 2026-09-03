import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const paymentRouter = Router();

// Orange Money's callback — no auth (Orange calls it directly), status is
// always re-verified server-to-server before anything is trusted (see
// PaymentController.webhook).
paymentRouter.post("/orange-money/webhook", PaymentController.webhook);

paymentRouter.use(authMiddleware);

paymentRouter.post("/orange-money/wallet-topup", PaymentController.initiateWalletTopUp);
paymentRouter.get("/orange-money/status/:payToken", PaymentController.checkStatus);
// Admin listing — every incoming Orange Money transaction with details
// (?status=&purpose=&provider=&customer_id=&limit=&offset=).
paymentRouter.get("/orange-money/transactions", PaymentController.getAllTransactions);
paymentRouter.get("/:id", PaymentController.getById);

export default paymentRouter;

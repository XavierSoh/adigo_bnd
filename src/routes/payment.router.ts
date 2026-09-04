import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminRoleMiddleware } from "../middleware/admin-role.middleware";

const paymentRouter = Router();

// Orange Money's callback — no auth (Orange calls it directly), status is
// always re-verified server-to-server before anything is trusted (see
// PaymentController.webhook).
paymentRouter.post("/orange-money/webhook", PaymentController.webhook);

paymentRouter.use(authMiddleware);

paymentRouter.post("/orange-money/wallet-topup", PaymentController.initiateWalletTopUp);
paymentRouter.get("/orange-money/status/:payToken", PaymentController.checkStatus);
// Admin listing — every incoming Orange Money transaction with details
// (?status=&purpose=&provider=&customer_id=&limit=&offset=). Was missing
// adminRoleMiddleware entirely - any authenticated customer token could
// list every OTHER customer's transactions (name/email/phone/amount),
// found while wiring up the desktop admin payments screen.
paymentRouter.get("/orange-money/transactions", adminRoleMiddleware, PaymentController.getAllTransactions);
paymentRouter.get("/:id", PaymentController.getById);

export default paymentRouter;

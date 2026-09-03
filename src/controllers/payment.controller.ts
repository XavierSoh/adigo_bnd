import { Request, Response } from "express";
import { PaymentService } from "../services/payment/payment.service";
import { PaymentTransactionRepository } from "../repository/payment-transaction.repository";

export class PaymentController {
    /**
     * Wallet top-up via Orange Money. amount/subscriberMsisdn come from the
     * client, but that's safe here: the wallet is only ever credited once
     * Orange Money itself confirms the matching amount was actually paid
     * (see PaymentService.checkStatus -> settlement), not on the client's say-so.
     */
    static async initiateWalletTopUp(req: Request, res: Response): Promise<void> {
        try {
            const customerId = req.userId;
            if (!customerId) {
                res.status(401).json({ status: false, message: "Unauthorized", code: 401 });
                return;
            }

            const { amount, subscriberMsisdn } = req.body;
            const result = await PaymentService.initiate({
                customerId,
                purpose: 'wallet_topup',
                subscriberMsisdn,
                amount: Number(amount),
                description: 'Rechargement wallet Adigo',
            });
            res.status(result.code).json(result);
        } catch (error: any) {
            res.status(500).json({ status: false, message: error?.message || "Erreur serveur", code: 500 });
        }
    }

    /** Client polls this after initiate() while waiting for the customer to confirm on their phone. */
    static async checkStatus(req: Request, res: Response): Promise<void> {
        try {
            const payToken = String(req.params.payToken);
            const result = await PaymentService.checkStatus(payToken);
            res.status(result.code).json(result);
        } catch (error: any) {
            res.status(500).json({ status: false, message: error?.message || "Erreur serveur", code: 500 });
        }
    }

    /**
     * Orange Money's async callback (notifUrl). The exact payload shape
     * isn't documented, so this never trusts the body's own status field —
     * it only extracts a payToken from it and re-verifies server-to-server
     * via the same checkStatus() path used for polling. No auth on this
     * route (Orange calls it directly), which is exactly why nothing here
     * is trusted without that re-verification.
     */
    static async webhook(req: Request, res: Response): Promise<void> {
        try {
            const body = req.body || {};
            const payToken =
                body.payToken || body.pay_token || body?.data?.payToken || req.query.payToken;

            if (!payToken || typeof payToken !== 'string') {
                res.status(400).json({ status: false, message: "payToken manquant", code: 400 });
                return;
            }

            const result = await PaymentService.checkStatus(payToken);
            res.status(200).json({ status: true, message: "Notification traitée", code: 200 });
            if (!result.status) {
                console.error("Orange Money webhook: échec de vérification du statut", payToken, result.message);
            }
        } catch (error: any) {
            console.error("Orange Money webhook error:", error);
            // Always 200 so Orange doesn't retry-storm us for our own bugs;
            // the transaction can still be reconciled by polling.
            res.status(200).json({ status: false, message: "Erreur interne", code: 200 });
        }
    }

    /**
     * Admin: list every incoming Orange Money transaction, across all
     * purposes (wallet_topup, booking, ticket_purchase, future VTC rides),
     * with the paying customer's details. Pure read of what's already
     * stored — no call to Orange Money's API.
     */
    static async getAllTransactions(req: Request, res: Response): Promise<void> {
        try {
            const { status, purpose, provider, customer_id, limit, offset } = req.query;
            const result = await PaymentTransactionRepository.findAll({
                status: status as string | undefined,
                purpose: purpose as string | undefined,
                provider: provider as string | undefined,
                customerId: customer_id ? parseInt(customer_id as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
                offset: offset ? parseInt(offset as string) : undefined,
            });
            res.status(result.code).json(result);
        } catch (error: any) {
            res.status(500).json({ status: false, message: error?.message || "Erreur serveur", code: 500 });
        }
    }

    /** For support/debugging: fetch a transaction by id (own transactions only). */
    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const customerId = req.userId;
            const id = parseInt((req.params as { id: string }).id);
            const result = await PaymentTransactionRepository.findById(id);

            if (result.status && (result.body as any)?.customer_id !== customerId) {
                res.status(403).json({ status: false, message: "Forbidden", code: 403 });
                return;
            }

            res.status(result.code).json(result);
        } catch (error: any) {
            res.status(500).json({ status: false, message: error?.message || "Erreur serveur", code: 500 });
        }
    }
}

import { registerSettlementHandler } from "../payment-settlement.registry";
import { WalletRepository } from "../../../repository/wallet.repository";

registerSettlementHandler('wallet_topup', async (transaction) => {
    const reference = transaction.provider_txn_id || transaction.pay_token || transaction.order_id;
    const result = await WalletRepository.topUp(
        transaction.customer_id,
        transaction.amount,
        'orangeMoney',
        reference || undefined
    );
    if (!result.status) {
        console.error(
            `⚠️ Wallet top-up settlement failed for payment_transaction ${transaction.id}:`,
            result.message
        );
    }
});

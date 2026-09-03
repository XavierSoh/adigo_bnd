import { PaymentProviderName } from '../services/payment/payment-provider.registry';

export type PaymentPurpose = 'wallet_topup' | 'booking' | 'ticket_purchase';

export type PaymentTransactionStatus =
    | 'initiated'
    | 'pending'
    | 'successful'
    | 'failed'
    | 'expired';

export interface PaymentTransaction {
    id: number;
    customer_id: number;
    provider: PaymentProviderName;
    purpose: PaymentPurpose;
    purpose_ref_id: number | null;
    order_id: string;
    pay_token: string | null;
    subscriber_msisdn: string;
    amount: number;
    currency: string;
    description: string | null;
    status: PaymentTransactionStatus;
    provider_txn_id: string | null;
    settled: boolean;
    settled_at: string | null;
    error_message: string | null;
    metadata: Record<string, any> | null;
    created_at: string;
    updated_at: string | null;
}

export interface PaymentTransactionCreateDto {
    customer_id: number;
    provider: PaymentProviderName;
    purpose: PaymentPurpose;
    purpose_ref_id?: number | null;
    order_id: string;
    subscriber_msisdn: string;
    amount: number;
    description?: string;
    metadata?: Record<string, any>;
}

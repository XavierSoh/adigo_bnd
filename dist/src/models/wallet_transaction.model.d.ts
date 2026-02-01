export interface WalletTransaction {
    id?: number;
    customer_id: number;
    amount: number;
    transaction_type: 'top_up' | 'payment' | 'refund';
    payment_method?: string;
    payment_reference?: string;
    description?: string;
    balance_before: number;
    balance_after: number;
    created_at?: Date;
}
export interface TopUpRequest {
    amount: number;
    payment_method: 'orangeMoney' | 'mtn' | 'cash';
    payment_reference?: string;
}

export declare class WalletRepository {
    static getBalance(customerId: number): Promise<any>;
    static topUp(customerId: number, amount: number, paymentMethod: string, paymentReference?: string): Promise<any>;
    static getTransactions(customerId: number, limit?: number, offset?: number): Promise<any>;
    static recordPayment(customerId: number, amount: number, description: string): Promise<any>;
}

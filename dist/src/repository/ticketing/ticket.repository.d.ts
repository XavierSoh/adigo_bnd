import { TicketPurchaseDto, TicketPaymentDto } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";
export declare class TicketRepository {
    private static readonly SELECT_WITH_JOINS;
    static findByCustomerId(customerId: number): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static findByReference(reference: string): Promise<ResponseModel>;
    static purchase(data: TicketPurchaseDto): Promise<ResponseModel>;
    static confirmPayment(id: number, paymentData: TicketPaymentDto): Promise<ResponseModel>;
    static validate(id: number): Promise<ResponseModel>;
    static validateByQr(qrCode: string): Promise<ResponseModel>;
    static cancel(id: number): Promise<ResponseModel>;
}

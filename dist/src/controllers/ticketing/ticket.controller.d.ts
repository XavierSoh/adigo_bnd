import { Request, Response } from "express";
export declare class TicketController {
    static getMyTickets(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static getByReference(req: Request, res: Response): Promise<void>;
    static purchase(req: Request, res: Response): Promise<void>;
    static confirmPayment(req: Request, res: Response): Promise<void>;
    static validate(req: Request, res: Response): Promise<void>;
    static validateByQr(req: Request, res: Response): Promise<void>;
    static cancel(req: Request, res: Response): Promise<void>;
}

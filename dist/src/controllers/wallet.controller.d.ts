import { Request, Response } from "express";
export declare class WalletController {
    static getBalance(req: Request, res: Response): Promise<void>;
    static topUp(req: Request, res: Response): Promise<void>;
    static getTransactions(req: Request, res: Response): Promise<void>;
}

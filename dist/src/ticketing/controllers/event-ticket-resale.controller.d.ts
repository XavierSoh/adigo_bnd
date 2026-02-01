import { Request, Response } from "express";
export declare class EventTicketResaleController {
    static create(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static getByResaleCode(req: Request, res: Response): Promise<void>;
    static search(req: Request, res: Response): Promise<void>;
    static getActiveByEvent(req: Request, res: Response): Promise<void>;
    static purchase(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static cancel(req: Request, res: Response): Promise<void>;
    static getStatistics(req: Request, res: Response): Promise<void>;
    static softDelete(req: Request, res: Response): Promise<void>;
}

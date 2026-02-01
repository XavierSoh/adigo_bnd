import { Request, Response } from "express";
export declare class GeneratedTripController {
    static create(req: Request, res: Response): Promise<void>;
    static generateForPeriod(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static getAll(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static getByDateRange(req: Request, res: Response): Promise<void>;
    static updateStatus(req: Request, res: Response): Promise<void>;
    static assignStaff(req: Request, res: Response): Promise<void>;
    static getStatistics(req: Request, res: Response): Promise<void>;
    static updateAvailableSeats(req: Request, res: Response): Promise<void>;
    static getAvailableCities(req: Request, res: Response): Promise<void>;
}

import { Request, Response } from "express";
export declare class GeneratedTripSeatController {
    static getById(req: Request, res: Response): Promise<void>;
    static getByGeneratedTrip(req: Request, res: Response): Promise<void>;
    static getByStatus(req: Request, res: Response): Promise<void>;
    static countAvailable(req: Request, res: Response): Promise<void>;
    static getWithDetails(req: Request, res: Response): Promise<void>;
}

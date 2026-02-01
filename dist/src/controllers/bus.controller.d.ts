import { Request, Response } from "express";
import { BusModel } from "../models/bus.model";
export declare class BusController {
    static createBus(req: Request, res: Response): Promise<void>;
    static getAllBuses(req: Request, res: Response): Promise<void>;
    static getBusById(req: Request, res: Response): Promise<any>;
    static updateBus(req: Request, res: Response): Promise<any>;
    static softDeleteBus(req: Request, res: Response): Promise<any>;
    static restoreBus(req: Request, res: Response): Promise<any>;
    static deleteBus(req: Request, res: Response): Promise<any>;
    static createBulkBuses(req: Request, res: Response): Promise<any>;
    static getBulkBusesSampleData(): BusModel[];
    static createBulkBusesSample(req: Request, res: Response): Promise<any>;
}

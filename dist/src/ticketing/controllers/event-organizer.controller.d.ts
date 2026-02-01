import { Request, Response } from "express";
export declare class EventOrganizerController {
    static create(req: Request, res: Response): Promise<void>;
    static getByCustomerId(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static getAll(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static updateVerificationStatus(req: Request, res: Response): Promise<void>;
    static search(req: Request, res: Response): Promise<void>;
    static getVerified(req: Request, res: Response): Promise<void>;
    static getStatistics(req: Request, res: Response): Promise<void>;
    static softDelete(req: Request, res: Response): Promise<void>;
    static restore(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
}

import { Request, Response } from "express";
export declare class ReviewController {
    static getByEventId(req: Request, res: Response): Promise<void>;
    static getEventStats(req: Request, res: Response): Promise<void>;
    static create(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static approve(req: Request, res: Response): Promise<void>;
}

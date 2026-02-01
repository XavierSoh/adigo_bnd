import { Request, Response } from "express";
export declare class EventController {
    static create(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static getByEventCode(req: Request, res: Response): Promise<void>;
    static getAll(req: Request, res: Response): Promise<void>;
    static getByOrganizer(req: Request, res: Response): Promise<void>;
    static getByCategory(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static publish(req: Request, res: Response): Promise<void>;
    static approve(req: Request, res: Response): Promise<void>;
    static reject(req: Request, res: Response): Promise<void>;
    static cancel(req: Request, res: Response): Promise<void>;
    static search(req: Request, res: Response): Promise<void>;
    static getUpcoming(req: Request, res: Response): Promise<void>;
    static getPast(req: Request, res: Response): Promise<void>;
    static getFeatured(req: Request, res: Response): Promise<void>;
    static getPopular(req: Request, res: Response): Promise<void>;
    static getStatistics(req: Request, res: Response): Promise<void>;
    static getEventWithTickets(req: Request, res: Response): Promise<void>;
    static softDelete(req: Request, res: Response): Promise<void>;
    static restore(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
}

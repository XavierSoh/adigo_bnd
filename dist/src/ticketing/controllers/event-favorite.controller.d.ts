import { Request, Response } from "express";
export declare class EventFavoriteController {
    static create(req: Request, res: Response): Promise<void>;
    static remove(req: Request, res: Response): Promise<void>;
    static toggle(req: Request, res: Response): Promise<void>;
    static getByCustomer(req: Request, res: Response): Promise<void>;
    static getByEvent(req: Request, res: Response): Promise<void>;
    static isFavorited(req: Request, res: Response): Promise<void>;
    static getCountByEvent(req: Request, res: Response): Promise<void>;
    static getMostFavorited(req: Request, res: Response): Promise<void>;
    static getStatistics(req: Request, res: Response): Promise<void>;
    static removeAllByCustomer(req: Request, res: Response): Promise<void>;
    static removeAllByEvent(req: Request, res: Response): Promise<void>;
}

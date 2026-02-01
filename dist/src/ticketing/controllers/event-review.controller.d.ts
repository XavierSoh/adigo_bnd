import { Request, Response } from "express";
export declare class EventReviewController {
    static create(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static getByEvent(req: Request, res: Response): Promise<void>;
    static getByCustomer(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static approve(req: Request, res: Response): Promise<void>;
    static flag(req: Request, res: Response): Promise<void>;
    static unflag(req: Request, res: Response): Promise<void>;
    static getStatisticsByEvent(req: Request, res: Response): Promise<void>;
    static getTopRated(req: Request, res: Response): Promise<void>;
    static getPending(req: Request, res: Response): Promise<void>;
    static getFlagged(req: Request, res: Response): Promise<void>;
    static softDelete(req: Request, res: Response): Promise<void>;
    static restore(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
}

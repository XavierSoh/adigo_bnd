import { Request, Response } from "express";
export declare class EventController {
    static getAll(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static getByCode(req: Request, res: Response): Promise<void>;
    static search(req: Request, res: Response): Promise<void>;
    static create(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static publish(req: Request, res: Response): Promise<void>;
    static approve(req: Request, res: Response): Promise<void>;
    static cancel(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static getTicketTypes(req: Request, res: Response): Promise<void>;
    static createTicketType(req: Request, res: Response): Promise<void>;
    static updateTicketType(req: Request, res: Response): Promise<void>;
    static deleteTicketType(req: Request, res: Response): Promise<void>;
}

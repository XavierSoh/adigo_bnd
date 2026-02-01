import { Request, Response } from "express";
export declare class FavoriteController {
    static getMyFavorites(req: Request, res: Response): Promise<void>;
    static add(req: Request, res: Response): Promise<void>;
    static remove(req: Request, res: Response): Promise<void>;
    static toggle(req: Request, res: Response): Promise<void>;
    static check(req: Request, res: Response): Promise<void>;
}

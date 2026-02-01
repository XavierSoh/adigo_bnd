/**
 * Admin Users Controller
 *
 * Manages users from admin perspective
 */
import { Request, Response } from 'express';
export declare class AdminUsersController {
    /**
     * Get all users
     * GET /v1/api/ticketing/admin/users
     */
    static getAllUsers(req: Request, res: Response): Promise<void>;
    /**
     * Search users
     * GET /v1/api/ticketing/admin/users/search
     */
    static searchUsers(req: Request, res: Response): Promise<void>;
    /**
     * Get user by ID
     * GET /v1/api/ticketing/admin/users/:id
     */
    static getUserById(req: Request, res: Response): Promise<void>;
    /**
     * Update user status (activate/deactivate)
     * PATCH /v1/api/ticketing/admin/users/:id/status
     */
    static updateUserStatus(req: Request, res: Response): Promise<void>;
    /**
     * Get user transactions
     * GET /v1/api/ticketing/admin/users/:id/transactions
     */
    static getUserTransactions(req: Request, res: Response): Promise<void>;
    /**
     * Get user tickets
     * GET /v1/api/ticketing/admin/users/:id/tickets
     */
    static getUserTickets(req: Request, res: Response): Promise<void>;
    /**
     * Get user wallet details
     * GET /v1/api/ticketing/admin/users/:id/wallet
     */
    static getUserWallet(req: Request, res: Response): Promise<void>;
}

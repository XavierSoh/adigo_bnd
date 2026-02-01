// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import UserModel from "../models/user.model";
import { UserRepository } from "../repository/user.repository";
import { I18n } from "../utils/i18n";

export class UserController {
    static async register(req: Request, res: Response) {
        const lang = req.lang || 'en';
        const user = UserModel.fromJson(req.body);
        const response = await UserRepository.create(user);
 
        // Traduire le message de réponse
        if (response.message && response.status) {
            response.message = I18n.t('user_created', lang);
        }

        res.status(response.code || 500).json(response);
    }

    static async login(req: Request, res: Response) {
        const lang = req.lang || 'en';
        const { login, password } = req.body;

        if (!login || !password) {
            res.status(400).json({
                status: false,
                message: I18n.t('email_phone_password_required', lang),
                code: 400
            });
            return;
        }

        const response = await UserRepository.login(login, password);

        console.log(`Login response ${JSON.stringify(response)}`)

        // Traduire le message de réponse
        if (response.status) {
            response.message = I18n.t('user_login_success', lang);
        } else {
            response.message = I18n.t('user_login_failed', lang);
        }

        res.status(response.code || 500).json(response);
    }

    static async updateUser(req: Request, res: Response) {
        const lang = req.lang || 'en';
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            res.status(400).json({
                status: false,
                message: I18n.t('invalid_id', lang),
                code: 400
            });
            return;
        }

        const response = await UserRepository.update(parseInt(id), req.body);

        if (response.status && response.message) {
            response.message = I18n.t('user_updated', lang);
        }

        res.status(response.code || 500).json(response);
    }

    static async softDeleteUser(req: Request, res: Response) {
        const lang = req.lang || 'en';
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            res.status(400).json({
                status: false,
                message: I18n.t('invalid_id', lang),
                code: 400
            });
            return;
        }

        const response = await UserRepository.softDelete(parseInt(id));

        if (response.status && response.message) {
            response.message = I18n.t('user_deleted', lang);
        }

        res.status(response.code || 500).json(response);
    }

    static async deleteUser(req: Request, res: Response) {
        const lang = req.lang || 'en';
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            res.status(400).json({
                status: false,
                message: I18n.t('invalid_id', lang),
                code: 400
            });
            return;
        }

        const response = await UserRepository.delete(parseInt(id));

        if (response.status && response.message) {
            response.message = I18n.t('user_deleted', lang);
        }

        res.status(response.code || 500).json(response);
    }

    static async restoreUser(req: Request, res: Response) {
        const lang = req.lang || 'en';
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            res.status(400).json({
                status: false,
                message: I18n.t('invalid_id', lang),
                code: 400
            });
            return;
        }

        const response = await UserRepository.restore(parseInt(id));

        if (response.status && response.message) {
            response.message = I18n.t('user_restored', lang);
        }

        res.status(response.code || 500).json(response);
    }

    static async getUserById(req: Request, res: Response) {
        const lang = req.lang || 'en';
        const { id } = req.params;

        if (!id || isNaN(parseInt(id))) {
            res.status(400).json({
                status: false,
                message: I18n.t('invalid_id', lang),
                code: 400
            });
            return;
        }

        const { includeDeleted } = req.query;
        const response = await UserRepository.findById(
            parseInt(id),
            includeDeleted === 'true'
        );

        if (!response.status) {
            response.message = I18n.t('user_not_found', lang);
        }

        res.status(response.code || 500).json(response);
    }

    static async getAllUsers(req: Request, res: Response) {
        const lang = req.lang || 'en';
        const { includeDeleted } = req.query;
        const response = await UserRepository.findAll(
            includeDeleted === 'true'
        );

        if (response.status && response.message) {
            response.message = I18n.t('user_list_retrieved', lang);
        }

        res.status(response.code || 500).json(response);
    }
}
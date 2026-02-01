"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const user_repository_1 = require("../repository/user.repository");
const i18n_1 = require("../utils/i18n");
class UserController {
    static async register(req, res) {
        const lang = req.lang || 'en';
        const user = user_model_1.default.fromJson(req.body);
        const response = await user_repository_1.UserRepository.create(user);
        // Traduire le message de réponse
        if (response.message && response.status) {
            response.message = i18n_1.I18n.t('user_created', lang);
        }
        res.status(response.code || 500).json(response);
    }
    static async login(req, res) {
        const lang = req.lang || 'en';
        const { login, password } = req.body;
        if (!login || !password) {
            res.status(400).json({
                status: false,
                message: i18n_1.I18n.t('email_phone_password_required', lang),
                code: 400
            });
            return;
        }
        const response = await user_repository_1.UserRepository.login(login, password);
        console.log(`Login response ${JSON.stringify(response)}`);
        // Traduire le message de réponse
        if (response.status) {
            response.message = i18n_1.I18n.t('user_login_success', lang);
        }
        else {
            response.message = i18n_1.I18n.t('user_login_failed', lang);
        }
        res.status(response.code || 500).json(response);
    }
    static async updateUser(req, res) {
        const lang = req.lang || 'en';
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) {
            res.status(400).json({
                status: false,
                message: i18n_1.I18n.t('invalid_id', lang),
                code: 400
            });
            return;
        }
        const response = await user_repository_1.UserRepository.update(parseInt(id), req.body);
        if (response.status && response.message) {
            response.message = i18n_1.I18n.t('user_updated', lang);
        }
        res.status(response.code || 500).json(response);
    }
    static async softDeleteUser(req, res) {
        const lang = req.lang || 'en';
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) {
            res.status(400).json({
                status: false,
                message: i18n_1.I18n.t('invalid_id', lang),
                code: 400
            });
            return;
        }
        const response = await user_repository_1.UserRepository.softDelete(parseInt(id));
        if (response.status && response.message) {
            response.message = i18n_1.I18n.t('user_deleted', lang);
        }
        res.status(response.code || 500).json(response);
    }
    static async deleteUser(req, res) {
        const lang = req.lang || 'en';
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) {
            res.status(400).json({
                status: false,
                message: i18n_1.I18n.t('invalid_id', lang),
                code: 400
            });
            return;
        }
        const response = await user_repository_1.UserRepository.delete(parseInt(id));
        if (response.status && response.message) {
            response.message = i18n_1.I18n.t('user_deleted', lang);
        }
        res.status(response.code || 500).json(response);
    }
    static async restoreUser(req, res) {
        const lang = req.lang || 'en';
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) {
            res.status(400).json({
                status: false,
                message: i18n_1.I18n.t('invalid_id', lang),
                code: 400
            });
            return;
        }
        const response = await user_repository_1.UserRepository.restore(parseInt(id));
        if (response.status && response.message) {
            response.message = i18n_1.I18n.t('user_restored', lang);
        }
        res.status(response.code || 500).json(response);
    }
    static async getUserById(req, res) {
        const lang = req.lang || 'en';
        const { id } = req.params;
        if (!id || isNaN(parseInt(id))) {
            res.status(400).json({
                status: false,
                message: i18n_1.I18n.t('invalid_id', lang),
                code: 400
            });
            return;
        }
        const { includeDeleted } = req.query;
        const response = await user_repository_1.UserRepository.findById(parseInt(id), includeDeleted === 'true');
        if (!response.status) {
            response.message = i18n_1.I18n.t('user_not_found', lang);
        }
        res.status(response.code || 500).json(response);
    }
    static async getAllUsers(req, res) {
        const lang = req.lang || 'en';
        const { includeDeleted } = req.query;
        const response = await user_repository_1.UserRepository.findAll(includeDeleted === 'true');
        if (response.status && response.message) {
            response.message = i18n_1.I18n.t('user_list_retrieved', lang);
        }
        res.status(response.code || 500).json(response);
    }
}
exports.UserController = UserController;

"use strict";
/**
 * Admin Promo Codes Controller
 *
 * Manage promotional codes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPromoController = void 0;
const i18n_1 = require("../../utils/i18n");
const pgdb_1 = __importDefault(require("../../config/pgdb"));
class AdminPromoController {
    /**
     * Create promo code
     * POST /v1/api/ticketing/admin/promo-codes
     */
    static async createPromoCode(req, res) {
        try {
            const lang = req.lang || 'en';
            const { code, discount_type, discount_value, max_uses, valid_from, valid_until, min_purchase_amount } = req.body;
            const adminId = req.userId;
            if (!code || !discount_type || !discount_value) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }
            const promoCode = await pgdb_1.default.one(`
                INSERT INTO promo_code (code, discount_type, discount_value, max_uses, valid_from, valid_until, min_purchase_amount, created_by, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                RETURNING *
            `, [code.toUpperCase(), discount_type, discount_value, max_uses || null, valid_from || null, valid_until || null, min_purchase_amount || 0, adminId]);
            res.status(201).json({
                status: true,
                message: i18n_1.I18n.t('promo_code_created', lang),
                body: promoCode,
                code: 201
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            if (error.code === '23505') {
                res.status(400).json({
                    status: false,
                    message: 'Promo code already exists',
                    code: 400
                });
                return;
            }
            console.error('Error in createPromoCode:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Get all promo codes
     * GET /v1/api/ticketing/admin/promo-codes
     */
    static async getAllPromoCodes(req, res) {
        try {
            const lang = req.lang || 'en';
            const { status, include_deleted = 'false' } = req.query;
            let query = `
                SELECT *
                FROM promo_code
                WHERE 1=1
            `;
            const params = [];
            if (include_deleted !== 'true') {
                query += ` AND is_deleted = FALSE`;
            }
            if (status === 'active') {
                query += ` AND is_active = TRUE AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)`;
            }
            else if (status === 'expired') {
                query += ` AND valid_until < CURRENT_TIMESTAMP`;
            }
            else if (status === 'inactive') {
                query += ` AND is_active = FALSE`;
            }
            query += ` ORDER BY created_at DESC`;
            const promoCodes = await pgdb_1.default.any(query, params);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('promo_codes_retrieved', lang),
                body: { promo_codes: promoCodes, total: promoCodes.length },
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getAllPromoCodes:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Update promo code
     * PUT /v1/api/ticketing/admin/promo-codes/:id
     */
    static async updatePromoCode(req, res) {
        try {
            const lang = req.lang || 'en';
            const promoId = parseInt(req.params.id);
            const { discount_type, discount_value, max_uses, valid_from, valid_until, min_purchase_amount, is_active } = req.body;
            const updatedPromo = await pgdb_1.default.one(`
                UPDATE promo_code
                SET
                    discount_type = COALESCE($2, discount_type),
                    discount_value = COALESCE($3, discount_value),
                    max_uses = COALESCE($4, max_uses),
                    valid_from = COALESCE($5, valid_from),
                    valid_until = COALESCE($6, valid_until),
                    min_purchase_amount = COALESCE($7, min_purchase_amount),
                    is_active = COALESCE($8, is_active),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `, [promoId, discount_type, discount_value, max_uses, valid_from, valid_until, min_purchase_amount, is_active]);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('promo_code_updated', lang),
                body: updatedPromo,
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in updatePromoCode:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Delete promo code
     * DELETE /v1/api/ticketing/admin/promo-codes/:id
     */
    static async deletePromoCode(req, res) {
        try {
            const lang = req.lang || 'en';
            const promoId = parseInt(req.params.id);
            const adminId = req.userId;
            const deletedPromo = await pgdb_1.default.one(`
                UPDATE promo_code
                SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2
                WHERE id = $1
                RETURNING *
            `, [promoId, adminId]);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('promo_code_deleted', lang),
                body: deletedPromo,
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in deletePromoCode:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    /**
     * Get promo code usage stats
     * GET /v1/api/ticketing/admin/promo-codes/stats
     */
    static async getPromoStats(req, res) {
        try {
            const lang = req.lang || 'en';
            const stats = await pgdb_1.default.one(`
                SELECT
                    COUNT(*)::int AS total_promo_codes,
                    COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active_codes,
                    COUNT(*) FILTER (WHERE valid_until < CURRENT_TIMESTAMP)::int AS expired_codes,
                    COALESCE(SUM(uses_count), 0)::int AS total_uses
                FROM promo_code
                WHERE is_deleted = FALSE
            `);
            res.status(200).json({
                status: true,
                message: i18n_1.I18n.t('stats_retrieved', lang),
                body: stats,
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getPromoStats:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
exports.AdminPromoController = AdminPromoController;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizerRepository = void 0;
const pgdb_1 = __importDefault(require("../../config/pgdb"));
const table_names_1 = require("../../utils/table_names");
class OrganizerRepository {
    static async findAll() {
        try {
            const result = await pgdb_1.default.any(`SELECT * FROM ${table_names_1.kEventOrganizer} ORDER BY created_at DESC`);
            return { status: true, message: "Organisateurs récupérés", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }
    static async findById(id) {
        try {
            const result = await pgdb_1.default.oneOrNone(`SELECT * FROM ${table_names_1.kEventOrganizer} WHERE id = $1`, [id]);
            if (!result)
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur trouvé", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }
    static async findByCustomerId(customerId) {
        try {
            const result = await pgdb_1.default.oneOrNone(`SELECT * FROM ${table_names_1.kEventOrganizer} WHERE customer_id = $1`, [customerId]);
            if (!result)
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur trouvé", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }
    static async create(data) {
        try {
            const result = await pgdb_1.default.one(`INSERT INTO ${table_names_1.kEventOrganizer} (customer_id, name, type, phone, email, logo, description)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, [data.customer_id, data.name, data.type ?? 'individual', data.phone, data.email, data.logo, data.description]);
            return { status: true, message: "Organisateur créé", body: result, code: 201 };
        }
        catch (error) {
            if (error.code === '23505') {
                return { status: false, message: "Ce client est déjà organisateur", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }
    static async update(id, data) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEventOrganizer} SET
                    name = COALESCE($1, name),
                    type = COALESCE($2, type),
                    phone = COALESCE($3, phone),
                    email = COALESCE($4, email),
                    logo = COALESCE($5, logo),
                    description = COALESCE($6, description)
                 WHERE id = $7 RETURNING *`, [data.name, data.type, data.phone, data.email, data.logo, data.description, id]);
            if (!result)
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur mis à jour", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }
    static async verify(id, verifiedBy) {
        try {
            const result = await pgdb_1.default.oneOrNone(`UPDATE ${table_names_1.kEventOrganizer} SET is_verified = TRUE, verified_at = NOW(), verified_by = $1
                 WHERE id = $2 RETURNING *`, [verifiedBy, id]);
            if (!result)
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur vérifié", body: result, code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la vérification", code: 500 };
        }
    }
    static async delete(id) {
        try {
            const result = await pgdb_1.default.result(`DELETE FROM ${table_names_1.kEventOrganizer} WHERE id = $1`, [id]);
            if (result.rowCount === 0)
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur supprimé", code: 200 };
        }
        catch (error) {
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }
}
exports.OrganizerRepository = OrganizerRepository;

import pgpDb from "../../config/pgdb";
import { OrganizerCreateDto, OrganizerUpdateDto } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";
import { kEventOrganizer } from "../../utils/table_names";

export class OrganizerRepository {

    static async findAll(): Promise<ResponseModel> {
        try {
            const result = await pgpDb.any(
                `SELECT * FROM ${kEventOrganizer} ORDER BY created_at DESC`
            );
            return { status: true, message: "Organisateurs récupérés", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `SELECT * FROM ${kEventOrganizer} WHERE id = $1`, [id]
            );
            if (!result) return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur trouvé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async findByCustomerId(customerId: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `SELECT * FROM ${kEventOrganizer} WHERE customer_id = $1`, [customerId]
            );
            if (!result) return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur trouvé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    static async create(data: OrganizerCreateDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.one(
                `INSERT INTO ${kEventOrganizer} (customer_id, name, type, phone, email, logo, description)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                [data.customer_id, data.name, data.type ?? 'individual', data.phone, data.email, data.logo, data.description]
            );
            return { status: true, message: "Organisateur créé", body: result, code: 201 };
        } catch (error: any) {
            if (error.code === '23505') {
                return { status: false, message: "Ce client est déjà organisateur", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création", code: 500 };
        }
    }

    static async update(id: number, data: OrganizerUpdateDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventOrganizer} SET
                    name = COALESCE($1, name),
                    type = COALESCE($2, type),
                    phone = COALESCE($3, phone),
                    email = COALESCE($4, email),
                    logo = COALESCE($5, logo),
                    description = COALESCE($6, description)
                 WHERE id = $7 RETURNING *`,
                [data.name, data.type, data.phone, data.email, data.logo, data.description, id]
            );
            if (!result) return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour", code: 500 };
        }
    }

    static async verify(id: number, verifiedBy: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventOrganizer} SET is_verified = TRUE, verified_at = NOW(), verified_by = $1
                 WHERE id = $2 RETURNING *`,
                [verifiedBy, id]
            );
            if (!result) return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur vérifié", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la vérification", code: 500 };
        }
    }

    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(`DELETE FROM ${kEventOrganizer} WHERE id = $1`, [id]);
            if (result.rowCount === 0) return { status: false, message: "Organisateur non trouvé", code: 404 };
            return { status: true, message: "Organisateur supprimé", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression", code: 500 };
        }
    }
}

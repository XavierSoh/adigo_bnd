import pgpDb from "../../config/pgdb";
import { EventOrganizer, EventOrganizerCreateDto, EventOrganizerUpdateDto } from "../models/event-organizer.model";
import ResponseModel from "../../models/response.model";
import { kEventOrganizer, kCustomer } from "../../utils/table_names";

export class EventOrganizerRepository {

    private static readonly BASE_SELECT = `
        o.*,
        json_build_object(
            'id', c.id,
            'first_name', c.first_name,
            'last_name', c.last_name,
            'email', c.email,
            'phone', c.phone,
            'profile_picture', c.profile_picture
        ) AS customer
    `;

    private static readonly BASE_JOINS = `
        FROM ${kEventOrganizer} o
        LEFT JOIN ${kCustomer} c ON o.customer_id = c.id
    `;

    // Create new event organizer
    static async create(organizer: EventOrganizerCreateDto, createdBy?: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.one(
                `INSERT INTO ${kEventOrganizer} (
                    customer_id, organization_name, organization_type,
                    rccm_number, tax_id, business_address,
                    business_phone, business_email, website,
                    description, logo, banner_image,
                    bank_name, bank_account_number, bank_account_name,
                    orange_money_number, orange_money_name,
                    mtn_mobile_money_number, mtn_mobile_money_name,
                    verification_status, id_card_front, id_card_back,
                    rccm_document, business_license,
                    total_events, total_tickets_sold, total_revenue,
                    average_rating, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
                RETURNING *`,
                [
                    organizer.customer_id,
                    organizer.organization_name,
                    organizer.organization_type ?? 'individual',
                    organizer.rccm_number,
                    organizer.tax_id,
                    organizer.business_address,
                    organizer.business_phone,
                    organizer.business_email,
                    organizer.website,
                    organizer.description,
                    organizer.logo,
                    organizer.banner_image,
                    organizer.bank_name,
                    organizer.bank_account_number,
                    organizer.bank_account_name,
                    organizer.orange_money_number,
                    organizer.orange_money_name,
                    organizer.mtn_mobile_money_number,
                    organizer.mtn_mobile_money_name,
                    'pending', // verification_status starts as pending
                    organizer.id_card_front,
                    organizer.id_card_back,
                    organizer.rccm_document,
                    organizer.business_license,
                    0, // total_events
                    0, // total_tickets_sold
                    0, // total_revenue
                    0, // average_rating
                    createdBy
                ]
            );

            // Also update the customer table to mark as organizer
            await pgpDb.none(
                `UPDATE ${kCustomer} SET is_organizer = TRUE WHERE id = $1`,
                [organizer.customer_id]
            );

            return { status: true, message: "Profil organisateur créé", body: result, code: 201 };
        } catch (error: any) {
            console.log(`Erreur création organisateur: ${JSON.stringify(error)}`);
            if (error.code === '23505') {
                return { status: false, message: "Ce client est déjà enregistré comme organisateur", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création du profil organisateur", code: 500 };
        }
    }

    // Find by customer ID
    static async findByCustomerId(customerId: number): Promise<ResponseModel> {
        try {
            const organizer = await pgpDb.oneOrNone(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE o.customer_id = $1 AND o.is_deleted = FALSE`,
                [customerId]
            );

            if (!organizer) {
                return { status: false, message: "Profil organisateur non trouvé", code: 404 };
            }

            return { status: true, message: "Profil organisateur trouvé", body: organizer, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche du profil organisateur", code: 500 };
        }
    }

    // Find by ID
    static async findById(id: number): Promise<ResponseModel> {
        try {
            const organizer = await pgpDb.oneOrNone(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE o.id = $1 AND o.is_deleted = FALSE`,
                [id]
            );

            if (!organizer) {
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            }

            return { status: true, message: "Organisateur trouvé", body: organizer, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche de l'organisateur", code: 500 };
        }
    }

    // Find all organizers
    static async findAll(includeDeleted: boolean = false): Promise<ResponseModel> {
        try {
            const whereClause = includeDeleted ? '' : 'WHERE o.is_deleted = FALSE';

            const organizers = await pgpDb.any(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                ${whereClause}
                ORDER BY o.created_at DESC`
            );

            return { status: true, message: "Liste des organisateurs récupérée", body: organizers, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des organisateurs", code: 500 };
        }
    }

    // Update organizer
    static async update(id: number, organizer: EventOrganizerUpdateDto): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventOrganizer} SET
                    organization_name = COALESCE($1, organization_name),
                    organization_type = COALESCE($2, organization_type),
                    rccm_number = COALESCE($3, rccm_number),
                    tax_id = COALESCE($4, tax_id),
                    business_address = COALESCE($5, business_address),
                    business_phone = COALESCE($6, business_phone),
                    business_email = COALESCE($7, business_email),
                    website = COALESCE($8, website),
                    description = COALESCE($9, description),
                    logo = COALESCE($10, logo),
                    banner_image = COALESCE($11, banner_image),
                    bank_name = COALESCE($12, bank_name),
                    bank_account_number = COALESCE($13, bank_account_number),
                    bank_account_name = COALESCE($14, bank_account_name),
                    orange_money_number = COALESCE($15, orange_money_number),
                    orange_money_name = COALESCE($16, orange_money_name),
                    mtn_mobile_money_number = COALESCE($17, mtn_mobile_money_number),
                    mtn_mobile_money_name = COALESCE($18, mtn_mobile_money_name),
                    updated_at = NOW()
                WHERE id = $19 AND is_deleted = FALSE
                RETURNING *`,
                [
                    organizer.organization_name,
                    organizer.organization_type,
                    organizer.rccm_number,
                    organizer.tax_id,
                    organizer.business_address,
                    organizer.business_phone,
                    organizer.business_email,
                    organizer.website,
                    organizer.description,
                    organizer.logo,
                    organizer.banner_image,
                    organizer.bank_name,
                    organizer.bank_account_number,
                    organizer.bank_account_name,
                    organizer.orange_money_number,
                    organizer.orange_money_name,
                    organizer.mtn_mobile_money_number,
                    organizer.mtn_mobile_money_name,
                    id
                ]
            );

            if (!result) {
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            }

            return { status: true, message: "Profil organisateur mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour du profil organisateur", code: 500 };
        }
    }

    // Update verification status
    static async updateVerificationStatus(
        id: number,
        status: 'pending' | 'verified' | 'rejected' | 'suspended',
        verifiedBy?: number,
        verificationNotes?: string
    ): Promise<ResponseModel> {
        try {
            const verifiedAt = status === 'verified' ? new Date() : null;

            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventOrganizer} SET
                    verification_status = $1,
                    verified_by = $2,
                    verified_at = $3,
                    verification_notes = $4,
                    updated_at = NOW()
                WHERE id = $5 AND is_deleted = FALSE
                RETURNING *`,
                [status, verifiedBy, verifiedAt, verificationNotes, id]
            );

            if (!result) {
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            }

            return { status: true, message: "Statut de vérification mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour du statut", code: 500 };
        }
    }

    // Search organizers
    static async search(filters: {
        searchTerm?: string;
        verificationStatus?: string;
        organizationType?: string;
    }): Promise<ResponseModel> {
        try {
            let query = `
                SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE o.is_deleted = FALSE
            `;

            const params: any[] = [];
            let paramIndex = 1;

            if (filters.searchTerm) {
                query += ` AND (
                    o.organization_name ILIKE $${paramIndex} OR
                    o.business_email ILIKE $${paramIndex} OR
                    c.first_name ILIKE $${paramIndex} OR
                    c.last_name ILIKE $${paramIndex}
                )`;
                params.push(`%${filters.searchTerm}%`);
                paramIndex++;
            }

            if (filters.verificationStatus) {
                query += ` AND o.verification_status = $${paramIndex}`;
                params.push(filters.verificationStatus);
                paramIndex++;
            }

            if (filters.organizationType) {
                query += ` AND o.organization_type = $${paramIndex}`;
                params.push(filters.organizationType);
                paramIndex++;
            }

            query += ' ORDER BY o.created_at DESC';

            const organizers = await pgpDb.any(query, params);

            return { status: true, message: "Recherche effectuée", body: organizers, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }

    // Get verified organizers
    static async getVerified(): Promise<ResponseModel> {
        try {
            const organizers = await pgpDb.any(
                `SELECT ${this.BASE_SELECT}
                ${this.BASE_JOINS}
                WHERE o.verification_status = 'verified' AND o.is_deleted = FALSE
                ORDER BY o.average_rating DESC, o.total_events DESC`
            );

            return { status: true, message: "Organisateurs vérifiés récupérés", body: organizers, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des organisateurs vérifiés", code: 500 };
        }
    }

    // Get statistics
    static async getStatistics(): Promise<ResponseModel> {
        try {
            const stats = await pgpDb.one(
                `SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified,
                    SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                    SUM(CASE WHEN verification_status = 'suspended' THEN 1 ELSE 0 END) as suspended,
                    SUM(total_events) as total_events,
                    SUM(total_tickets_sold) as total_tickets_sold,
                    SUM(total_revenue) as total_revenue
                FROM ${kEventOrganizer}
                WHERE is_deleted = FALSE`
            );

            return { status: true, message: "Statistiques récupérées", body: stats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques", code: 500 };
        }
    }

    // Soft delete organizer
    static async softDelete(id: number, deletedBy?: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `UPDATE ${kEventOrganizer} SET
                    is_deleted = TRUE,
                    deleted_at = NOW(),
                    deleted_by = $2,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = FALSE`,
                [id, deletedBy]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Organisateur non trouvé ou déjà supprimé", code: 404 };
            }

            return { status: true, message: "Profil organisateur supprimé", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression du profil organisateur", code: 500 };
        }
    }

    // Restore soft deleted organizer
    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kEventOrganizer} SET
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = TRUE
                RETURNING *`,
                [id]
            );

            if (!result) {
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            }

            return { status: true, message: "Profil organisateur restauré", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la restauration du profil organisateur", code: 500 };
        }
    }

    // Hard delete organizer
    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `DELETE FROM ${kEventOrganizer} WHERE id = $1`,
                [id]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Organisateur non trouvé", code: 404 };
            }

            return { status: true, message: "Organisateur supprimé définitivement", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression de l'organisateur", code: 500 };
        }
    }
}

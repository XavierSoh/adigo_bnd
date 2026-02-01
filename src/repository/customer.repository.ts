
import pgpDb from "../config/pgdb";
import { Customer } from "../models/customer.model";
import ResponseModel from "../models/response.model";
import { kCustomer } from "../utils/table_names";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export class CustomerRepository {
    // Stockage temporaire des codes de reset (à remplacer par une vraie base/cache en prod)
    private static resetCodes: { [email: string]: string } = {};

    static async setResetCode(email: string, code: string): Promise<void> {
        this.resetCodes[email] = code;
    }
    static async verifyResetCode(email: string, code: string): Promise<boolean> {
        return this.resetCodes[email] === code;
    }
    static async updatePasswordByEmail(email: string, newPassword: string): Promise<ResponseModel> {
        try {
            const hashed = await bcrypt.hash(newPassword, 10);
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kCustomer} SET password = $1 WHERE email = $2 AND is_deleted = FALSE RETURNING id, email`,
                [hashed, email]
            );
            if (!result) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }
            // Suppression du code de reset après succès
            delete this.resetCodes[email];
            return { status: true, message: "Mot de passe réinitialisé", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour du mot de passe", code: 500 };
        }
    }
    // Create new customer
    static async create(customer: Customer): Promise<ResponseModel> {
        try {
            // Hash password
            const hashedPassword = await bcrypt.hash(customer.password, 10);

            const result = await pgpDb.one(
                `INSERT INTO ${kCustomer} (
                    first_name, last_name, email, phone, password,
                    date_of_birth, gender, address, city,
                    id_card_number, id_card_type, preferred_language,
                    notification_enabled, preferred_seat_type,
                    loyalty_points, customer_tier, account_status,
                    email_verified, phone_verified
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                RETURNING id, first_name, last_name, email, phone, date_of_birth, gender,
                          address, city, id_card_number, id_card_type, preferred_language,
                          notification_enabled, preferred_seat_type, loyalty_points,
                          customer_tier, account_status, email_verified, phone_verified, created_at`,
                [
                    customer.first_name,
                    customer.last_name,
                    customer.email,
                    customer.phone,
                    hashedPassword,
                    customer.date_of_birth,
                    customer.gender,
                    customer.address,
                    customer.city,
                    customer.id_card_number,
                    customer.id_card_type,
                    customer.preferred_language ?? 'fr',
                    customer.notification_enabled ?? true,
                    customer.preferred_seat_type,
                    customer.loyalty_points ?? 0,
                    customer.customer_tier ?? 'regular',
                    customer.account_status ?? 'active',
                    customer.email_verified ?? false,
                    customer.phone_verified ?? false
                ]
            );

            // Generate JWT token for auto-login after registration
            const token = jwt.sign(
                { customerId: result.id, email: result.email },
                process.env.JWT_SECRET!,
                { expiresIn: '7d' }
            );

            return {
                status: true,
                message: "Client créé avec succès",
                body: { customer: result, token },
                code: 201
            };
        } catch (error: any) {
            console.log(`error ....  ${error}`)
            if (error.code === '23505') { // Unique violation
                return { status: false, message: "ERREUR_INCONNUE | UNKNOW_ERROR", code: 409 };
            }
            return { status: false, message: "ERREUR_INCONNUE | UNKNOW_ERROR", code: 500 };
        }
    }

    // Find by ID
    static async findById(id: number): Promise<ResponseModel> {
        try {
            console.log(`🔍 [CustomerRepository] findById called with ID: ${id}`);
            const customer = await pgpDb.oneOrNone(
                `SELECT id, first_name, last_name, email, phone, date_of_birth, gender,
                        address, city, id_card_number, id_card_type, preferred_language,
                        notification_enabled, preferred_seat_type, loyalty_points,
                        customer_tier, account_status, email_verified, phone_verified,
                        profile_picture, wallet_balance, fcm_token,
                        created_at, updated_at, last_login
                FROM ${kCustomer} WHERE id = $1 AND is_deleted = FALSE`,
                [id]
            );

            console.log(`📊 [CustomerRepository] Query result:`, customer ? 'Found customer' : 'No customer found');

            if (!customer) {
                console.log(`❌ [CustomerRepository] Customer not found with ID: ${id}`);
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            console.log(`✅ [CustomerRepository] Customer found:`, customer.id, customer.email);
            return { status: true, message: "Client trouvé", body: customer, code: 200 };
        } catch (error) {
            console.error(`❌ [CustomerRepository] Error in findById:`, error);
            return { status: false, message: "Erreur lors de la recherche du client", code: 500 };
        }
    }

    // Find by email
    static async findByEmail(email: string): Promise<ResponseModel> {
        try {
            const customer = await pgpDb.oneOrNone(
                `SELECT * FROM ${kCustomer} WHERE email = $1 AND is_deleted = FALSE`,
                [email]
            );

            if (!customer) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            return { status: true, message: "Client trouvé", body: customer, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche du client", code: 500 };
        }
    }

    // Find by phone
    static async findByPhone(phone: string): Promise<ResponseModel> {
        try {
            const customer = await pgpDb.oneOrNone(
                `SELECT * FROM ${kCustomer} WHERE phone = $1 AND is_deleted = FALSE`,
                [phone]
            );

            if (!customer) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            return { status: true, message: "Client trouvé", body: customer, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche du client", code: 500 };
        }
    }

    // Update customer
    static async update(id: number, customer: Partial<Customer>): Promise<ResponseModel> {
        try {
            console.log('📝 [CustomerRepository] Updating customer ID:', id);
            console.log('📝 [CustomerRepository] Data before processing:', customer);

            // Hash password if provided
            if (customer.password) {
                customer.password = await bcrypt.hash(customer.password, 10);
            }

            console.log('📝 [CustomerRepository] Executing UPDATE query...');
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kCustomer} SET
                    first_name = COALESCE($1, first_name),
                    last_name = COALESCE($2, last_name),
                    email = COALESCE($3, email),
                    phone = COALESCE($4, phone),
                    password = COALESCE($5, password),
                    date_of_birth = COALESCE($6, date_of_birth),
                    gender = COALESCE($7, gender),
                    address = COALESCE($8, address),
                    city = COALESCE($9, city),
                    id_card_number = COALESCE($10, id_card_number),
                    id_card_type = COALESCE($11, id_card_type),
                    preferred_language = COALESCE($12, preferred_language),
                    notification_enabled = COALESCE($13, notification_enabled),
                    preferred_seat_type = COALESCE($14, preferred_seat_type),
                    account_status = COALESCE($15, account_status),
                    profile_picture = COALESCE($16, profile_picture),
                    default_orange_money_number = COALESCE($17, default_orange_money_number),
                    default_mtn_mobile_money_number = COALESCE($18, default_mtn_mobile_money_number),
                    updated_at = NOW()
                WHERE id = $19 AND is_deleted = FALSE
                RETURNING id, first_name, last_name, email, phone, date_of_birth, gender,
                          address, city, id_card_number, id_card_type, preferred_language,
                          notification_enabled, preferred_seat_type, loyalty_points,
                          customer_tier, account_status, email_verified, phone_verified,
                          profile_picture, wallet_balance, default_orange_money_number,
                          default_mtn_mobile_money_number`,
                [
                    customer.first_name,
                    customer.last_name,
                    customer.email,
                    customer.phone,
                    customer.password,
                    customer.date_of_birth,
                    customer.gender,
                    customer.address,
                    customer.city,
                    customer.id_card_number,
                    customer.id_card_type,
                    customer.preferred_language,
                    customer.notification_enabled,
                    customer.preferred_seat_type,
                    customer.account_status,
                    customer.profile_picture,
                    customer.default_orange_money_number,
                    customer.default_mtn_mobile_money_number,
                    id
                ]
            );

            console.log('📝 [CustomerRepository] Query result:', result);

            if (!result) {
                console.log('❌ [CustomerRepository] Customer not found with ID:', id);
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            console.log('✅ [CustomerRepository] Customer updated successfully');
            return { status: true, message: "Client mis à jour", body: result, code: 200 };
        } catch (error) {
            console.error('❌ [CustomerRepository] Error updating customer:', error);
            console.error('❌ [CustomerRepository] Error details:', error instanceof Error ? error.message : error);
            console.error('❌ [CustomerRepository] Stack trace:', error instanceof Error ? error.stack : 'N/A');
            return { status: false, message: "Erreur lors de la mise à jour du client", code: 500 };
        }
    }

    // Soft delete
    static async softDelete(id: number, deletedBy?: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `UPDATE ${kCustomer} SET
                    is_deleted = TRUE,
                    deleted_at = NOW(),
                    deleted_by = $2,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = FALSE`,
                [id, deletedBy]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Client non trouvé ou déjà supprimé", code: 404 };
            }

            return { status: true, message: "Client supprimé", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression du client", code: 500 };
        }
    }

    // Restore
    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kCustomer} SET
                    is_deleted = FALSE,
                    deleted_at = NULL,
                    deleted_by = NULL,
                    updated_at = NOW()
                WHERE id = $1 AND is_deleted = TRUE
                RETURNING id, first_name, last_name, email, phone`,
                [id]
            );

            if (!result) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            return { status: true, message: "Client restauré", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la restauration du client", code: 500 };
        }
    }

    // Hard delete
    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.result(
                `DELETE FROM ${kCustomer} WHERE id = $1`,
                [id]
            );

            if (result.rowCount === 0) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            return { status: true, message: "Client supprimé définitivement", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la suppression du client", code: 500 };
        }
    }

    // Find all customers
    static async findAll(includeDeleted: boolean = false): Promise<ResponseModel> {
        try {
            const whereClause = includeDeleted ? '' : 'WHERE is_deleted = FALSE';

            const customers = await pgpDb.any(
                `SELECT *
                FROM ${kCustomer} ${whereClause}
                ORDER BY created_at DESC`
            );
            return { status: true, message: "Liste des clients récupérée", body: customers, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des clients", code: 500 };
        }
    }

    // Advanced search with filters
static async search(filters: {
    searchTerm?: string;
    accountStatus?: string;
    customerTier?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    minLoyaltyPoints?: number;
    city?: string;
}): Promise<ResponseModel> {
    try { 
        let query = `
            SELECT *
            FROM ${kCustomer}
            WHERE is_deleted = FALSE
        `;

        const params: any[] = [];
        let paramIndex = 1;

        // Search term (name, email, or phone)
        if (filters.searchTerm && filters.searchTerm.trim() !== '') {
            query += ` AND (
                first_name ILIKE $${paramIndex} OR 
                last_name ILIKE $${paramIndex} OR 
                email ILIKE $${paramIndex} OR 
                phone ILIKE $${paramIndex}
            )`;
            params.push(`%${filters.searchTerm}%`);
            paramIndex++;
        }

        // Account status filter
        if (filters.accountStatus) {
            query += ` AND account_status = $${paramIndex}`;
            params.push(filters.accountStatus);
            paramIndex++;
        }

        // Customer tier filter
        if (filters.customerTier) {
            query += ` AND customer_tier = $${paramIndex}`;
            params.push(filters.customerTier);
            paramIndex++;
        }

        // Email verified filter
        if (filters.emailVerified !== undefined) {
            query += ` AND email_verified = $${paramIndex}`;
            params.push(filters.emailVerified);
            paramIndex++;
        }

        // Phone verified filter
        if (filters.phoneVerified !== undefined) {
            query += ` AND phone_verified = $${paramIndex}`;
            params.push(filters.phoneVerified);
            paramIndex++;
        }

        // Minimum loyalty points
        if (filters.minLoyaltyPoints !== undefined) {
            query += ` AND loyalty_points >= $${paramIndex}`;
            params.push(filters.minLoyaltyPoints);
            paramIndex++;
        }

        // City filter
        if (filters.city && filters.city.trim() !== '') {
            query += ` AND city ILIKE $${paramIndex}`;
            params.push(`%${filters.city}%`);
            paramIndex++;
        }
        query += ` ORDER BY created_at DESC LIMIT 50`;
        const customers = await pgpDb.any(query, params);
        return { 
            status: true, 
            message: "Recherche effectuée", 
            body: customers, 
            code: 200 
        };
    } catch (error) {
        console.error("Search Error:", error);
        return { 
            status: false, 
            message: "Erreur lors de la recherche", 
            code: 500 
        };
    }
}

    // Login/Authentication
    static async authenticate(emailOrPhone: string, password: string): Promise<ResponseModel> {
        try {
            const customer = await pgpDb.oneOrNone(
                `SELECT * FROM ${kCustomer}
                WHERE (email = $1 OR phone = $1) AND is_deleted = FALSE`,
                [emailOrPhone]
            );

            if (!customer) {
                return { status: false, message: "Identifiants incorrects", code: 401 };
            }

            if (customer.account_status !== 'active') {
                return { status: false, message: `Compte ${customer.account_status}`, code: 403 };
            }

            const isPasswordValid = await bcrypt.compare(password, customer.password);

            if (!isPasswordValid) {
                return { status: false, message: "Identifiants incorrects", code: 401 };
            }

            // Update last login
            await pgpDb.none(
                `UPDATE ${kCustomer} SET last_login = NOW() WHERE id = $1`,
                [customer.id]
            );

            // Remove password from response
            delete customer.password;

            // Generate JWT token
            const token = jwt.sign(
                { customerId: customer.id, email: customer.email },
                process.env.JWT_SECRET!,
                { expiresIn: '7d' }
            );

            return {
                status: true,
                message: "Connexion réussie",
                body: { customer, token },
                code: 200
            };
        } catch (error) {
            return { status: false, message: "Erreur lors de l'authentification", code: 500 };
        }
    }

    // Update loyalty points
    static async updateLoyaltyPoints(id: number, points: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kCustomer} SET
                    loyalty_points = loyalty_points + $1,
                    updated_at = NOW()
                WHERE id = $2 AND is_deleted = FALSE
                RETURNING id, first_name, last_name, loyalty_points, customer_tier`,
                [points, id]
            );

            if (!result) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            // Check for tier upgrade
            await this.checkAndUpdateTier(id, result.loyalty_points);

            return { status: true, message: "Points mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour des points", code: 500 };
        }
    }

    // Check and update customer tier based on loyalty points
    static async checkAndUpdateTier(id: number, points: number): Promise<void> {
        let tier = 'regular';
        if (points >= 10000) tier = 'platinum';
        else if (points >= 5000) tier = 'gold';
        else if (points >= 1000) tier = 'silver';

        await pgpDb.none(
            `UPDATE ${kCustomer} SET customer_tier = $1 WHERE id = $2`,
            [tier, id]
        );
    }

    // Verify email
    static async verifyEmail(id: number): Promise<ResponseModel> {
        try {
            await pgpDb.none(
                `UPDATE ${kCustomer} SET email_verified = TRUE, updated_at = NOW() WHERE id = $1`,
                [id]
            );

            return { status: true, message: "Email vérifié", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la vérification de l'email", code: 500 };
        }
    }

    // Verify phone
    static async verifyPhone(id: number): Promise<ResponseModel> {
        try {
            await pgpDb.none(
                `UPDATE ${kCustomer} SET phone_verified = TRUE, updated_at = NOW() WHERE id = $1`,
                [id]
            );

            return { status: true, message: "Téléphone vérifié", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la vérification du téléphone", code: 500 };
        }
    }

    // Get statistics
    static async getStatistics(): Promise<ResponseModel> {
        try {
            const stats = await pgpDb.one(
                `SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN account_status = 'active' THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN account_status = 'suspended' THEN 1 ELSE 0 END) as suspended,
                    SUM(CASE WHEN account_status = 'blocked' THEN 1 ELSE 0 END) as blocked,
                    SUM(CASE WHEN customer_tier = 'platinum' THEN 1 ELSE 0 END) as platinum,
                    SUM(CASE WHEN customer_tier = 'gold' THEN 1 ELSE 0 END) as gold,
                    SUM(CASE WHEN customer_tier = 'silver' THEN 1 ELSE 0 END) as silver,
                    SUM(CASE WHEN email_verified = TRUE THEN 1 ELSE 0 END) as email_verified,
                    SUM(CASE WHEN phone_verified = TRUE THEN 1 ELSE 0 END) as phone_verified
                FROM ${kCustomer}
                WHERE is_deleted = FALSE`
            );

            return { status: true, message: "Statistiques récupérées", body: stats, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération des statistiques", code: 500 };
        }
    }


    // Bulk create customers
    static async bulkCreate(customers: Customer[]): Promise<ResponseModel> {
        try {
            if (!customers || customers.length === 0) {
                return { status: false, message: "Aucun client à créer", code: 400 };
            }

            // Hash passwords in parallel
            const hashedCustomers = await Promise.all(
                customers.map(async (customer) => ({
                    ...customer,
                    password: await bcrypt.hash(customer.password, 10),
                    preferred_language: customer.preferred_language ?? 'fr',
                    notification_enabled: customer.notification_enabled ?? true,
                    loyalty_points: customer.loyalty_points ?? 0,
                    customer_tier: customer.customer_tier ?? 'regular',
                    account_status: customer.account_status ?? 'active',
                    email_verified: customer.email_verified ?? false,
                    phone_verified: customer.phone_verified ?? false
                }))
            );

            // Prepare columns and values
            const columns = [
                "first_name", "last_name", "email", "phone", "password",
                "date_of_birth", "gender", "address", "city",
                "id_card_number", "id_card_type", "preferred_language",
                "notification_enabled", "preferred_seat_type",
                "loyalty_points", "customer_tier", "account_status",
                "email_verified", "phone_verified"
            ];

            const values = hashedCustomers.map(c => columns.map(col => (c as any)[col]));

            // Build query
            const valuePlaceholders = values.map(
                (_, i) => `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(", ")})`
            ).join(", ");

            const query = `
                INSERT INTO ${kCustomer} (${columns.join(", ")})
                VALUES ${valuePlaceholders}
                RETURNING id, first_name, last_name, email, phone, date_of_birth, gender, address, city, created_at
            `;

            const flatValues = values.flat();

            const result = await pgpDb.any(query, flatValues);

            return { status: true, message: "Clients créés avec succès", body: result, code: 201 };
        } catch (error: any) {
            if (error.code === '23505') {
                return { status: false, message: "Certains emails ou téléphones sont déjà utilisés", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création des clients", code: 500 };
        }
    }

    // Update wallet balance
    static async updateWalletBalance(customerId: number, amount: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `UPDATE ${kCustomer}
                SET wallet_balance = COALESCE(wallet_balance, 0) + $1,
                    updated_at = NOW()
                WHERE id = $2 AND is_deleted = FALSE
                RETURNING id, wallet_balance`,
                [amount, customerId]
            );

            if (!result) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            return { status: true, message: "Solde du portefeuille mis à jour", body: result, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour du solde", code: 500 };
        }
    }

    // Get wallet balance
    static async getWalletBalance(customerId: number): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(
                `SELECT id, wallet_balance FROM ${kCustomer} WHERE id = $1 AND is_deleted = FALSE`,
                [customerId]
            );

            if (!result) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            return { status: true, message: "Solde récupéré", body: { balance: result.wallet_balance || 0 }, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération du solde", code: 500 };
        }
    }

}

// ============================================
// CUSTOMER CONTROLLER - Multilingual Support
// ============================================
import { Request, Response } from "express";
import { CustomerRepository } from "../repository/customer.repository";
import { BookingRepository } from "../repository/booking.repository";
import { Customer } from "../models/customer.model";
import { I18n } from "../utils/i18n";

export class CustomerController {
    // Create customer (Registration)
    static async create(req: Request, res: Response): Promise<any> {
        try {
            const lang = req.lang || 'en';
            const customer: Customer = req.body;

            console.log(`INFOS =====>>>>>>>>>>>> ${JSON.stringify(customer)}`)
            // Validate required fields
            if (!customer.first_name) {
                return res.status(400).json({
                    status: false,
                    message: I18n.t('first_name_required', lang),
                    code: 400
                });
            }

            else if (!customer.last_name) {
              return   res.status(400).json({
                    status: false,
                    message: I18n.t('last_name_required', lang),
                    code: 400
                });

            }

            else if (!(customer.email || customer.phone)) {
             return    res.status(400).json({
                    status: false,
                    message: I18n.t('email_or_phone_required', lang),
                    code: 400
                });

            }


            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(customer.email)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_email', lang),
                    code: 400
                });
                return;
            }

            const result = await CustomerRepository.create(customer);

            if (result.status && result.message) {
                result.message = I18n.t('customer_created', lang);
            }

         return    res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get by ID
    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt((req.params as { id: string }).id);

            console.log(`🔍 [CustomerController] getById called with ID: ${id}`);

            if (isNaN(id)) {
                console.log(`❌ [CustomerController] Invalid ID: ${req.params.id}`);
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            console.log(`📞 [CustomerController] Calling CustomerRepository.findById(${id})`);
            const result = await CustomerRepository.findById(id);
            console.log(`📥 [CustomerController] Result from repository:`, JSON.stringify(result));

            if (!result.status) {
                result.message = I18n.t('customer_not_found', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error(`❌ [CustomerController] Error in getById:`, error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get all customers
    static async getAll(req: Request, res: Response): Promise<void> {
        try {
            const { include_deleted } = req.query;

            const result = await CustomerRepository.findAll(include_deleted === 'true');
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Update customer
    static async update(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt((req.params as { id: string }).id);
            const customer: Partial<Customer> = req.body;

            console.log('📝 [CustomerController] Updating customer ID:', id);
            console.log('📝 [CustomerController] Update data:', customer);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }

            const result = await CustomerRepository.update(id, customer);
            console.log('📝 [CustomerController] Update result:', result);
            res.status(result.code).json(result);
        } catch (error) {
            console.error('❌ [CustomerController] Error updating customer:', error);
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Soft delete
    static async softDelete(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt((req.params as { id: string }).id);
            const { deleted_by } = req.body;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }

            const result = await CustomerRepository.softDelete(id, deleted_by);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Restore
    static async restore(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt((req.params as { id: string }).id);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }

            const result = await CustomerRepository.restore(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Hard delete
    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt((req.params as { id: string }).id);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }

            const result = await CustomerRepository.delete(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Search customers
    // Search customers with filters
    static async search(req: Request, res: Response): Promise<void> {
        try {
            const {
                q,
                account_status,
                customer_tier,
                email_verified,
                phone_verified,
                min_loyalty_points,
                city
            } = req.query;

            const filters: any = {};

            if (q && typeof q === 'string') {
                filters.searchTerm = q;
            }

            if (account_status && typeof account_status === 'string') {
                filters.accountStatus = account_status;
            }

            if (customer_tier && typeof customer_tier === 'string') {
                filters.customerTier = customer_tier;
            }

            if (email_verified !== undefined) {
                filters.emailVerified = email_verified === 'true';
            }

            if (phone_verified !== undefined) {
                filters.phoneVerified = phone_verified === 'true';
            }

            if (min_loyalty_points) {
                filters.minLoyaltyPoints = parseInt(min_loyalty_points as string);
            }

            if (city && typeof city === 'string') {
                filters.city = city;
            }

            const result = await CustomerRepository.search(filters);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Login
    static async login(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { email_or_phone, password } = req.body;

            if (!email_or_phone || !password) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('email_phone_password_required', lang),
                    code: 400
                });
                return;
            }

            const result = await CustomerRepository.authenticate(email_or_phone, password);

            // Traduire le message de réponse
            if (result.status) {
                result.message = I18n.t('customer_login_success', lang);
            } else {
                result.message = I18n.t('customer_login_failed', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Update loyalty points
    static async updateLoyaltyPoints(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt((req.params as { id: string }).id);
            const { points } = req.body;

            if (isNaN(id) || points === undefined) {
                res.status(400).json({
                    status: false,
                    message: "ID et points requis",
                    code: 400
                });
                return;
            }

            const result = await CustomerRepository.updateLoyaltyPoints(id, points);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Verify email
    static async verifyEmail(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt((req.params as { id: string }).id);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }

            const result = await CustomerRepository.verifyEmail(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Verify phone
    static async verifyPhone(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt((req.params as { id: string }).id);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: "ID invalide",
                    code: 400
                });
                return;
            }

            const result = await CustomerRepository.verifyPhone(id);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Get statistics
    static async getStatistics(req: Request, res: Response): Promise<void> {
        try {
            const result = await CustomerRepository.getStatistics();
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }


    // Bulk create customers
    static async bulkCreate(req: Request, res: Response): Promise<void> {
        try {
            const customers: Customer[] = req.body;

            if (!Array.isArray(customers) || customers.length === 0) {
                res.status(400).json({
                    status: false,
                    message: "La liste des clients est requise",
                    code: 400
                });
                return;
            }

            // Optionally validate each customer object
            for (const customer of customers) {
                if (!customer.first_name || !customer.last_name || !customer.email || !customer.phone || !customer.password) {
                    res.status(400).json({
                        status: false,
                        message: "Chaque client doit avoir prénom, nom, email, téléphone et mot de passe",
                        code: 400
                    });
                    return;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(customer.email)) {
                    res.status(400).json({
                        status: false,
                        message: `Format d'email invalide pour ${customer.email}`,
                        code: 400
                    });
                    return;
                }
            }

            const result = await CustomerRepository.bulkCreate(customers);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }


    // Bulk create 15 sample customers with realistic data for testing
    static async bulkCreateSample(req: Request, res: Response): Promise<void> {
        try {
            const sampleCustomers: Customer[] = [
                {
                    first_name: "Alice",
                    last_name: "Martin",
                    email: "alice.martin@example.com",
                    phone: "0612345678",
                    password: "AlicePass123",
                    account_status: "active",
                    customer_tier: "gold",
                    email_verified: true,
                    phone_verified: true,
                    loyalty_points: 120,
                    city: "Paris",

                },
                {
                    first_name: "Bob",
                    last_name: "Durand",
                    email: "bob.durand@example.com",
                    phone: "0623456789",
                    password: "BobPass123",
                    account_status: "active",
                    customer_tier: "silver",
                    email_verified: true,
                    phone_verified: false,
                    loyalty_points: 80,
                    city: "Lyon"
                },
                {
                    first_name: "Caroline",
                    last_name: "Lefevre",
                    email: "caroline.lefevre@example.com",
                    phone: "0634567890",
                    password: "CarolinePass123",
                    account_status: "suspended",
                    customer_tier: "regular",
                    email_verified: false,
                    phone_verified: false,
                    loyalty_points: 30,
                    city: "Marseille"
                },
                {
                    first_name: "David",
                    last_name: "Bernard",
                    email: "david.bernard@example.com",
                    phone: "0645678901",
                    password: "DavidPass123",
                    account_status: "active",
                    customer_tier: "gold",
                    email_verified: true,
                    phone_verified: true,
                    loyalty_points: 150,
                    city: "Toulouse"
                },
                {
                    first_name: "Emma",
                    last_name: "Dubois",
                    email: "emma.dubois@example.com",
                    phone: "0656789012",
                    password: "EmmaPass123",
                    account_status: "active",
                    customer_tier: "silver",
                    email_verified: true,
                    phone_verified: false,
                    loyalty_points: 95,
                    city: "Nice"
                },
                {
                    first_name: "François",
                    last_name: "Moreau",
                    email: "francois.moreau@example.com",
                    phone: "0667890123",
                    password: "FrancoisPass123",
                    account_status: "active",
                    customer_tier: "regular",
                    email_verified: false,
                    phone_verified: false,
                    loyalty_points: 20,
                    city: "Nantes"
                },
                {
                    first_name: "Gabrielle",
                    last_name: "Simon",
                    email: "gabrielle.simon@example.com",
                    phone: "0678901234",
                    password: "GabriellePass123",
                    account_status: "active",
                    customer_tier: "gold",
                    email_verified: true,
                    phone_verified: true,
                    loyalty_points: 200,
                    city: "Strasbourg"
                },
                {
                    first_name: "Hugo",
                    last_name: "Laurent",
                    email: "hugo.laurent@example.com",
                    phone: "0689012345",
                    password: "HugoPass123",
                    account_status: "active",
                    customer_tier: "silver",
                    email_verified: true,
                    phone_verified: false,
                    loyalty_points: 70,
                    city: "Montpellier"
                },
                {
                    first_name: "Isabelle",
                    last_name: "Roux",
                    email: "isabelle.roux@example.com",
                    phone: "0690123456",
                    password: "IsabellePass123",
                    account_status: "active",
                    customer_tier: "regular",
                    email_verified: false,
                    phone_verified: false,
                    loyalty_points: 10,
                    city: "Bordeaux"
                },
                {
                    first_name: "Julien",
                    last_name: "Blanc",
                    email: "julien.blanc@example.com",
                    phone: "0611122233",
                    password: "JulienPass123",
                    account_status: "active",
                    customer_tier: "gold",
                    email_verified: true,
                    phone_verified: true,
                    loyalty_points: 180,
                    city: "Lille"
                },
                {
                    first_name: "Karine",
                    last_name: "Guerin",
                    email: "karine.guerin@example.com",
                    phone: "0622233344",
                    password: "KarinePass123",
                    account_status: "active",
                    customer_tier: "silver",
                    email_verified: true,
                    phone_verified: false,
                    loyalty_points: 60,
                    city: "Rennes"
                },
                {
                    first_name: "Louis",
                    last_name: "Muller",
                    email: "louis.muller@example.com",
                    phone: "0633344455",
                    password: "LouisPass123",
                    account_status: "active",
                    customer_tier: "regular",
                    email_verified: false,
                    phone_verified: false,
                    loyalty_points: 5,
                    city: "Reims"
                },
                {
                    first_name: "Marie",
                    last_name: "Petit",
                    email: "marie.petit@example.com",
                    phone: "0644455566",
                    password: "MariePass123",
                    account_status: "active",
                    customer_tier: "gold",
                    email_verified: true,
                    phone_verified: true,
                    loyalty_points: 220,
                    city: "Le Havre"
                },
                {
                    first_name: "Nicolas",
                    last_name: "Faure",
                    email: "nicolas.faure@example.com",
                    phone: "0655566677",
                    password: "NicolasPass123",
                    account_status: "active",
                    customer_tier: "silver",
                    email_verified: true,
                    phone_verified: false,
                    loyalty_points: 85,
                    city: "Saint-Étienne"
                },
                {
                    first_name: "Océane",
                    last_name: "Chevalier",
                    email: "oceane.chevalier@example.com",
                    phone: "0666677788",
                    password: "OceanePass123",
                    account_status: "active",
                    customer_tier: "regular",
                    email_verified: false,
                    phone_verified: false,
                    loyalty_points: 0,
                    city: "Toulon"
                }
            ];

            const result = await CustomerRepository.bulkCreate(sampleCustomers);
            res.status(result.code).json(result);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Erreur serveur",
                code: 500
            });
        }
    }

    // Update profile picture
    static async updateProfilePicture(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt((req.params as { id: string }).id);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            if (!req.file) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('no_file_uploaded', lang) || 'No file uploaded',
                    code: 400
                });
                return;
            }

            // Generate URL path for the uploaded file
            const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;

            // Update customer with new profile picture URL
            const result = await CustomerRepository.update(id, {
                profile_picture: profilePictureUrl
            });

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Update FCM token for push notifications
    static async updateFcmToken(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt((req.params as { id: string }).id);
            const { fcm_token } = req.body;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            if (!fcm_token) {
                res.status(400).json({
                    status: false,
                    message: 'FCM token is required',
                    code: 400
                });
                return;
            }

            // Update customer with FCM token
            const result = await CustomerRepository.update(id, {
                fcm_token: fcm_token
            } as any);

            if (result.status) {
                res.status(200).json({
                    status: true,
                    message: 'FCM token updated successfully',
                    body: result.body,
                    code: 200
                });
            } else {
                res.status(result.code).json(result);
            }
        } catch (error) {
            const lang = req.lang || 'en';
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Remove FCM token (on logout or token invalidation)
    static async removeFcmToken(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt((req.params as { id: string }).id);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            // Remove FCM token by setting it to null
            const result = await CustomerRepository.update(id, {
                fcm_token: null
            } as any);

            if (result.status) {
                res.status(200).json({
                    status: true,
                    message: 'FCM token removed successfully',
                    code: 200
                });
            } else {
                res.status(result.code).json(result);
            }
        } catch (error) {
            const lang = req.lang || 'en';
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get customer bookings
    static async getCustomerBookings(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt((req.params as { id: string }).id);

            console.log(`📖 [CustomerController] Getting bookings for customer ID: ${id}`);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await BookingRepository.findByUser(id);

            console.log(`📊 [CustomerController] Found ${Array.isArray(result.body) ? result.body.length : 0} bookings for customer ${id}`);

            if (result.status && Array.isArray(result.body) && result.body.length > 0) {
                console.log(`💰 [CustomerController] First booking total_price: ${result.body[0].total_price}`);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('❌ [CustomerController] Error getting customer bookings:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
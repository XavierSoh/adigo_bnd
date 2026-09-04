
// Migrated to Prisma's native model API (prisma.customer.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
import { Prisma } from "@prisma/client";
import prismaDb from "../config/prismaClient";
import { Customer } from "../models/customer.model";
import ResponseModel from "../models/response.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { requireEnv } from "../utils/env";
import { sendEmail } from "../services/email.service";
import { welcomeEmail, passwordResetEmail, passwordChangedEmail } from "../emails/templates";
import { I18n, Language } from "../utils/i18n";

// Field sets kept identical to the two different RETURNING/SELECT column
// lists the original raw SQL used (findById's list and update's list are
// NOT the same set — findById includes fcm_token/timestamps but not the
// payment-number defaults, update is the reverse) — preserved exactly
// rather than unified, to not change either endpoint's response shape.
const findByIdSelect = {
    id: true, first_name: true, last_name: true, email: true, phone: true,
    date_of_birth: true, gender: true, address: true, city: true,
    id_card_number: true, id_card_type: true, preferred_language: true,
    notification_enabled: true, reminder_minutes_before: true, preferred_seat_type: true, loyalty_points: true,
    customer_tier: true, account_status: true, email_verified: true, phone_verified: true,
    profile_picture: true, wallet_balance: true, fcm_token: true,
    created_at: true, updated_at: true, last_login: true,
} satisfies Prisma.customerSelect;

const updateReturnSelect = {
    id: true, first_name: true, last_name: true, email: true, phone: true,
    date_of_birth: true, gender: true, address: true, city: true,
    id_card_number: true, id_card_type: true, preferred_language: true,
    notification_enabled: true, reminder_minutes_before: true, preferred_seat_type: true, loyalty_points: true,
    customer_tier: true, account_status: true, email_verified: true, phone_verified: true,
    profile_picture: true, wallet_balance: true, default_orange_money_number: true,
    default_mtn_mobile_money_number: true,
} satisfies Prisma.customerSelect;

export class CustomerRepository {
    private static buildVerifyUrl(token: string): string {
        const apiBaseUrl = process.env.API_BASE_URL || 'https://api.adigobookings.com';
        return `${apiBaseUrl}/v1/api/customers/verify-email/${token}`;
    }

    // Sends the password-reset code by email regardless of whether a
    // matching, non-deleted customer was found — the response to the
    // caller is identical either way (see forgotPassword's own comment)
    // so this never reveals whether an address/phone is registered.
    static async forgotPassword(emailOrPhone: string, lang: Language = 'fr'): Promise<ResponseModel> {
        try {
            const customer = await prismaDb.customer.findFirst({
                where: {
                    is_deleted: false,
                    OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
                },
                select: { id: true, first_name: true, email: true, preferred_language: true },
            });

            if (customer?.email) {
                const code = crypto.randomInt(100000, 1000000).toString(); // 6 digits
                await prismaDb.customer.update({
                    where: { id: customer.id },
                    data: {
                        password_reset_code: code,
                        password_reset_expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30 min
                    },
                });

                const emailLang = (customer.preferred_language as Language) || lang;
                const { subject, html, text } = passwordResetEmail(emailLang, {
                    firstName: customer.first_name,
                    code,
                });
                sendEmail({ to: customer.email, subject, html, text }).catch(() => { /* logged in email.service */ });
            }

            return {
                status: true,
                message: "Si un compte existe avec ces informations, un code de réinitialisation a été envoyé par email",
                code: 200,
            };
        } catch (error) {
            return { status: false, message: "Erreur lors de la demande de réinitialisation", code: 500 };
        }
    }

    static async resetPassword(emailOrPhone: string, code: string, newPassword: string): Promise<ResponseModel> {
        try {
            const customer = await prismaDb.customer.findFirst({
                where: {
                    is_deleted: false,
                    OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
                },
                select: {
                    id: true, first_name: true, email: true, preferred_language: true,
                    password_reset_code: true, password_reset_expires_at: true,
                },
            });

            if (
                !customer ||
                !customer.password_reset_code ||
                customer.password_reset_code !== code ||
                !customer.password_reset_expires_at ||
                customer.password_reset_expires_at < new Date()
            ) {
                return { status: false, message: "Code invalide ou expiré", code: 400 };
            }

            const hashed = await bcrypt.hash(newPassword, 10);
            await prismaDb.customer.update({
                where: { id: customer.id },
                data: { password: hashed, password_reset_code: null, password_reset_expires_at: null },
            });

            if (customer.email) {
                const emailLang = (customer.preferred_language as Language) || 'fr';
                const { subject, html, text } = passwordChangedEmail(emailLang, { firstName: customer.first_name });
                sendEmail({ to: customer.email, subject, html, text }).catch(() => { /* logged in email.service */ });
            }

            return { status: true, message: "Mot de passe réinitialisé avec succès", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour du mot de passe", code: 500 };
        }
    }

    // Change password while logged in - distinct from resetPassword's
    // code-based flow: re-verifies the CURRENT password via bcrypt instead
    // of a mailed code, and operates on an id the caller already proved
    // ownership of via their own JWT (see the controller - never accepts
    // an arbitrary :id from the URL).
    static async changePassword(id: number, oldPassword: string, newPassword: string): Promise<ResponseModel> {
        try {
            const customer = await prismaDb.customer.findFirst({
                where: { id, is_deleted: false },
                select: { id: true, password: true, first_name: true, email: true, preferred_language: true },
            });

            if (!customer) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            const isOldPasswordValid = await bcrypt.compare(oldPassword, customer.password);
            if (!isOldPasswordValid) {
                return { status: false, message: "Ancien mot de passe incorrect", code: 400 };
            }

            const hashed = await bcrypt.hash(newPassword, 10);
            await prismaDb.customer.update({
                where: { id: customer.id },
                data: { password: hashed, updated_at: new Date() },
            });

            if (customer.email) {
                const emailLang = (customer.preferred_language as Language) || 'fr';
                const { subject, html, text } = passwordChangedEmail(emailLang, { firstName: customer.first_name });
                sendEmail({ to: customer.email, subject, html, text }).catch(() => { /* logged in email.service */ });
            }

            return { status: true, message: "Mot de passe modifié avec succès", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors du changement de mot de passe", code: 500 };
        }
    }

    // Regenerates and resends the verification link for a customer who
    // missed/lost the original email or whose 24h token expired.
    // Authenticated-only (operates on req.userId via the controller, no
    // email-lookup path) - login never requires email_verified (see
    // authenticate()), so an unverified customer can always log back in to
    // reach this, sidestepping the "does this email exist" enumeration
    // problem entirely without needing a public variant.
    static async resendVerificationEmail(id: number, lang: Language = 'fr'): Promise<ResponseModel> {
        try {
            const customer = await prismaDb.customer.findFirst({
                where: { id, is_deleted: false },
                select: { id: true, email: true, first_name: true, email_verified: true, preferred_language: true },
            });

            if (!customer) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }
            if (!customer.email) {
                return { status: false, message: "Aucun email associé à ce compte", code: 400 };
            }
            if (customer.email_verified) {
                return { status: true, message: "Cet email est déjà vérifié", code: 200 };
            }

            const emailVerificationToken = crypto.randomBytes(32).toString('hex');
            await prismaDb.customer.update({
                where: { id: customer.id },
                data: {
                    email_verification_token: emailVerificationToken,
                    email_verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
            });

            const emailLang = (customer.preferred_language as Language) || lang;
            const verifyUrl = this.buildVerifyUrl(emailVerificationToken);
            const { subject, html, text } = welcomeEmail(emailLang, { firstName: customer.first_name, verifyUrl });
            sendEmail({ to: customer.email, subject, html, text }).catch(() => { /* logged in email.service */ });

            return { status: true, message: "Email de vérification renvoyé", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors du renvoi de l'email de vérification", code: 500 };
        }
    }

    // Create new customer
    static async create(customer: Customer): Promise<ResponseModel> {
        try {
            const hashedPassword = await bcrypt.hash(customer.password, 10);
            const emailVerificationToken = customer.email ? crypto.randomBytes(32).toString('hex') : null;

            const result = await prismaDb.customer.create({
                data: {
                    first_name: customer.first_name,
                    last_name: customer.last_name,
                    email: customer.email,
                    phone: customer.phone,
                    password: hashedPassword,
                    date_of_birth: customer.date_of_birth,
                    gender: customer.gender,
                    address: customer.address,
                    city: customer.city,
                    id_card_number: customer.id_card_number,
                    id_card_type: customer.id_card_type,
                    preferred_language: customer.preferred_language ?? 'fr',
                    notification_enabled: customer.notification_enabled ?? true,
                    preferred_seat_type: customer.preferred_seat_type,
                    loyalty_points: customer.loyalty_points ?? 0,
                    customer_tier: customer.customer_tier ?? 'regular',
                    account_status: customer.account_status ?? 'active',
                    email_verified: customer.email_verified ?? false,
                    phone_verified: customer.phone_verified ?? false,
                    email_verification_token: emailVerificationToken,
                    email_verification_expires_at: emailVerificationToken
                        ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
                        : null,
                },
                select: {
                    id: true, first_name: true, last_name: true, email: true, phone: true,
                    date_of_birth: true, gender: true, address: true, city: true,
                    id_card_number: true, id_card_type: true, preferred_language: true,
                    notification_enabled: true, preferred_seat_type: true, loyalty_points: true,
                    customer_tier: true, account_status: true, email_verified: true,
                    phone_verified: true, created_at: true,
                },
            });

            const token = jwt.sign(
                { customerId: result.id, email: result.email },
                requireEnv('JWT_SECRET'),
                { expiresIn: '7d' }
            );

            if (result.email && emailVerificationToken) {
                const verifyUrl = this.buildVerifyUrl(emailVerificationToken);
                const lang = (result.preferred_language as Language) || 'fr';
                const { subject, html, text } = welcomeEmail(lang, { firstName: result.first_name, verifyUrl });
                // Fire-and-forget: registration must succeed even if the mail server is down.
                sendEmail({ to: result.email, subject, html, text }).catch(() => { /* logged in email.service */ });
            }

            return {
                status: true,
                message: "Client créé avec succès",
                body: { customer: result, token },
                code: 201
            };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                const target = Array.isArray(error.meta?.target) ? (error.meta!.target as string[]) : [];
                const field = target.includes('email') ? 'email' : target.includes('phone') ? 'phone' : null;
                const message = field === 'email'
                    ? "Un client avec cet email existe déjà"
                    : field === 'phone'
                        ? "Un client avec ce numéro de téléphone existe déjà"
                        : "Un client avec ces informations existe déjà";
                return { status: false, message, code: 409 };
            }
            console.log(`error ....  ${error}`);
            return { status: false, message: "ERREUR_INCONNUE | UNKNOW_ERROR", code: 500 };
        }
    }

    // Find by ID
    // lang defaults to 'en' here (unlike this file's email-template `lang`
    // params, which default to 'fr') — this return value is a JSON API
    // response, not an email, and must match the rest of the app's
    // (English-default) request-language convention. Called from the
    // booking flow (BookingController.createMultiple/create), which is why
    // this one message pair — of the many hardcoded-French ones in this
    // file — is translated: flagged as in scope for "the booking module
    // must be fully bilingual", the rest of this file's messages are not.
    static async findById(id: number, lang: Language = 'en'): Promise<ResponseModel> {
        try {
            const customer = await prismaDb.customer.findFirst({
                where: { id, is_deleted: false },
                select: findByIdSelect,
            });

            if (!customer) {
                return { status: false, message: I18n.t('customer_not_found', lang), code: 404 };
            }

            return { status: true, message: I18n.t('customer_found', lang), body: customer, code: 200 };
        } catch (error) {
            console.error(`❌ [CustomerRepository] Error in findById:`, error);
            return { status: false, message: I18n.t('customer_fetch_error', lang), code: 500 };
        }
    }

    // Find by email
    static async findByEmail(email: string): Promise<ResponseModel> {
        try {
            const customer = await prismaDb.customer.findFirst({
                where: { email, is_deleted: false },
            });

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
            const customer = await prismaDb.customer.findFirst({
                where: { phone, is_deleted: false },
            });

            if (!customer) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            return { status: true, message: "Client trouvé", body: customer, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche du client", code: 500 };
        }
    }

    // Update customer. Deliberately never touches `password` or
    // `account_status`, even if present in the input - password changes
    // must go through resetPassword()/changePassword() (which re-verify
    // ownership via a mailed code or the current password), and
    // account_status changes are an admin-only concern this generic
    // self-service endpoint has no business granting. Neither field was
    // ever sent by the mobile app through this path (confirmed), so this
    // is a pure hardening with no client-side impact.
    static async update(id: number, customer: Partial<Customer>): Promise<ResponseModel> {
        try {
            // Original used `COALESCE($n, column)` per field: an
            // undefined/null param leaves the column untouched. Prisma has
            // no COALESCE — reproduced by only including keys that are
            // neither undefined nor null (both cases fell through to
            // "unchanged" in the original either way).
            const data: Prisma.customerUncheckedUpdateInput = { updated_at: new Date() };
            if (customer.first_name != null) data.first_name = customer.first_name;
            if (customer.last_name != null) data.last_name = customer.last_name;
            if (customer.email != null) data.email = customer.email;
            if (customer.phone != null) data.phone = customer.phone;
            if (customer.date_of_birth != null) data.date_of_birth = customer.date_of_birth;
            if (customer.gender != null) data.gender = customer.gender;
            if (customer.address != null) data.address = customer.address;
            if (customer.city != null) data.city = customer.city;
            if (customer.id_card_number != null) data.id_card_number = customer.id_card_number;
            if (customer.id_card_type != null) data.id_card_type = customer.id_card_type;
            if (customer.preferred_language != null) data.preferred_language = customer.preferred_language;
            if (customer.notification_enabled != null) data.notification_enabled = customer.notification_enabled;
            // reminder_minutes_before: user-configurable trip-departure
            // reminder lead time (minutes), default 15 — see
            // migrations/booking_push_notifications.sql / bookingNotification.service.ts.
            // 0 is a valid, meaningful value (disables just the reminder),
            // so this checks undefined, not the customer.* != null pattern
            // used above (which would also reject 0).
            if (customer.reminder_minutes_before !== undefined) data.reminder_minutes_before = customer.reminder_minutes_before;
            if (customer.preferred_seat_type != null) data.preferred_seat_type = customer.preferred_seat_type;
            if (customer.profile_picture != null) data.profile_picture = customer.profile_picture;
            if (customer.default_orange_money_number != null) data.default_orange_money_number = customer.default_orange_money_number;
            if (customer.default_mtn_mobile_money_number != null) data.default_mtn_mobile_money_number = customer.default_mtn_mobile_money_number;

            const result = await prismaDb.customer.updateMany({
                where: { id, is_deleted: false },
                data,
            });

            if (result.count === 0) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            const updated = await prismaDb.customer.findUnique({
                where: { id },
                select: updateReturnSelect,
            });

            return { status: true, message: "Client mis à jour", body: updated, code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                const target = Array.isArray(error.meta?.target) ? (error.meta!.target as string[]) : [];
                const field = target.includes('email') ? 'email' : target.includes('phone') ? 'phone' : null;
                const message = field === 'email'
                    ? "Un client avec cet email existe déjà"
                    : field === 'phone'
                        ? "Un client avec ce numéro de téléphone existe déjà"
                        : "Un client avec ces informations existe déjà";
                return { status: false, message, code: 409 };
            }
            console.error('❌ [CustomerRepository] Error updating customer:', error);
            return { status: false, message: "Erreur lors de la mise à jour du client", code: 500 };
        }
    }

    // Soft delete
    static async softDelete(id: number, deletedBy?: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.customer.updateMany({
                where: { id, is_deleted: false },
                data: { is_deleted: true, deleted_at: new Date(), deleted_by: deletedBy, updated_at: new Date() },
            });

            if (result.count === 0) {
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
            const result = await prismaDb.customer.updateMany({
                where: { id, is_deleted: true },
                data: { is_deleted: false, deleted_at: null, deleted_by: null, updated_at: new Date() },
            });

            if (result.count === 0) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            const restored = await prismaDb.customer.findUnique({
                where: { id },
                select: { id: true, first_name: true, last_name: true, email: true, phone: true },
            });

            return { status: true, message: "Client restauré", body: restored, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la restauration du client", code: 500 };
        }
    }

    // Hard delete
    static async delete(id: number): Promise<ResponseModel> {
        try {
            await prismaDb.customer.delete({ where: { id } });
            return { status: true, message: "Client supprimé définitivement", code: 200 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return { status: false, message: "Client non trouvé", code: 404 };
            }
            return { status: false, message: "Erreur lors de la suppression du client", code: 500 };
        }
    }

    // Find all customers
    static async findAll(includeDeleted: boolean = false): Promise<ResponseModel> {
        try {
            const customers = await prismaDb.customer.findMany({
                where: includeDeleted ? {} : { is_deleted: false },
                orderBy: { created_at: 'desc' },
            });
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
            const where: Prisma.customerWhereInput = { is_deleted: false };

            if (filters.searchTerm && filters.searchTerm.trim() !== '') {
                const term = filters.searchTerm;
                where.OR = [
                    { first_name: { contains: term, mode: 'insensitive' } },
                    { last_name: { contains: term, mode: 'insensitive' } },
                    { email: { contains: term, mode: 'insensitive' } },
                    { phone: { contains: term, mode: 'insensitive' } },
                ];
            }
            if (filters.accountStatus) where.account_status = filters.accountStatus;
            if (filters.customerTier) where.customer_tier = filters.customerTier;
            if (filters.emailVerified !== undefined) where.email_verified = filters.emailVerified;
            if (filters.phoneVerified !== undefined) where.phone_verified = filters.phoneVerified;
            if (filters.minLoyaltyPoints !== undefined) where.loyalty_points = { gte: filters.minLoyaltyPoints };
            if (filters.city && filters.city.trim() !== '') {
                where.city = { contains: filters.city, mode: 'insensitive' };
            }

            const customers = await prismaDb.customer.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: 50,
            });

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
            // Curated select (findByIdSelect + password, stripped below
            // before the response leaves this function) instead of a bare
            // findFirst() - the raw row included email_verification_token/
            // password_reset_code (internal secrets), leaked to the client
            // on every login response until this fix.
            const customer = await prismaDb.customer.findFirst({
                where: { OR: [{ email: emailOrPhone }, { phone: emailOrPhone }], is_deleted: false },
                select: { ...findByIdSelect, password: true },
            });

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

            await prismaDb.customer.update({
                where: { id: customer.id },
                data: { last_login: new Date() },
            });

            const { password: _pw, ...customerWithoutPassword } = customer;

            const token = jwt.sign(
                { customerId: customer.id, email: customer.email },
                requireEnv('JWT_SECRET'),
                { expiresIn: '7d' }
            );

            return {
                status: true,
                message: "Connexion réussie",
                body: { customer: customerWithoutPassword, token },
                code: 200
            };
        } catch (error) {
            return { status: false, message: "Erreur lors de l'authentification", code: 500 };
        }
    }

    // "Sign in with Google" - mobile sends the ID token from the Google
    // Sign-In SDK (verified here server-side against Google's own public
    // keys via google-auth-library, never trusted as-is). Auto-links to
    // an existing password-based account sharing the same email (Google
    // already verified that email's ownership via OAuth, so this is a
    // legitimate match, not the same class of risk as trusting a
    // client-asserted email) - creates a new customer otherwise.
    static async loginWithGoogle(idToken: string): Promise<ResponseModel> {
        try {
            const client = new OAuth2Client(requireEnv('GOOGLE_CLIENT_ID'));
            let payload;
            try {
                const ticket = await client.verifyIdToken({
                    idToken,
                    audience: requireEnv('GOOGLE_CLIENT_ID'),
                });
                payload = ticket.getPayload();
            } catch (verifyError) {
                return { status: false, message: "Jeton Google invalide", code: 401 };
            }

            if (!payload || !payload.email) {
                return { status: false, message: "Jeton Google invalide", code: 401 };
            }
            if (!payload.email_verified) {
                return { status: false, message: "Email Google non vérifié", code: 401 };
            }

            const googleId = payload.sub;
            let customer = await prismaDb.customer.findFirst({
                where: { is_deleted: false, OR: [{ google_id: googleId }, { email: payload.email }] },
                select: { ...findByIdSelect, google_id: true },
            });

            if (customer) {
                if (customer.account_status !== 'active') {
                    return { status: false, message: `Compte ${customer.account_status}`, code: 403 };
                }
                if (!customer.google_id) {
                    // Existing password-based account, first time signing
                    // in with Google - link it rather than creating a
                    // duplicate.
                    await prismaDb.customer.update({
                        where: { id: customer.id },
                        data: { google_id: googleId, email_verified: true, last_login: new Date() },
                    });
                } else {
                    await prismaDb.customer.update({
                        where: { id: customer.id },
                        data: { last_login: new Date() },
                    });
                }
            } else {
                // New account - password column is NOT NULL with no
                // Google-specific null path added (a bigger schema change
                // than this needs); store an unusable random hash instead.
                // The account works exclusively through Google sign-in
                // until/unless the customer sets a real password via the
                // forgot-password flow.
                const randomPassword = crypto.randomBytes(32).toString('hex');
                const hashedPassword = await bcrypt.hash(randomPassword, 10);

                customer = await prismaDb.customer.create({
                    data: {
                        first_name: payload.given_name || payload.name || 'Google',
                        last_name: payload.family_name || 'User',
                        email: payload.email,
                        password: hashedPassword,
                        google_id: googleId,
                        email_verified: true, // Google already verified it
                        account_status: 'active',
                        preferred_language: 'fr',
                    },
                    select: { ...findByIdSelect, google_id: true },
                });
            }

            const token = jwt.sign(
                { customerId: customer.id, email: customer.email },
                requireEnv('JWT_SECRET'),
                { expiresIn: '7d' }
            );

            const { google_id, ...customerWithoutGoogleId } = customer;

            return {
                status: true,
                message: "Connexion réussie",
                body: { customer: customerWithoutGoogleId, token },
                code: 200,
            };
        } catch (error) {
            console.error('❌ [CustomerRepository] Error in loginWithGoogle:', error);
            return { status: false, message: "Erreur lors de la connexion Google", code: 500 };
        }
    }

    // Update loyalty points
    static async updateLoyaltyPoints(id: number, points: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.customer.updateMany({
                where: { id, is_deleted: false },
                data: { loyalty_points: { increment: points }, updated_at: new Date() },
            });

            if (result.count === 0) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            const updated = await prismaDb.customer.findUnique({
                where: { id },
                select: { id: true, first_name: true, last_name: true, loyalty_points: true, customer_tier: true },
            });

            await this.checkAndUpdateTier(id, updated!.loyalty_points ?? 0);

            return { status: true, message: "Points mis à jour", body: updated, code: 200 };
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

        // Original ran a plain UPDATE with no is_deleted guard and no
        // existence check (silent no-op if the id doesn't exist) —
        // updateMany reproduces that silent-no-op exactly (unlike
        // `.update()`, it never throws P2025).
        await prismaDb.customer.updateMany({
            where: { id },
            data: { customer_tier: tier },
        });
    }

    // Verify email
    static async verifyEmail(id: number): Promise<ResponseModel> {
        try {
            // Same silent-no-op-on-missing-id behavior as the original
            // pgNone call — updateMany over `.update()` so a bad id still
            // returns 200, not a 500 from an unhandled P2025.
            await prismaDb.customer.updateMany({
                where: { id },
                data: { email_verified: true, updated_at: new Date() },
            });

            return { status: true, message: "Email vérifié", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la vérification de l'email", code: 500 };
        }
    }

    // Verify email via the token emailed at registration (public, unauthenticated
    // link click) - distinct from the id-based verifyEmail above, which stays as
    // an internal/admin action with no ownership proof required.
    static async verifyEmailByToken(token: string): Promise<ResponseModel> {
        try {
            const customer = await prismaDb.customer.findFirst({
                where: { email_verification_token: token },
                select: { id: true, email_verification_expires_at: true, preferred_language: true },
            });

            if (!customer || !customer.email_verification_expires_at || customer.email_verification_expires_at < new Date()) {
                // No customer found for an expired/invalid token - preferred_language
                // is unknown, so the controller falls back to request-based detection.
                return { status: false, message: "Lien invalide ou expiré", code: 400 };
            }

            await prismaDb.customer.update({
                where: { id: customer.id },
                data: {
                    email_verified: true,
                    email_verification_token: null,
                    email_verification_expires_at: null,
                    updated_at: new Date(),
                },
            });

            return {
                status: true,
                message: "Email vérifié",
                body: { preferred_language: customer.preferred_language },
                code: 200,
            };
        } catch (error) {
            return { status: false, message: "Erreur lors de la vérification de l'email", code: 500 };
        }
    }

    // Verify phone
    static async verifyPhone(id: number): Promise<ResponseModel> {
        try {
            await prismaDb.customer.updateMany({
                where: { id },
                data: { phone_verified: true, updated_at: new Date() },
            });

            return { status: true, message: "Téléphone vérifié", code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la vérification du téléphone", code: 500 };
        }
    }

    // Get statistics
    static async getStatistics(): Promise<ResponseModel> {
        try {
            // Original was one SQL statement with `SUM(CASE WHEN ...)`
            // returning numeric-as-string/bigint-ish values. There's no
            // conditional-SUM equivalent in the model API, so this is 9
            // parallel `.count()` calls instead — same result shape, but
            // now genuinely-typed `number` fields (a strict improvement:
            // no more numeric-string/bigint leakage), at the cost of 9
            // round trips instead of 1. Flagging the shape/type change,
            // not silently declaring it identical.
            const [total, active, suspended, blocked, platinum, gold, silver, emailVerified, phoneVerified] =
                await Promise.all([
                    prismaDb.customer.count({ where: { is_deleted: false } }),
                    prismaDb.customer.count({ where: { is_deleted: false, account_status: 'active' } }),
                    prismaDb.customer.count({ where: { is_deleted: false, account_status: 'suspended' } }),
                    prismaDb.customer.count({ where: { is_deleted: false, account_status: 'blocked' } }),
                    prismaDb.customer.count({ where: { is_deleted: false, customer_tier: 'platinum' } }),
                    prismaDb.customer.count({ where: { is_deleted: false, customer_tier: 'gold' } }),
                    prismaDb.customer.count({ where: { is_deleted: false, customer_tier: 'silver' } }),
                    prismaDb.customer.count({ where: { is_deleted: false, email_verified: true } }),
                    prismaDb.customer.count({ where: { is_deleted: false, phone_verified: true } }),
                ]);

            const stats = {
                total, active, suspended, blocked, platinum, gold, silver,
                email_verified: emailVerified, phone_verified: phoneVerified,
            };

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

            // Same pattern as agency.bulkCreate: `createMany` can't
            // RETURNING, and there's no single unique column to safely
            // re-query the whole batch by afterwards, so individual
            // `create()` calls inside `$transaction([...])` preserve the
            // original single-INSERT's all-or-nothing atomicity while
            // still getting each row (with its generated id) back.
            const result = await prismaDb.$transaction(
                hashedCustomers.map((c) =>
                    prismaDb.customer.create({
                        data: {
                            first_name: c.first_name,
                            last_name: c.last_name,
                            email: c.email,
                            phone: c.phone,
                            password: c.password,
                            date_of_birth: c.date_of_birth,
                            gender: c.gender,
                            address: c.address,
                            city: c.city,
                            id_card_number: c.id_card_number,
                            id_card_type: c.id_card_type,
                            preferred_language: c.preferred_language,
                            notification_enabled: c.notification_enabled,
                            preferred_seat_type: c.preferred_seat_type,
                            loyalty_points: c.loyalty_points,
                            customer_tier: c.customer_tier,
                            account_status: c.account_status,
                            email_verified: c.email_verified,
                            phone_verified: c.phone_verified,
                        },
                        select: {
                            id: true, first_name: true, last_name: true, email: true,
                            phone: true, date_of_birth: true, gender: true, address: true,
                            city: true, created_at: true,
                        },
                    })
                )
            );

            return { status: true, message: "Clients créés avec succès", body: result, code: 201 };
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                return { status: false, message: "Certains emails ou téléphones sont déjà utilisés", code: 409 };
            }
            return { status: false, message: "Erreur lors de la création des clients", code: 500 };
        }
    }

    // Update wallet balance
    static async updateWalletBalance(customerId: number, amount: number): Promise<ResponseModel> {
        try {
            // SCHEMA DISCREPANCY FLAGGED: original used
            // `COALESCE(wallet_balance, 0) + $1`, NULL-safe against a
            // NULL column value. `wallet_balance` is a nullable
            // `Int? @default(0)` column — the DB default protects normal
            // rows, but any row that somehow has a genuine NULL there
            // would go to NULL forever under `{increment}` (Prisma has no
            // COALESCE-in-update escape hatch), whereas the original would
            // have healed it back to a number. Kept `{increment}` anyway
            // since it's the correct atomic native-API idiom and no NULL
            // wallet_balance was found in this repo's other 13 already-
            // converted files' testing — but this is a real, unverified
            // edge case, not silently declared safe.
            const result = await prismaDb.customer.updateMany({
                where: { id: customerId, is_deleted: false },
                data: { wallet_balance: { increment: amount }, updated_at: new Date() },
            });

            if (result.count === 0) {
                return { status: false, message: "Client non trouvé", code: 404 };
            }

            const updated = await prismaDb.customer.findUnique({
                where: { id: customerId },
                select: { id: true, wallet_balance: true },
            });

            return { status: true, message: "Solde du portefeuille mis à jour", body: updated, code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la mise à jour du solde", code: 500 };
        }
    }

    // Get wallet balance
    // Same in-scope-for-booking note as findById above.
    static async getWalletBalance(customerId: number, lang: Language = 'en'): Promise<ResponseModel> {
        try {
            const result = await prismaDb.customer.findFirst({
                where: { id: customerId, is_deleted: false },
                select: { id: true, wallet_balance: true },
            });

            if (!result) {
                return { status: false, message: I18n.t('customer_not_found', lang), code: 404 };
            }

            return { status: true, message: I18n.t('wallet_balance_retrieved', lang), body: { balance: result.wallet_balance || 0 }, code: 200 };
        } catch (error) {
            return { status: false, message: I18n.t('wallet_balance_fetch_error', lang), code: 500 };
        }
    }

}

// src/repositories/user.repository.ts
// Migrated to Prisma's native model API (prisma.users.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
import prismaDb from "../config/prismaClient";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { requireEnv } from "../utils/env";
import ResponseModel from "../models/response.model";
import UserModel from "../models/user.model";

export class UserRepository {
    static async create(user: UserModel): Promise<ResponseModel> {
        try {
            const hashedPassword = await bcrypt.hash(
                user.password!,
                parseInt(process.env.SALT || '10', 10)
            );

            const result = await prismaDb.users.create({
                data: {
                    login: user.login,
                    password: hashedPassword,
                    account_status: user.account_status,
                    language: user.language,
                    role: user.role,
                    creation_date: user.creation_date,
                },
                select: { id: true, login: true, account_status: true, language: true, role: true, creation_date: true },
            });

            const token = jwt.sign(
                {
                    id: result.id,
                    email: result.login,
                    role: result.role
                },
                requireEnv('JWT_SECRET'),
                { expiresIn: '24h' } // Token valide pour 24 heures (aligné avec update())
            );

            return {
                status: true,
                message: 'User successfully created',
                body: result,
                token,
                code: 201
            };
        } catch (error) {
            return {
                status: false,
                message: 'Registration error',
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }

    static async login(login: string, password: string): Promise<ResponseModel> {
        try {

            const user = await prismaDb.users.findFirst({
                where: { login, is_deleted: false },
            });

            if (!user) {
                return {
                    status: false,
                    message: "User not found",
                    body: null,
                    code: 404
                };
            }

            if (user.account_status !== "enabled") {
                return {
                    status: false,
                    message: "Account is disabled",
                    body: null,
                    code: 403
                };
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return {
                    status: false,
                    message: "Invalid credentials",
                    body: null,
                    code: 401
                };
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.login,
                    role: user.role,
                    profile: user.profile
                },
                requireEnv('JWT_SECRET'),
                { expiresIn: '24h' } // Token valide pour 24 heures
            );

            const updatedUser = await prismaDb.users.update({
                where: { id: user.id },
                data: { is_online: true },
            });

            return {
                status: true,
                message: "Login successful",
                body: updatedUser,
                token,
                code: 200
            };


        } catch (error) {

            return {
                status: false,
                message: "Login error",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }

    // GET BY ID
    static async findById(id: number, includeDeleted: boolean = false): Promise<ResponseModel> {
        try {
            const user = await prismaDb.users.findFirst({
                where: includeDeleted ? { id } : { id, is_deleted: false },
                select: { id: true, login: true, account_status: true, language: true, role: true, profile: true, staff: true, creation_date: true },
            });

            if (!user) {
                return {
                    status: false,
                    message: "User not found",
                    body: null,
                    code: 404
                };
            }

            return {
                status: true,
                message: "User retrieved successfully",
                body: user,
                code: 200
            };
        } catch (error) {
            return {
                status: false,
                message: "Error retrieving user",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }

    // GET ALL
    static async findAll(includeDeleted: boolean = false): Promise<ResponseModel> {
        try {
            const users = await prismaDb.users.findMany({
                where: { is_deleted: includeDeleted },
                orderBy: { login: 'asc' },
            });

            return {
                status: true,
                message: "User retrieved successfully",
                body: users,
                code: 200
            };
        } catch (error) {
            return {
                status: false,
                message: "Error retrieving user",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }

    // UPDATE
    static async update(id: number, userData: Partial<UserModel>): Promise<ResponseModel> {
        try {
            // Ne pas permettre la mise à jour de certains champs
            const { id: _, is_deleted, ...safeUpdates } = userData as any;

            // Si le mot de passe est fourni, le hasher
            if (safeUpdates.password) {
                safeUpdates.password = await bcrypt.hash(safeUpdates.password, parseInt(process.env.SALT || '10', 10));
            }

            const result = await prismaDb.users.updateMany({
                where: { id, is_deleted: false },
                data: { ...safeUpdates, updated_at: new Date() },
            });

            if (result.count === 0) {
                return {
                    status: false,
                    message: "User not found or already deleted",
                    body: null,
                    code: 404
                };
            }
            const updatedUser = await prismaDb.users.findUnique({
                where: { id },
                select: { id: true, login: true, account_status: true, language: true, role: true, profile: true, staff: true },
            });

            return {
                status: true,
                message: "User updated successfully",
                body: updatedUser,
                code: 200
            };
        } catch (error) {
            return {
                status: false,
                message: "Error updating user",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }

    // SOFT DELETE
    static async softDelete(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.users.updateMany({
                where: { id, is_deleted: false },
                data: { is_deleted: true, deleted_at: new Date() },
            });

            if (result.count === 0) {
                return {
                    status: false,
                    message: "User not found or already deleted",
                    body: null,
                    code: 404
                };
            }

            return {
                status: true,
                message: "User soft deleted successfully",
                body: { id },
                code: 200
            };
        } catch (error) {
            return {
                status: false,
                message: "Error soft deleting user",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }

    // HARD DELETE
    static async delete(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.users.deleteMany({ where: { id } });

            if (result.count === 0) {
                return {
                    status: false,
                    message: "User not found",
                    body: null,
                    code: 404
                };
            }

            return {
                status: true,
                message: "User permanently deleted",
                body: { id },
                code: 200
            };
        } catch (error) {
            return {
                status: false,
                message: "Error deleting user",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }

    // RESTORE (annuler soft delete)
    static async restore(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.users.updateMany({
                where: { id, is_deleted: true },
                data: { is_deleted: false, deleted_at: null },
            });

            if (result.count === 0) {
                return {
                    status: false,
                    message: "User not found or not deleted",
                    body: null,
                    code: 404
                };
            }
            const restoredUser = await prismaDb.users.findUnique({
                where: { id },
                select: { id: true, login: true },
            });

            return {
                status: true,
                message: "User restored successfully",
                body: restoredUser,
                code: 200
            };
        } catch (error) {
            return {
                status: false,
                message: "Error restoring user",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }
}

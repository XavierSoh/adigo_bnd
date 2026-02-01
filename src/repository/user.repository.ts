// src/repositories/user.repository.ts
import pgpDb from "../config/pgdb"; 
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { kUsers } from "../utils/table_names";
import ResponseModel from "../models/response.model"; 
import UserModel from "../models/user.model";

export class UserRepository {
    static async create(user: UserModel): Promise<ResponseModel> {
        try {
            const hashedPassword = await bcrypt.hash(
                user.password!, 
                parseInt(process.env.SALT!)
            );

            const result = await pgpDb.oneOrNone(`
                INSERT INTO ${kUsers} (
                    login, password, account_status, language, role, creation_date
                ) VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING id, login, account_status, language, role, creation_date
            `, [
                user.login, 
                hashedPassword, 
                user.account_status, 
                user.language, 
                user.role, 
                user.creation_date
            ]);

            if (!result) {
                throw new Error('Failed to create user');
            }

            const token = jwt.sign(
                {
                    id: result.id,
                    email: result.login,
                    role: result.role
                },
                process.env.JWT_SECRET!
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
         
            const user = await pgpDb.oneOrNone(`
                SELECT * FROM ${kUsers} 
                WHERE login = $1 AND is_deleted = false
            `, [login]);

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
                process.env.JWT_SECRET!,
                { expiresIn: '24h' } // Token valide pour 24 heures
            );

            const updatedUser = await pgpDb.oneOrNone(`
                UPDATE ${kUsers} 
                SET is_online = true 
                WHERE id = $1 
                RETURNING *
            `, [user.id]);
 
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
            let query = `
                SELECT id, login, account_status, language, role, profile, staff, creation_date
                FROM ${kUsers} 
                WHERE id = $1
            `;
            
            if (!includeDeleted) {
                query += " AND is_deleted = false";
            }

            const user = await pgpDb.oneOrNone(query, [id]);

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
    static async findAll( includeDeleted: boolean = false): Promise<ResponseModel> {
        try {
            let query = `
                SELECT *
                FROM ${kUsers} WHERE is_deleted = $1
                 ORDER BY login ASC
            `;
            
          

            const users = await pgpDb.manyOrNone(query, includeDeleted);
 

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
            const { id: _,  is_deleted, ...safeUpdates } = userData;

            // Si le mot de passe est fourni, le hasher
            let hashedPassword: string | undefined;
            if (safeUpdates.password) {
                hashedPassword = await bcrypt.hash(safeUpdates.password, parseInt(process.env.SALT!));
                safeUpdates.password = hashedPassword;
            }

            const setClause = Object.keys(safeUpdates)
                .map((key, index) => `${key} = $${index + 2}`)
                .join(", ");

            const query = `
                UPDATE ${kUsers}
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND is_deleted = false
                RETURNING id, login, account_status, language, role, profile, staff
            `;

            const params = [id, ...Object.values(safeUpdates)];
            const updatedUser = await pgpDb.oneOrNone(query, params);

            if (!updatedUser) {
                return {
                    status: false,
                    message: "User not found or already deleted",
                    body: null,
                    code: 404
                };
            }

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
            const query = `
                UPDATE ${kUsers}
                SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND is_deleted = false
                RETURNING id
            `;
            
            const result = await pgpDb.oneOrNone(query, [id]);

            if (!result) {
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
            const query = `
                DELETE FROM ${kUsers}
                WHERE id = $1
                RETURNING id
            `;
            
            const result = await pgpDb.oneOrNone(query, [id]);

            if (!result) {
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
            const query = `
                UPDATE ${kUsers}
                SET is_deleted = false, deleted_at = NULL
                WHERE id = $1 AND is_deleted = true
                RETURNING id, login
            `;
            
            const restoredUser = await pgpDb.oneOrNone(query, [id]);

            if (!restoredUser) {
                return {
                    status: false,
                    message: "User not found or not deleted",
                    body: null,
                    code: 404
                };
            }

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
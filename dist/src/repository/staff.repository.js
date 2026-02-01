"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffRepository = void 0;
const pgdb_1 = __importDefault(require("../config/pgdb"));
const table_names_1 = require("../utils/table_names");
/**
 * StaffRepository handles database operations related to staff members.
 */
class StaffRepository {
    static async create(staff) {
        try {
            const result = await pgdb_1.default.oneOrNone(`
                INSERT INTO ${table_names_1.kStaff} (
                    first_name, birth_name, last_name, employee_id, birth_date,
                    email, mobile_phone, landline_phone, contract_start_date,
                    contract_start_time, weekly_working_hours, contract_end_date,
                    contract_type, salary, payment_mode, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *
            `, [
                staff.first_name,
                staff.birth_name,
                staff.last_name,
                staff.employee_id,
                staff.birth_date,
                staff.email,
                staff.mobile_phone,
                staff.landline_phone,
                staff.contract_start_date,
                staff.contract_start_time,
                staff.weekly_working_hours,
                staff.contract_end_date,
                staff.contract_type,
                staff.salary,
                staff.payment_mode,
                staff.created_by
            ]);
            if (!result) {
                throw new Error('Failed to create staff member');
            }
            return {
                status: true,
                message: 'Staff member successfully created',
                body: result,
                code: 201
            };
        }
        catch (error) {
            return {
                status: false,
                message: 'Registration error',
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }
    // GET BY ID
    static async findById(id, includeDeleted = false) {
        try {
            let query = `
                SELECT *
                FROM ${table_names_1.kStaff} 
                WHERE id = $1
            `;
            if (!includeDeleted) {
                query += " AND is_deleted = false";
            }
            const staff = await pgdb_1.default.oneOrNone(query, [id]);
            if (!staff) {
                return {
                    status: false,
                    message: "Staff member not found",
                    body: null,
                    code: 404
                };
            }
            return {
                status: true,
                message: "Staff member retrieved successfully",
                body: staff,
                code: 200
            };
        }
        catch (error) {
            return {
                status: false,
                message: "Error retrieving staff member",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }
    // GET ALL
    static async findAll(includeDeleted = false) {
        try {
            let query = `
                SELECT *
                FROM ${table_names_1.kStaff}
            `;
            if (!includeDeleted) {
                query += " WHERE is_deleted = false";
            }
            query += " ORDER BY last_name ASC, first_name ASC";
            const staffMembers = await pgdb_1.default.manyOrNone(query);
            return {
                status: true,
                message: "Staff members retrieved successfully",
                body: staffMembers,
                code: 200
            };
        }
        catch (error) {
            return {
                status: false,
                message: "Error retrieving staff members",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }
    // UPDATE
    static async update(id, staffData) {
        try {
            // Ne pas permettre la mise à jour de certains champs
            const { id: _, is_deleted, created_by, ...safeUpdates } = staffData;
            const setClause = Object.keys(safeUpdates)
                .map((key, index) => `${key} = $${index + 2}`)
                .join(", ");
            const query = `
                UPDATE ${table_names_1.kStaff}
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND is_deleted = false
                RETURNING *
            `;
            const params = [id, ...Object.values(safeUpdates)];
            const updatedStaff = await pgdb_1.default.oneOrNone(query, params);
            if (!updatedStaff) {
                return {
                    status: false,
                    message: "Staff member not found or already deleted",
                    body: null,
                    code: 404
                };
            }
            return {
                status: true,
                message: "Staff member updated successfully",
                body: updatedStaff,
                code: 200
            };
        }
        catch (error) {
            return {
                status: false,
                message: "Error updating staff member",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }
    // SOFT DELETE
    static async softDelete(id) {
        try {
            const query = `
                UPDATE ${table_names_1.kStaff}
                SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND is_deleted = false
                RETURNING id
            `;
            const result = await pgdb_1.default.oneOrNone(query, [id]);
            if (!result) {
                return {
                    status: false,
                    message: "Staff member not found or already deleted",
                    body: null,
                    code: 404
                };
            }
            return {
                status: true,
                message: "Staff member soft deleted successfully",
                body: { id },
                code: 200
            };
        }
        catch (error) {
            return {
                status: false,
                message: "Error soft deleting staff member",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }
    // HARD DELETE
    static async delete(id) {
        try {
            const query = `
                DELETE FROM ${table_names_1.kStaff}
                WHERE id = $1
                RETURNING id
            `;
            const result = await pgdb_1.default.oneOrNone(query, [id]);
            if (!result) {
                return {
                    status: false,
                    message: "Staff member not found",
                    body: null,
                    code: 404
                };
            }
            return {
                status: true,
                message: "Staff member permanently deleted",
                body: { id },
                code: 200
            };
        }
        catch (error) {
            return {
                status: false,
                message: "Error deleting staff member",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }
    // RESTORE (annuler soft delete)
    static async restore(id) {
        try {
            const query = `
                UPDATE ${table_names_1.kStaff}
                SET is_deleted = false, deleted_at = NULL, deleted_by = NULL
                WHERE id = $1 AND is_deleted = true
                RETURNING id, first_name, last_name
            `;
            const restoredStaff = await pgdb_1.default.oneOrNone(query, [id]);
            if (!restoredStaff) {
                return {
                    status: false,
                    message: "Staff member not found or not deleted",
                    body: null,
                    code: 404
                };
            }
            return {
                status: true,
                message: "Staff member restored successfully",
                body: restoredStaff,
                code: 200
            };
        }
        catch (error) {
            return {
                status: false,
                message: "Error restoring staff member",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }
    // Méthode supplémentaire pour mettre à jour le dernier paiement de salaire
    static async updateLastSalaryPayment(id, paymentDate) {
        try {
            const query = `
                UPDATE ${table_names_1.kStaff}
                SET last_salary_payment = $2
                WHERE id = $1
                RETURNING id, last_salary_payment
            `;
            const result = await pgdb_1.default.oneOrNone(query, [id, paymentDate]);
            if (!result) {
                return {
                    status: false,
                    message: "Staff member not found",
                    body: null,
                    code: 404
                };
            }
            return {
                status: true,
                message: "Last salary payment updated successfully",
                body: result,
                code: 200
            };
        }
        catch (error) {
            return {
                status: false,
                message: "Error updating last salary payment",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }
    static async getStaffWithoutUser() {
        try {
            const result = await pgdb_1.default.query(`SELECT DISTINCT  s.*  FROM ${table_names_1.kStaff} s WHERE s.id NOT IN (SELECT u.staff FROM "${table_names_1.kUsers}" u WHERE u.staff IS NOT NULL) `);
            return result;
        }
        catch (err) {
            console.error('Erreur lors de la récupération des staffs:', err);
            throw err;
        }
    }
    static async generateUniqueEmployeeId() {
        // Récupérer le dernier ID existant
        const result = await pgdb_1.default.oneOrNone(`SELECT employee_id FROM ${table_names_1.kStaff} WHERE employee_id LIKE \'EMPL%\' ORDER BY employee_id DESC LIMIT 1`);
        let newEmployeeId;
        if (result) {
            // Extraire le numéro du dernier matricule (EMPLXXXX → XXXX)
            const lastNumber = parseInt(result.employee_id.replace('EMPL', ''), 10);
            newEmployeeId = `EMPL${(lastNumber + 1).toString().padStart(4, '0')}`;
        }
        else {
            // Aucun employé dans la base, commencer à EMPL1000
            newEmployeeId = 'EMPL1000';
        }
        return newEmployeeId;
    }
}
exports.StaffRepository = StaffRepository;

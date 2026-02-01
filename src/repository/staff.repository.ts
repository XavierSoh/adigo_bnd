import pgpDb from "../config/pgdb";
import { kStaff, kUsers } from "../utils/table_names";
import ResponseModel from "../models/response.model";
import { StaffModel } from "../models/staff.model";

/**
 * StaffRepository handles database operations related to staff members.
 */

export class StaffRepository {
    static async create(staff: StaffModel): Promise<ResponseModel> {
        try {
            const result = await pgpDb.oneOrNone(`
                INSERT INTO ${kStaff} (
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

    // GET BY ID
    static async findById(id: number, includeDeleted: boolean = false): Promise<ResponseModel> {
        try {
            let query = `
                SELECT *
                FROM ${kStaff} 
                WHERE id = $1
            `;
            
            if (!includeDeleted) {
                query += " AND is_deleted = false";
            }

            const staff = await pgpDb.oneOrNone(query, [id]);

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
        } catch (error) {
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
    static async findAll(includeDeleted: boolean = false): Promise<ResponseModel> {
        try {
            let query = `
                SELECT *
                FROM ${kStaff}
            `;
            
            if (!includeDeleted) {
                query += " WHERE is_deleted = false";
            }

            query += " ORDER BY last_name ASC, first_name ASC";

            const staffMembers = await pgpDb.manyOrNone(query);

            return {
                status: true,
                message: "Staff members retrieved successfully",
                body: staffMembers,
                code: 200
            };
        } catch (error) {
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
    static async update(id: number, staffData: Partial<StaffModel>): Promise<ResponseModel> {
        try {
            // Ne pas permettre la mise à jour de certains champs
            const { id: _, is_deleted, created_by, ...safeUpdates } = staffData;

            const setClause = Object.keys(safeUpdates)
                .map((key, index) => `${key} = $${index + 2}`)
                .join(", ");

            const query = `
                UPDATE ${kStaff}
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND is_deleted = false
                RETURNING *
            `;

            const params = [id, ...Object.values(safeUpdates)];
            const updatedStaff = await pgpDb.oneOrNone(query, params);

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
        } catch (error) {
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
    static async softDelete(id: number): Promise<ResponseModel> {
        try {
            const query = `
                UPDATE ${kStaff}
                SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND is_deleted = false
                RETURNING id
            `;
            
            const result = await pgpDb.oneOrNone(query, [id]);

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
        } catch (error) {
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
    static async delete(id: number): Promise<ResponseModel> {
        try {
            const query = `
                DELETE FROM ${kStaff}
                WHERE id = $1
                RETURNING id
            `;
            
            const result = await pgpDb.oneOrNone(query, [id]);

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
        } catch (error) {
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
    static async restore(id: number): Promise<ResponseModel> {
        try {
            const query = `
                UPDATE ${kStaff}
                SET is_deleted = false, deleted_at = NULL, deleted_by = NULL
                WHERE id = $1 AND is_deleted = true
                RETURNING id, first_name, last_name
            `;
            
            const restoredStaff = await pgpDb.oneOrNone(query, [id]);

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
        } catch (error) {
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
    static async updateLastSalaryPayment(id: number, paymentDate: Date): Promise<ResponseModel> {
        try {
            const query = `
                UPDATE ${kStaff}
                SET last_salary_payment = $2
                WHERE id = $1
                RETURNING id, last_salary_payment
            `;
            
            const result = await pgpDb.oneOrNone(query, [id, paymentDate]);

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
        } catch (error) {
            return {
                status: false,
                message: "Error updating last salary payment",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            };
        }
    }

    static async  getStaffWithoutUser(): Promise<StaffModel[]> {
  try {
    const result = await pgpDb.query( `SELECT DISTINCT  s.*  FROM ${kStaff} s WHERE s.id NOT IN (SELECT u.staff FROM "${kUsers}" u WHERE u.staff IS NOT NULL) `);
 
    return result as StaffModel[];
  } catch (err) {
    console.error('Erreur lors de la récupération des staffs:', err);
    throw err;
  }
}
 static async  generateUniqueEmployeeId() {
  // Récupérer le dernier ID existant
  const result = await pgpDb.oneOrNone(
      `SELECT employee_id FROM ${kStaff} WHERE employee_id LIKE \'EMPL%\' ORDER BY employee_id DESC LIMIT 1`
  );

  let newEmployeeId;
  
  if (result) {
      // Extraire le numéro du dernier matricule (EMPLXXXX → XXXX)
      const lastNumber = parseInt(result.employee_id.replace('EMPL', ''), 10);
      newEmployeeId = `EMPL${(lastNumber + 1).toString().padStart(4, '0')}`;
  } else {
      // Aucun employé dans la base, commencer à EMPL1000
      newEmployeeId = 'EMPL1000';
  }

  return newEmployeeId;
}


}
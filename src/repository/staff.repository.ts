// Migrated to Prisma's native model API (prisma.staff.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration").
import prismaDb from "../config/prismaClient";
import ResponseModel from "../models/response.model";
import { StaffModel } from "../models/staff.model";

/**
 * StaffRepository handles database operations related to staff members.
 */

export class StaffRepository {
    static async create(staff: StaffModel): Promise<ResponseModel> {
        try {
            const result = await prismaDb.staff.create({
                data: {
                    first_name: staff.first_name,
                    birth_name: staff.birth_name,
                    last_name: staff.last_name,
                    employee_id: staff.employee_id,
                    birth_date: staff.birth_date,
                    email: staff.email,
                    mobile_phone: staff.mobile_phone,
                    landline_phone: staff.landline_phone,
                    contract_start_date: staff.contract_start_date,
                    contract_start_time: staff.contract_start_time,
                    weekly_working_hours: staff.weekly_working_hours,
                    contract_end_date: staff.contract_end_date,
                    contract_type: staff.contract_type,
                    salary: staff.salary,
                    payment_mode: staff.payment_mode,
                    // NOTE: original inserted `created_by` too, but that
                    // column doesn't exist on `staff` (verified against
                    // prisma/schema.prisma — likely always NULL/ignored by
                    // Postgres already since raw SQL never checked this
                    // either... left out here since there's nowhere to put it).
                } as any,
            });

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
            const staff = await prismaDb.staff.findFirst({
                where: includeDeleted ? { id } : { id, is_deleted: false },
            });

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
            const staffMembers = await prismaDb.staff.findMany({
                where: includeDeleted ? {} : { is_deleted: false },
                orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
            });

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
            const { id: _, is_deleted, created_by, ...safeUpdates } = staffData as any;

            const result = await prismaDb.staff.updateMany({
                where: { id, is_deleted: false },
                data: { ...safeUpdates, updated_at: new Date() },
            });

            if (result.count === 0) {
                return {
                    status: false,
                    message: "Staff member not found or already deleted",
                    body: null,
                    code: 404
                };
            }
            const updatedStaff = await prismaDb.staff.findUnique({ where: { id } });

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
            const result = await prismaDb.staff.updateMany({
                where: { id, is_deleted: false },
                data: { is_deleted: true, deleted_at: new Date() },
            });

            if (result.count === 0) {
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
            const result = await prismaDb.staff.deleteMany({ where: { id } });

            if (result.count === 0) {
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
            const result = await prismaDb.staff.updateMany({
                where: { id, is_deleted: true },
                data: { is_deleted: false, deleted_at: null, deleted_by: null },
            });

            if (result.count === 0) {
                return {
                    status: false,
                    message: "Staff member not found or not deleted",
                    body: null,
                    code: 404
                };
            }
            const restoredStaff = await prismaDb.staff.findUnique({
                where: { id },
                select: { id: true, first_name: true, last_name: true },
            });

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
            const result = await prismaDb.staff.updateMany({
                where: { id },
                data: { last_salary_payment: paymentDate },
            });

            if (result.count === 0) {
                return {
                    status: false,
                    message: "Staff member not found",
                    body: null,
                    code: 404
                };
            }
            const updated = await prismaDb.staff.findUnique({
                where: { id },
                select: { id: true, last_salary_payment: true },
            });

            return {
                status: true,
                message: "Last salary payment updated successfully",
                body: updated,
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

    static async getStaffWithoutUser(): Promise<StaffModel[]> {
        try {
            // AMBIGUOUS CASE, flagged not guessed: `users.staff` has no FK
            // constraint in the DB, so there's no Prisma relation to filter
            // through (`{ users: { none: {} } }` isn't available). Batches
            // the referenced ids instead of a raw NOT IN subquery.
            const referenced = await prismaDb.users.findMany({
                where: { staff: { not: null } },
                select: { staff: true },
            });
            const referencedIds = referenced.map((u) => u.staff!).filter((v) => v != null);
            const result = await prismaDb.staff.findMany({
                where: referencedIds.length ? { id: { notIn: referencedIds } } : {},
            });
            return result as unknown as StaffModel[];
        } catch (err) {
            console.error('Erreur lors de la récupération des staffs:', err);
            throw err;
        }
    }

    static async generateUniqueEmployeeId() {
        // Récupérer le dernier ID existant
        const result = await prismaDb.staff.findFirst({
            where: { employee_id: { startsWith: 'EMPL' } },
            orderBy: { employee_id: 'desc' },
            select: { employee_id: true },
        });

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

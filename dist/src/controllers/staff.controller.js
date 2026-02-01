"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffController = void 0;
const staff_repository_1 = require("../repository/staff.repository");
class StaffController {
    static async createStaff(req, res) {
        try {
            // Convertir les dates si nécessaire
            const staffData = {
                ...req.body,
                birth_date: req.body.birth_date ? new Date(req.body.birth_date) : null,
                contract_start_date: new Date(req.body.contract_start_date),
                contract_end_date: req.body.contract_end_date ? new Date(req.body.contract_end_date) : null
            };
            const response = await staff_repository_1.StaffRepository.create(staffData);
            res.status(response.code || 500).json(response);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Error processing staff creation",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            });
        }
    }
    static async getStaffById(req, res) {
        const { id } = req.params;
        const { includeDeleted } = req.query;
        const response = await staff_repository_1.StaffRepository.findById(parseInt(id), includeDeleted === 'true');
        res.status(response.code || 500).json(response);
    }
    static async getAllStaff(req, res) {
        const { includeDeleted } = req.query;
        const response = await staff_repository_1.StaffRepository.findAll(includeDeleted === 'true');
        res.status(response.code || 500).json(response);
    }
    static async updateStaff(req, res) {
        const { id } = req.params;
        try {
            // Convertir les dates si nécessaire
            const updateData = {
                ...req.body,
                birth_date: req.body.birth_date ? new Date(req.body.birth_date) : null,
                contract_start_date: req.body.contract_start_date ? new Date(req.body.contract_start_date) : null,
                contract_end_date: req.body.contract_end_date ? new Date(req.body.contract_end_date) : null,
                last_salary_payment: req.body.last_salary_payment ? new Date(req.body.last_salary_payment) : null
            };
            const response = await staff_repository_1.StaffRepository.update(parseInt(id), updateData);
            res.status(response.code || 500).json(response);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Error processing staff update",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            });
        }
    }
    static async softDeleteStaff(req, res) {
        const { id } = req.params;
        const response = await staff_repository_1.StaffRepository.softDelete(parseInt(id));
        res.status(response.code || 500).json(response);
    }
    static async deleteStaff(req, res) {
        const { id } = req.params;
        const response = await staff_repository_1.StaffRepository.delete(parseInt(id));
        res.status(response.code || 500).json(response);
    }
    static async restoreStaff(req, res) {
        const { id } = req.params;
        const response = await staff_repository_1.StaffRepository.restore(parseInt(id));
        res.status(response.code || 500).json(response);
    }
    static async updateSalaryPayment(req, res) {
        const { id } = req.params;
        const { paymentDate } = req.body;
        try {
            const response = await staff_repository_1.StaffRepository.updateLastSalaryPayment(parseInt(id), new Date(paymentDate));
            res.status(response.code || 500).json(response);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Error updating salary payment date",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            });
        }
    }
    static async getStaffWithoutUser(req, res) {
        try {
            const response = await staff_repository_1.StaffRepository.getStaffWithoutUser();
            res.status(200).json(response);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Error retrieving staff without user",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            });
        }
    }
    static async generateUniqueStaffNumber(req, res) {
        try {
            const response = await staff_repository_1.StaffRepository.generateUniqueEmployeeId();
            res.status(200).json(response);
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: "Error generating unique staff number",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            });
        }
    }
}
exports.StaffController = StaffController;

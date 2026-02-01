import { Request, Response } from "express";   
import { StaffRepository } from "../repository/staff.repository";

export class StaffController {
    static async createStaff(req: Request, res: Response) {
        try {
            // Convertir les dates si nécessaire
            const staffData = {
                ...req.body,
                birth_date: req.body.birth_date ? new Date(req.body.birth_date) : null,
                contract_start_date: new Date(req.body.contract_start_date),
                contract_end_date: req.body.contract_end_date ? new Date(req.body.contract_end_date) : null
            };
            
            const response = await StaffRepository.create(staffData);
            res.status(response.code || 500).json(response);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Error processing staff creation",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            });
        }
    }

    static async getStaffById(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { includeDeleted } = req.query;
        const response = await StaffRepository.findById(
            parseInt(id), 
            includeDeleted === 'true'
        );
        res.status(response.code || 500).json(response);
    }

    static async getAllStaff(req: Request, res: Response) {
        const { includeDeleted } = req.query;
        const response = await StaffRepository.findAll(
            includeDeleted === 'true'
        );
        res.status(response.code || 500).json(response);
    }

    static async updateStaff(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        
        try {
            // Convertir les dates si nécessaire
            const updateData = {
                ...req.body,
                birth_date: req.body.birth_date ? new Date(req.body.birth_date) : null,
                contract_start_date: req.body.contract_start_date ? new Date(req.body.contract_start_date) : null,
                contract_end_date: req.body.contract_end_date ? new Date(req.body.contract_end_date) : null,
                last_salary_payment: req.body.last_salary_payment ? new Date(req.body.last_salary_payment) : null
            };
            
            const response = await StaffRepository.update(parseInt(id), updateData);
            res.status(response.code || 500).json(response);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Error processing staff update",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            });
        }
    }

    static async softDeleteStaff(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await StaffRepository.softDelete(parseInt(id));
        res.status(response.code || 500).json(response);
    }

    static async deleteStaff(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await StaffRepository.delete(parseInt(id));
        res.status(response.code || 500).json(response);
    }

    static async restoreStaff(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await StaffRepository.restore(parseInt(id));
        res.status(response.code || 500).json(response);
    }

    static async updateSalaryPayment(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { paymentDate } = req.body;
        
        try {
            const response = await StaffRepository.updateLastSalaryPayment(
                parseInt(id),
                new Date(paymentDate)
            );
            res.status(response.code || 500).json(response);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Error updating salary payment date",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            });
        }
    }

    static async getStaffWithoutUser(req: Request, res: Response) {
        try {
            const response = await StaffRepository.getStaffWithoutUser();   
            res.status(200).json(response);
        } catch (error) {
            res.status(500).json({
                status: false,
                message: "Error retrieving staff without user",
                exception: error instanceof Error ? error.message : error,
                body: null,
                code: 500
            });
        }
    }

    static async generateUniqueStaffNumber(req: Request, res: Response) {
        try {
            const response = await StaffRepository.generateUniqueEmployeeId();
            res.status(200).json(response);
        } catch (error) {
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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractTypeController = void 0;
const contract_type_repository_1 = require("../repository/contract_type_repository");
class ContractTypeController {
    static async create(req, res) {
        const response = await contract_type_repository_1.ContractTypeRepository.create(req.body);
        return res.status(response.code || 500).json(response);
    }
    static async findById(req, res) {
        const { id } = req.params;
        const { includeDeleted } = req.query;
        const response = await contract_type_repository_1.ContractTypeRepository.findById(parseInt(id), includeDeleted === 'true');
        return res.status(response.code || 500).json(response);
    }
    static async findAll(req, res) {
        const { includeDeleted } = req.query;
        const response = await contract_type_repository_1.ContractTypeRepository.findAll(includeDeleted === 'true');
        return res.status(response.code || 500).json(response);
    }
    static async update(req, res) {
        const { id } = req.params;
        const response = await contract_type_repository_1.ContractTypeRepository.update(parseInt(id), req.body);
        return res.status(response.code || 500).json(response);
    }
    static async delete(req, res) {
        const { id } = req.params;
        const response = await contract_type_repository_1.ContractTypeRepository.delete(parseInt(id));
        return res.status(response.code || 500).json(response);
    }
    static async softDelete(req, res) {
        const { id, user_id } = req.params;
        const response = await contract_type_repository_1.ContractTypeRepository.softDelete(parseInt(id), parseInt(user_id));
        return res.status(response.code || 500).json(response);
    }
    static async restore(req, res) {
        const { id } = req.params;
        const response = await contract_type_repository_1.ContractTypeRepository.restore(parseInt(id));
        return res.status(response.code || 500).json(response);
    }
}
exports.ContractTypeController = ContractTypeController;

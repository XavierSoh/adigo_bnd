import { Request, Response } from 'express'; 
import { ContractTypeRepository } from '../repository/contract_type_repository';

export class ContractTypeController {
  static async create(req: Request, res: Response): Promise<any> {
    
    const response = await ContractTypeRepository.create(req.body);
    return res.status(response.code || 500).json(response);
  }

  static async findById(req: Request, res: Response): Promise<any> {
    const { id } = req.params as { id: string };
    const { includeDeleted } = req.query as { includeDeleted?: string };
    const response = await ContractTypeRepository.findById(
      parseInt(id),
      includeDeleted === 'true'
    );
    return res.status(response.code || 500).json(response);
  }

  static async findAll(req: Request, res: Response): Promise<any> {
    const { includeDeleted } = req.query;
    const response = await ContractTypeRepository.findAll(includeDeleted === 'true');
    return res.status(response.code || 500).json(response);
  }

  static async update(req: Request, res: Response): Promise<any> {
    const { id } = req.params as { id: string };
    const response = await ContractTypeRepository.update(parseInt(id), req.body);
    return res.status(response.code || 500).json(response);
  }

  static async delete(req: Request, res: Response): Promise<any> {
    const { id } = req.params as { id: string };
    const response = await ContractTypeRepository.delete(parseInt(id));
    return res.status(response.code || 500).json(response);
  }

  static async softDelete(req: Request, res: Response): Promise<any> {
    const { id, user_id } = req.params as { id: string; user_id: string };
    const response = await ContractTypeRepository.softDelete(parseInt(id), parseInt(user_id));
    return res.status(response.code || 500).json(response);
  }

  static async restore(req: Request, res: Response): Promise<any> {
    const { id } = req.params as { id: string };
    const response = await ContractTypeRepository.restore(parseInt(id));
    return res.status(response.code || 500).json(response);
  }
}

import { Router } from 'express'; 
import { ContractTypeController } from '../controllers/contract_type_controller';

const contractTypeRouter = Router();

contractTypeRouter.post('/', ContractTypeController.create);
contractTypeRouter.get('/', ContractTypeController.findAll);
contractTypeRouter.get('/:id', ContractTypeController.findById);
contractTypeRouter.put('/:id', ContractTypeController.update);
contractTypeRouter.delete('/:id', ContractTypeController.delete);
contractTypeRouter.delete('/:id/:user_id/soft', ContractTypeController.softDelete);
contractTypeRouter.patch('/:id/restore', ContractTypeController.restore);

export default contractTypeRouter;

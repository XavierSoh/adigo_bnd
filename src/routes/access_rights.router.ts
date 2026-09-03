import { Router } from "express"
 
import { AccessRightsController } from "../controllers/access_rights.controller";

const accessRightsRouter = Router({ mergeParams: true });

accessRightsRouter.get('/', AccessRightsController.getAll)
 

export default accessRightsRouter;
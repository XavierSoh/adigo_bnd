import { Router } from "express"
 
import { json } from "body-parser";
import pgpDb from "../config/pgdb"; 
import * as tbl from "../utils/table_names";
import { AccessRightsController } from "../controllers/access_rights.controller";

const accessRightsRouter = Router({ mergeParams: true });

accessRightsRouter.get('/', AccessRightsController.getAll)
 

export default accessRightsRouter;
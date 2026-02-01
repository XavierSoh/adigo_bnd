    import { Router } from 'express'; 
    import  ProfileController  from '../controllers/profile.controller';


    const profilerRouter = Router();
    
 
    profilerRouter.get('/', ProfileController.getProfiles);
    profilerRouter.post('/', ProfileController.createProfile);
    profilerRouter.put('/:id', ProfileController.updateProfile);
    profilerRouter.delete('/:id', ProfileController.deleteProfile);
    profilerRouter.delete('/:profileId/:userId', ProfileController.softDeleteProfile);
    profilerRouter.patch('/restore/:profileId/:userId', ProfileController.restoreProfile);
 
    
  
    


export default profilerRouter;
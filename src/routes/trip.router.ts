import { Router } from 'express';
import { TripController } from '../controllers/trip.controller';

const tripRouter = Router();

// Specialized routes (must come BEFORE parameterized routes like /:id)
tripRouter.get('/search', TripController.searchByRoute);
tripRouter.get('/agency/:agencyId', TripController.getByAgency);

// CRUD routes
tripRouter.post('/', TripController.create);
tripRouter.get('/:id', TripController.getById);
tripRouter.put('/:id', TripController.update);
tripRouter.delete('/:id', TripController.delete);

// Specialized routes with :id parameter
tripRouter.patch('/:id/soft-delete', TripController.softDelete);
tripRouter.patch('/:id/restore', TripController.restore);

export default tripRouter;
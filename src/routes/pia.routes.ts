import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { piaApplicationController } from '../controllers/pia-application.controller';

const router = Router();
router.use(authenticate);
router.use(authorize('USER'));

// Masters (read-only lookups needed by the application form)
router.get('/masters/ports',        piaApplicationController.getMasterPorts);
router.get('/masters/minerals',     piaApplicationController.getMasterMinerals);
router.get('/masters/eia-offices',  piaApplicationController.getMasterEIAOffices);

// Applications
router.get('/applications',           piaApplicationController.list);
router.post('/applications',          piaApplicationController.create);
router.get('/applications/:id',       piaApplicationController.getById);
router.put('/applications/:id',       piaApplicationController.update);
router.put('/applications/:id/part-ii', piaApplicationController.updatePartII);

export default router;

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { piaApplicationController } from '../controllers/pia-application.controller';

const router = Router();
router.use(authenticate);
router.use(authorize('USER'));

router.get('/applications',      piaApplicationController.list);
router.post('/applications',     piaApplicationController.create);
router.get('/applications/:id',  piaApplicationController.getById);
router.put('/applications/:id',  piaApplicationController.update);

export default router;

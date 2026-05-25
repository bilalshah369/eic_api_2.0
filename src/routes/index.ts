import { Router } from 'express';
import authRoutes from './auth.routes';
import signupRoutes from './signup.routes';
import lgdRoutes from './lgd.routes';
import adminRoutes from './admin.routes';
import portalRoutes from './portal.routes';
import piaRoutes from './pia.routes';
import dbSchemaRoutes from './dbschema.routes';
import { lgdController } from '../controllers/lgd.controller';

const router = Router();

router.use('/auth',               authRoutes);
router.use('/signup',             signupRoutes);
router.use('/lgd',                lgdRoutes);
router.get('/registration-types', lgdController.registrationTypes);
router.use('/admin',              adminRoutes);
router.use('/portal',             portalRoutes);
router.use('/pia',                piaRoutes);
router.use('/db-schema',          dbSchemaRoutes);

export default router;

import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import portalRoutes from './portal.routes';
import piaRoutes from './pia.routes';
import dbSchemaRoutes from './dbschema.routes';

const router = Router();

router.use('/auth',      authRoutes);
router.use('/admin',     adminRoutes);
router.use('/portal',    portalRoutes);
router.use('/pia',       piaRoutes);
router.use('/db-schema', dbSchemaRoutes);

export default router;

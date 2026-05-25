import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { piaApplicationController } from '../controllers/pia-application.controller';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();
router.use(authenticate);
router.use(authorize('USER'));

// Masters (read-only lookups needed by the application form)
router.get('/masters/ports',               piaApplicationController.getMasterPorts);
router.get('/masters/minerals',            piaApplicationController.getMasterMinerals);
router.get('/masters/eia-offices',         piaApplicationController.getMasterEIAOffices);
router.get('/masters/document-checklist',  piaApplicationController.getMasterDocumentChecklist);
router.get('/masters/fee-config',          piaApplicationController.getMasterFeeConfig);

// Applications
router.get('/applications',           piaApplicationController.list);
router.post('/applications',          piaApplicationController.create);
router.get('/applications/:id',       piaApplicationController.getById);
router.put('/applications/:id',       piaApplicationController.update);
router.put('/applications/:id/part-ii', piaApplicationController.updatePartII);
router.delete('/applications/:id',    piaApplicationController.deleteApplication);

// Documents
router.get('/applications/:id/documents',          piaApplicationController.listDocuments);
router.post('/applications/:id/documents',         uploadMiddleware, piaApplicationController.uploadDocument);
router.delete('/applications/:id/documents/:docId', piaApplicationController.deleteDocument);

export default router;

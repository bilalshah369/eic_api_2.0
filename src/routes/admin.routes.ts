import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { officeController } from '../controllers/office.controller';
import { officerController } from '../controllers/officer.controller';
import { piaMasterController } from '../controllers/pia-master.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/stats',         adminController.getStats);
router.get('/audit-logs',    adminController.getAuditLogs);
router.get('/users',         adminController.getUsers);

router.get('/offices/all',   officeController.getAll);
router.get('/offices',       officeController.list);
router.post('/offices',      officeController.create);
router.put('/offices/:id',              officeController.update);
router.delete('/offices/:id',           officeController.delete);
router.post('/offices/:id/reset-login', officeController.resetLogin);

router.get('/certificate-products',             officerController.getProducts);
router.post('/certificate-products',            officerController.createProduct);
router.put('/certificate-products/:id',         officerController.updateProduct);
router.delete('/certificate-products/:id',      officerController.deleteProduct);
router.get('/officers',                         officerController.list);
router.get('/officers/:id',                     officerController.getById);
router.post('/officers',                        officerController.create);
router.put('/officers/:id',                     officerController.update);
router.delete('/officers/:id',                  officerController.delete);
router.put('/officers/:id/assign-offices',       officerController.assignOffices);
router.put('/officers/:id/assign-products',      officerController.assignProducts);
router.post('/officers/:id/reset-login',         officerController.resetLogin);

// ── PIA Masters ────────────────────────────────────────────────
router.get('/pia/minerals',                    piaMasterController.listMinerals);
router.post('/pia/minerals',                   piaMasterController.createMineral);
router.put('/pia/minerals/:id',                piaMasterController.updateMineral);
router.delete('/pia/minerals/:id',             piaMasterController.deleteMineral);

router.get('/pia/ports',                       piaMasterController.listPorts);
router.post('/pia/ports',                      piaMasterController.createPort);
router.put('/pia/ports/:id',                   piaMasterController.updatePort);
router.delete('/pia/ports/:id',                piaMasterController.deletePort);

router.get('/pia/fee-config',                  piaMasterController.listFeeConfig);
router.post('/pia/fee-config',                 piaMasterController.upsertFeeConfig);

router.get('/pia/document-checklist',          piaMasterController.listDocumentChecklist);
router.post('/pia/document-checklist',         piaMasterController.createDocumentChecklist);
router.put('/pia/document-checklist/:id',      piaMasterController.updateDocumentChecklist);
router.delete('/pia/document-checklist/:id',   piaMasterController.deleteDocumentChecklist);

export default router;

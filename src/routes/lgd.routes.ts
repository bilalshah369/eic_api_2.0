import { Router } from 'express';
import { lgdController } from '../controllers/lgd.controller';

const router = Router();

router.get('/states',                    lgdController.states);
router.get('/districts/:stateId',        lgdController.districts);
router.get('/sub-districts/:districtId', lgdController.subDistricts);

export default router;

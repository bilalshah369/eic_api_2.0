import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';

const FALLBACK_REG_TYPES = [
  { code: 'ESTABLISHMENT',             name: 'Establishment' },
  { code: 'MERCHANT_EXPORTER',         name: 'Merchant Exporter' },
  { code: 'COLD_STORAGE_ICE_PLANT',    name: 'Cold Storage / Ice Plant' },
  { code: 'PRE_PROCESSING_CENTRE',     name: 'Pre-processing Centre' },
  { code: 'PRIVATE_INSPECTION_AGENCY', name: 'Private Inspection Agency' },
];

export const lgdController = {
  async states(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await prisma.lGDState.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true },
      });
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async districts(req: Request, res: Response, next: NextFunction) {
    try {
      const stateId = parseInt(req.params.stateId, 10);
      const data = await prisma.lGDDistrict.findMany({
        where: { stateId, isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async subDistricts(req: Request, res: Response, next: NextFunction) {
    try {
      const districtId = parseInt(req.params.districtId, 10);
      const data = await prisma.lGDSubDistrict.findMany({
        where: { districtId, isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  },

  async registrationTypes(_req: Request, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, FALLBACK_REG_TYPES);
    } catch (err) {
      next(err);
    }
  },
};

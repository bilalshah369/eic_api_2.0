import { Request, Response, NextFunction } from 'express';
import { officeService } from '../services/office.service';
import { auditService } from '../services/audit.service';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../types';

const ip = (req: Request) =>
  (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
  req.socket.remoteAddress ||
  'unknown';

export const officeController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit  = Math.min(Number(req.query.limit)  || 20, 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const search = req.query.search as string | undefined;
      const type   = req.query.type   as string | undefined;

      const data = await officeService.list({ limit, offset, search, type });
      sendSuccess(res, data, 'Offices fetched');
    } catch (err) {
      next(err);
    }
  },

  async getAll(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const offices = await officeService.getAll();
      sendSuccess(res, offices, 'Offices fetched');
    } catch (err) {
      next(err);
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await officeService.create(req.body);
      const office = result.office as { name?: string; code?: string };
      await auditService.log({
        userId: req.user!.userId, userEmail: req.user!.email,
        action: 'CREATE',
        description: `Office created: ${office.name} (${office.code})${result.credentials ? ' — login created' : ''}`,
        ipAddress: ip(req),
      });
      sendSuccess(res, result, 'Office created', 201);
    } catch (err) {
      next(err);
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const office = await officeService.update(id, req.body);
      await auditService.log({
        userId: req.user!.userId, userEmail: req.user!.email,
        action: 'UPDATE', description: `Office updated: ${office.name} (${office.code})`,
        ipAddress: ip(req),
      });
      sendSuccess(res, office, 'Office updated');
    } catch (err) {
      next(err);
    }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await officeService.delete(req.params.id);
      await auditService.log({
        userId: req.user!.userId, userEmail: req.user!.email,
        action: 'DELETE', description: `Office deleted: ${req.params.id}`,
        ipAddress: ip(req),
      });
      sendSuccess(res, null, 'Office deleted');
    } catch (err) { next(err); }
  },

  async resetLogin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const credentials = await officeService.resetLogin(req.params.id);
      await auditService.log({
        userId: req.user!.userId, userEmail: req.user!.email,
        action: 'UPDATE', description: `Office login reset: ${credentials.email}`,
        ipAddress: ip(req),
      });
      sendSuccess(res, credentials, 'Login credentials reset');
    } catch (err) {
      next(err);
    }
  },
};

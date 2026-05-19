import { Request, Response, NextFunction } from 'express';
import { officerService } from '../services/officer.service';
import { auditService } from '../services/audit.service';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../types';

const ip = (req: Request) =>
  (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
  req.socket.remoteAddress || 'unknown';

export const officerController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit  = Math.min(Number(req.query.limit)  || 20, 100);
      const offset = Math.max(Number(req.query.offset) || 0,  0);
      const search = req.query.search as string | undefined;
      const data = await officerService.list({ limit, offset, search });
      sendSuccess(res, data, 'Officers fetched');
    } catch (err) { next(err); }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const officer = await officerService.getById(req.params.id);
      sendSuccess(res, officer, 'Officer fetched');
    } catch (err) { next(err); }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await officerService.create(req.body);
      const officer = result.officer as { name?: string };
      await auditService.log({
        userId: req.user!.userId, userEmail: req.user!.email,
        action: 'CREATE',
        description: `Officer created: ${officer.name}${result.credentials ? ' — login created' : ''}`,
        ipAddress: ip(req),
      });
      sendSuccess(res, result, 'Officer created', 201);
    } catch (err) { next(err); }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await officerService.delete(req.params.id);
      await auditService.log({
        userId: req.user!.userId, userEmail: req.user!.email,
        action: 'DELETE', description: `Officer deleted: ${req.params.id}`,
        ipAddress: ip(req),
      });
      sendSuccess(res, null, 'Officer deleted');
    } catch (err) { next(err); }
  },

  async resetLogin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const credentials = await officerService.resetLogin(req.params.id);
      await auditService.log({
        userId: req.user!.userId, userEmail: req.user!.email,
        action: 'UPDATE', description: `Officer login reset: ${credentials.email}`,
        ipAddress: ip(req),
      });
      sendSuccess(res, credentials, 'Login credentials reset');
    } catch (err) { next(err); }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const officer = await officerService.update(req.params.id, req.body);
      await auditService.log({
        userId: req.user!.userId, userEmail: req.user!.email,
        action: 'UPDATE', description: `Officer updated: ${officer.name}`,
        ipAddress: ip(req),
      });
      sendSuccess(res, officer, 'Officer updated');
    } catch (err) { next(err); }
  },

  async assignOffices(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { officeIds } = req.body as { officeIds: string[] };
      const officer = await officerService.assignOffices(req.params.id, officeIds ?? []);
      await auditService.log({
        userId: req.user!.userId, userEmail: req.user!.email,
        action: 'UPDATE', description: `Officer offices assigned: ${officer.name} (${officeIds?.length ?? 0} offices)`,
        ipAddress: ip(req),
      });
      sendSuccess(res, officer, 'Offices assigned');
    } catch (err) { next(err); }
  },

  async assignProducts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { productIds } = req.body as { productIds: string[] };
      const officer = await officerService.assignProducts(req.params.id, productIds ?? []);
      await auditService.log({
        userId: req.user!.userId, userEmail: req.user!.email,
        action: 'UPDATE', description: `Officer products assigned: ${officer.name} (${productIds?.length ?? 0} products)`,
        ipAddress: ip(req),
      });
      sendSuccess(res, officer, 'Products assigned');
    } catch (err) { next(err); }
  },

  async getProducts(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const products = await officerService.getProducts();
      sendSuccess(res, products, 'Products fetched');
    } catch (err) { next(err); }
  },

  async createProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const product = await officerService.createProduct(req.body);
      await auditService.log({
        userId: req.user!.userId, userEmail: req.user!.email,
        action: 'CREATE', description: `Product created: ${product.name}`,
        ipAddress: ip(req),
      });
      sendSuccess(res, product, 'Product created', 201);
    } catch (err) { next(err); }
  },

  async updateProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const product = await officerService.updateProduct(req.params.id, req.body);
      await auditService.log({
        userId: req.user!.userId, userEmail: req.user!.email,
        action: 'UPDATE', description: `Product updated: ${product.name}`,
        ipAddress: ip(req),
      });
      sendSuccess(res, product, 'Product updated');
    } catch (err) { next(err); }
  },

  async deleteProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await officerService.deleteProduct(req.params.id);
      await auditService.log({
        userId: req.user!.userId, userEmail: req.user!.email,
        action: 'DELETE', description: `Product deleted: ${req.params.id}`,
        ipAddress: ip(req),
      });
      sendSuccess(res, null, 'Product deleted');
    } catch (err) { next(err); }
  },
};

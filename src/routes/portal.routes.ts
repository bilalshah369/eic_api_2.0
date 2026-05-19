import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../types';
import { applicationService } from '../services/application.service';
import { officeService } from '../services/office.service';
import { officerService } from '../services/officer.service';

const router = Router();
router.use(authenticate);

// ── EIA / Sub-EIA office ─────────────────────────────────────────────────────

router.get('/office/me',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: {
          office: {
            include: {
              parent: { select: { id: true, name: true, code: true } },
              officers: {
                include: { officer: { select: { id: true, name: true, designation: true, mobile: true, email: true, isActive: true } } },
              },
            },
          },
        },
      });
      sendSuccess(res, user?.office ?? null, 'Office data fetched');
    } catch (err) { next(err); }
  }
);

// Applications for the office
router.get('/applications',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { officeId: true } });
      if (!user?.officeId) { sendSuccess(res, { applications: [], total: 0, stats: { total: 0, pending: 0, deficient: 0, recognised: 0 } }, 'No office linked'); return; }

      const limit  = Math.min(Number(req.query.limit)  || 20, 100);
      const offset = Math.max(Number(req.query.offset) || 0,  0);
      const search = req.query.search as string | undefined;
      const type   = req.query.type   as string | undefined;
      const status = req.query.status as string | undefined;
      const tab    = (req.query.tab as string | undefined) as 'pending' | 'all' | undefined;

      const [list, stats] = await Promise.all([
        applicationService.getForOffice(user.officeId, { limit, offset, search, type, status, tab }),
        applicationService.getStats(user.officeId),
      ]);

      sendSuccess(res, { ...list, stats }, 'Applications fetched');
    } catch (err) { next(err); }
  }
);

// Update application status
router.put('/applications/:id/status',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status, remarks } = req.body;
      const app = await applicationService.updateStatus(req.params.id, status, remarks);
      sendSuccess(res, app, 'Status updated');
    } catch (err) { next(err); }
  }
);

// ── Sub-office management ────────────────────────────────────────────────────

router.get('/sub-offices',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { officeId: true } });
      if (!user?.officeId) { sendSuccess(res, [], 'No office linked'); return; }
      const subOffices = await prisma.office.findMany({
        where: { parentId: user.officeId },
        include: {
          user: { select: { id: true, email: true } },
          _count: { select: { officers: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      sendSuccess(res, subOffices, 'Sub-offices fetched');
    } catch (err) { next(err); }
  }
);

router.post('/sub-offices',
  authorize('EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { officeId: true } });
      if (!user?.officeId) { res.status(400).json({ success: false, message: 'No office linked' }); return; }
      const result = await officeService.create({ ...req.body, type: 'SUB_EIA', parentId: user.officeId });
      sendSuccess(res, result, 'Sub-office created');
    } catch (err) { next(err); }
  }
);

router.put('/sub-offices/:id',
  authorize('EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const office = await officeService.update(req.params.id, req.body);
      sendSuccess(res, office, 'Sub-office updated');
    } catch (err) { next(err); }
  }
);

router.post('/sub-offices/:id/reset-login',
  authorize('EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const credentials = await officeService.resetLogin(req.params.id);
      sendSuccess(res, credentials, 'Login reset');
    } catch (err) { next(err); }
  }
);

router.delete('/sub-offices/:id',
  authorize('EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await officeService.delete(req.params.id);
      sendSuccess(res, null, 'Sub-office deleted');
    } catch (err) { next(err); }
  }
);

// ── Officer management (for EIA / Sub-EIA) ───────────────────────────────────

router.get('/officers',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { officeId: true } });
      if (!user?.officeId) { sendSuccess(res, [], 'No office linked'); return; }
      const rows = await prisma.officerOffice.findMany({
        where: { officeId: user.officeId },
        include: {
          officer: {
            include: {
              user: { select: { id: true, email: true } },
              products: { include: { product: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { officer: { createdAt: 'desc' } },
      });
      sendSuccess(res, rows.map(r => r.officer), 'Officers fetched');
    } catch (err) { next(err); }
  }
);

router.post('/officers',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { officeId: true } });
      if (!user?.officeId) { res.status(400).json({ success: false, message: 'No office linked' }); return; }
      const result = await officerService.create(req.body);
      await prisma.officerOffice.create({ data: { officerId: result.officer.id, officeId: user.officeId } });
      sendSuccess(res, result, 'Officer created');
    } catch (err) { next(err); }
  }
);

router.put('/officers/:id',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const officer = await officerService.update(req.params.id, req.body);
      sendSuccess(res, officer, 'Officer updated');
    } catch (err) { next(err); }
  }
);

router.post('/officers/:id/reset-login',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const credentials = await officerService.resetLogin(req.params.id);
      sendSuccess(res, credentials, 'Login reset');
    } catch (err) { next(err); }
  }
);

router.delete('/officers/:id',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await officerService.delete(req.params.id);
      sendSuccess(res, null, 'Officer deleted');
    } catch (err) { next(err); }
  }
);

router.get('/officers/:id',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const officer = await officerService.getById(req.params.id);
      sendSuccess(res, officer, 'Officer fetched');
    } catch (err) { next(err); }
  }
);

router.put('/officers/:id/assign-offices',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { officeIds } = req.body as { officeIds: string[] };
      const officer = await officerService.assignOffices(req.params.id, officeIds ?? []);
      sendSuccess(res, officer, 'Offices assigned');
    } catch (err) { next(err); }
  }
);

router.put('/officers/:id/assign-products',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { productIds } = req.body as { productIds: string[] };
      const officer = await officerService.assignProducts(req.params.id, productIds ?? []);
      sendSuccess(res, officer, 'Products assigned');
    } catch (err) { next(err); }
  }
);

// EIA's own offices + sub-offices (for officer assignment)
router.get('/my-offices',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { officeId: true } });
      if (!user?.officeId) { sendSuccess(res, [], 'No office linked'); return; }
      const [own, subs] = await Promise.all([
        prisma.office.findUnique({ where: { id: user.officeId }, select: { id: true, name: true, code: true, type: true } }),
        prisma.office.findMany({ where: { parentId: user.officeId }, select: { id: true, name: true, code: true, type: true }, orderBy: { name: 'asc' } }),
      ]);
      sendSuccess(res, [own, ...subs].filter(Boolean), 'Offices fetched');
    } catch (err) { next(err); }
  }
);

// Certificate products for officer assignment
router.get('/certificate-products',
  authorize('EIA_ADMIN', 'SUB_EIA_ADMIN'),
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const products = await officerService.getProducts();
      sendSuccess(res, products, 'Products fetched');
    } catch (err) { next(err); }
  }
);

// ── Officer portal ───────────────────────────────────────────────────────────

router.get('/officer/me',
  authorize('OFFICER'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        include: {
          officer: {
            include: {
              offices: { include: { office: { select: { id: true, name: true, code: true, type: true } } } },
              products: { include: { product: { select: { id: true, name: true, category: true } } } },
            },
          },
        },
      });
      sendSuccess(res, user?.officer ?? null, 'Officer profile fetched');
    } catch (err) { next(err); }
  }
);

export default router;

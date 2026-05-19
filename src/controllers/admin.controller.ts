import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../types';

export const adminController = {
  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const [totalUsers, totalAdmins, totalAuditLogs, totalOffices] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } }),
        prisma.auditLog.count(),
        prisma.office.count(),
      ]);

      sendSuccess(res, {
        totalUsers,
        totalAdmins,
        totalApplications: 0,
        totalOffices,
        totalAuditLogs,
        userType: req.user!.role,
      }, 'Stats fetched');
    } catch (err) {
      next(err);
    }
  },

  async getAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit  = Math.min(Number(req.query.limit)  || 20, 100);
      const offset = Math.max(Number(req.query.offset) || 0,  0);
      const action = req.query.action as string | undefined;
      const search = req.query.search as string | undefined;

      const where = {
        ...(action && { action }),
        ...(search && {
          OR: [
            { userName:  { contains: search, mode: 'insensitive' as const } },
            { userEmail: { contains: search, mode: 'insensitive' as const } },
            { description:{ contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.auditLog.count({ where }),
      ]);

      sendSuccess(res, { logs, total, limit, offset }, 'Audit logs fetched');
    } catch (err) {
      next(err);
    }
  },

  async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const limit  = Math.min(Number(req.query.limit)  || 20, 100);
      const offset = Math.max(Number(req.query.offset) || 0,  0);
      const search = req.query.search as string | undefined;

      const where = search
        ? {
            OR: [
              { name:  { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: { id: true, name: true, email: true, mobile: true, role: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.user.count({ where }),
      ]);

      sendSuccess(res, { users, total, limit, offset }, 'Users fetched');
    } catch (err) {
      next(err);
    }
  },
};

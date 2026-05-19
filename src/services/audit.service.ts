import { prisma } from '../config/prisma';

interface AuditEntry {
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  description?: string;
  ipAddress?: string;
}

export const auditService = {
  async log(entry: AuditEntry) {
    try {
      await prisma.auditLog.create({ data: entry });
    } catch {
      // audit failures must never crash the main flow
    }
  },
};

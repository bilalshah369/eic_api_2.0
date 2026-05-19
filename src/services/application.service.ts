import { prisma } from '../config/prisma';
import { ApplicationStatus, ApplicationType } from '@prisma/client';

export { ApplicationStatus, ApplicationType };

function financialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based
  // FY starts April; if Apr-Dec use year/year+1, if Jan-Mar use year-1/year
  const fyStart = month >= 4 ? year : year - 1;
  const fyEnd = fyStart + 1;
  return `${String(fyStart).slice(2)}${String(fyEnd).slice(2)}`;
}

async function generateAppNo(type: ApplicationType): Promise<string> {
  const prefix = type === 'ESTABLISHMENT' ? 'ESTAPP' : 'PIAAPP';
  const fy = financialYear();
  const count = await prisma.application.count({
    where: { appNo: { startsWith: `${prefix}/${fy}/` } },
  });
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}/${fy}/${seq}`;
}

const PENDING_STATUSES: ApplicationStatus[] = ['SUBMITTED', 'DEFICIENCY_RESPONDED'];

export const applicationService = {
  async getForOffice(officeId: string, params: {
    limit?: number; offset?: number;
    search?: string; type?: string; status?: string; tab?: 'pending' | 'all';
  }) {
    const where: Record<string, unknown> = { officeId };

    if (params.tab === 'pending') {
      where.status = { in: PENDING_STATUSES };
    } else if (params.status && params.status !== 'all') {
      where.status = params.status;
    }

    if (params.type && params.type !== 'all') {
      where.type = params.type;
    }

    if (params.search) {
      where.OR = [
        { appNo:        { contains: params.search, mode: 'insensitive' } },
        { organisation: { contains: params.search, mode: 'insensitive' } },
        { applicantName:{ contains: params.search, mode: 'insensitive' } },
      ];
    }

    const limit  = params.limit  ?? 20;
    const offset = params.offset ?? 0;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true, appNo: true, type: true, status: true,
          organisation: true, applicantName: true,
          submittedAt: true, createdAt: true,
        },
      }),
      prisma.application.count({ where }),
    ]);

    return { applications, total, limit, offset };
  },

  async getStats(officeId: string) {
    const [total, pending, deficient, recognised] = await Promise.all([
      prisma.application.count({ where: { officeId, status: { not: 'DRAFT' } } }),
      prisma.application.count({ where: { officeId, status: { in: PENDING_STATUSES } } }),
      prisma.application.count({ where: { officeId, status: 'DEFICIENT' } }),
      prisma.application.count({ where: { officeId, status: { in: ['APPROVED', 'COA_ISSUED'] } } }),
    ]);
    return { total, pending, deficient, recognised };
  },

  async create(data: {
    type: ApplicationType; organisation: string; applicantName: string;
    officeId?: string; userId?: string; submittedAt?: Date;
  }) {
    const appNo = await generateAppNo(data.type);
    return prisma.application.create({
      data: { ...data, appNo, status: 'SUBMITTED', submittedAt: data.submittedAt ?? new Date() },
    });
  },

  async updateStatus(id: string, status: ApplicationStatus, remarks?: string) {
    return prisma.application.update({ where: { id }, data: { status, remarks } });
  },
};

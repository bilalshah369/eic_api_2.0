import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/error.middleware';

export interface CreateOfficeDto {
  name: string;
  code: string;
  type: 'EIC' | 'EIA' | 'SUB_EIA';
  parentId?: string | null;
  address?: string;
  state?: string;
  district?: string;
  subDistrict?: string;
  city?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  hasLab?: boolean;
}

export interface LoginCredentials {
  email: string;
  tempPassword: string;
  role: string;
}

const PARENT_SELECT = { select: { id: true, name: true, code: true } };

function generatePassword(): string {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$!';
  const all = upper + lower + digits + special;
  let pwd = upper[Math.floor(Math.random() * upper.length)]
    + digits[Math.floor(Math.random() * digits.length)]
    + special[Math.floor(Math.random() * special.length)];
  for (let i = 0; i < 7; i++) pwd += all[Math.floor(Math.random() * all.length)];
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

export const officeService = {
  async list(params: { limit: number; offset: number; search?: string; type?: string }) {
    const where: Record<string, unknown> = {};
    if (params.type) where.type = params.type;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [offices, total] = await Promise.all([
      prisma.office.findMany({
        where,
        include: { parent: PARENT_SELECT, user: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'asc' },
        take: params.limit,
        skip: params.offset,
      }),
      prisma.office.count({ where }),
    ]);

    return { offices, total, limit: params.limit, offset: params.offset };
  },

  async create(data: CreateOfficeDto): Promise<{ office: object; credentials?: LoginCredentials }> {
    const code = data.code.toUpperCase().trim();
    const existing = await prisma.office.findUnique({ where: { code } });
    if (existing) throw new AppError('Office code already in use', 409);

    const office = await prisma.office.create({
      data: { ...data, code },
      include: { parent: PARENT_SELECT },
    });

    // Auto-create login for EIA and SUB_EIA offices
    if ((data.type === 'EIA' || data.type === 'SUB_EIA') && data.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
      if (!emailTaken) {
        const tempPassword = generatePassword();
        const hashed = await bcrypt.hash(tempPassword, 10);
        const role = data.type === 'EIA' ? 'EIA_ADMIN' : 'SUB_EIA_ADMIN';
        await prisma.user.create({
          data: { name: office.name, email: data.email, password: hashed, role, officeId: office.id },
        });
        return { office, credentials: { email: data.email, tempPassword, role } };
      }
    }

    return { office };
  },

  async update(id: string, data: Partial<CreateOfficeDto> & { isActive?: boolean }) {
    const existing = await prisma.office.findUnique({ where: { id } });
    if (!existing) throw new AppError('Office not found', 404);

    const update: Record<string, unknown> = { ...data };
    if (data.code) {
      const code = data.code.toUpperCase().trim();
      if (code !== existing.code) {
        const taken = await prisma.office.findUnique({ where: { code } });
        if (taken) throw new AppError('Office code already in use', 409);
      }
      update.code = code;
    }

    return prisma.office.update({
      where: { id },
      data: update,
      include: { parent: PARENT_SELECT },
    });
  },

  async resetLogin(id: string): Promise<LoginCredentials> {
    const office = await prisma.office.findUnique({ where: { id }, include: { user: true } });
    if (!office) throw new AppError('Office not found', 404);
    if (office.type === 'EIC') throw new AppError('EIC office does not have a portal login', 400);
    if (!office.email) throw new AppError('Office has no email — add an email first', 400);

    const tempPassword = generatePassword();
    const hashed = await bcrypt.hash(tempPassword, 10);
    const role = office.type === 'EIA' ? 'EIA_ADMIN' : 'SUB_EIA_ADMIN';

    if (office.user) {
      await prisma.user.update({ where: { id: office.user.id }, data: { password: hashed } });
    } else {
      const emailTaken = await prisma.user.findUnique({ where: { email: office.email } });
      if (emailTaken) throw new AppError('Email already used by another account', 409);
      await prisma.user.create({
        data: { name: office.name, email: office.email, password: hashed, role, officeId: office.id },
      });
    }

    return { email: office.email, tempPassword, role };
  },

  async delete(id: string) {
    const office = await prisma.office.findUnique({ where: { id }, include: { user: true } });
    if (!office) throw new AppError('Office not found', 404);
    if (office.user) {
      await prisma.user.update({ where: { id: office.user.id }, data: { officeId: null } });
    }
    await prisma.office.delete({ where: { id } });
  },

  async getAll() {
    return prisma.office.findMany({
      select: { id: true, name: true, code: true, type: true },
      orderBy: { name: 'asc' },
    });
  },
};

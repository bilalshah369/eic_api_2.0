import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/error.middleware';
import { LoginCredentials } from './office.service';

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

export interface CreateOfficerDto {
  name: string;
  qualification: string;
  designation: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  telephone?: string;
  mobile?: string;
  email?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
}

const OFFICER_SELECT = {
  id: true, name: true, qualification: true, designation: true,
  address: true, city: true, state: true, pincode: true,
  telephone: true, mobile: true, email: true, gender: true,
  isActive: true, createdAt: true,
  _count: { select: { offices: true, products: true } },
};

export const officerService = {
  async list(params: { limit: number; offset: number; search?: string }) {
    const where = params.search
      ? {
          OR: [
            { name:        { contains: params.search, mode: 'insensitive' as const } },
            { designation: { contains: params.search, mode: 'insensitive' as const } },
            { email:       { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [officers, total] = await Promise.all([
      prisma.officer.findMany({
        where,
        select: OFFICER_SELECT,
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip: params.offset,
      }),
      prisma.officer.count({ where }),
    ]);

    return { officers, total, limit: params.limit, offset: params.offset };
  },

  async getById(id: string) {
    const officer = await prisma.officer.findUnique({
      where: { id },
      include: {
        offices: { include: { office: { select: { id: true, name: true, code: true, type: true } } } },
        products: { include: { product: { select: { id: true, name: true, category: true } } } },
      },
    });
    if (!officer) throw new AppError('Officer not found', 404);
    return officer;
  },

  async create(data: CreateOfficerDto): Promise<{ officer: { id: string; [key: string]: unknown }; credentials?: LoginCredentials }> {
    const officer = await prisma.officer.create({ data, select: { ...OFFICER_SELECT, id: true } });

    if (data.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
      if (!emailTaken) {
        const tempPassword = generatePassword();
        const hashed = await bcrypt.hash(tempPassword, 10);
        await prisma.user.create({
          data: { name: officer.name, email: data.email, password: hashed, role: 'OFFICER', officerId: officer.id },
        });
        return { officer, credentials: { email: data.email, tempPassword, role: 'OFFICER' } };
      }
    }

    return { officer };
  },

  async update(id: string, data: Partial<CreateOfficerDto> & { isActive?: boolean }) {
    const existing = await prisma.officer.findUnique({ where: { id } });
    if (!existing) throw new AppError('Officer not found', 404);
    return prisma.officer.update({ where: { id }, data, select: OFFICER_SELECT });
  },

  async resetLogin(id: string): Promise<LoginCredentials> {
    const officer = await prisma.officer.findUnique({ where: { id }, include: { user: true } });
    if (!officer) throw new AppError('Officer not found', 404);
    if (!officer.email) throw new AppError('Officer has no email — add an email first', 400);

    const tempPassword = generatePassword();
    const hashed = await bcrypt.hash(tempPassword, 10);

    if (officer.user) {
      await prisma.user.update({ where: { id: officer.user.id }, data: { password: hashed } });
    } else {
      const emailTaken = await prisma.user.findUnique({ where: { email: officer.email } });
      if (emailTaken) throw new AppError('Email already used by another account', 409);
      await prisma.user.create({
        data: { name: officer.name, email: officer.email, password: hashed, role: 'OFFICER', officerId: officer.id },
      });
    }

    return { email: officer.email, tempPassword, role: 'OFFICER' };
  },

  async assignOffices(id: string, officeIds: string[]) {
    const existing = await prisma.officer.findUnique({ where: { id } });
    if (!existing) throw new AppError('Officer not found', 404);

    await prisma.$transaction([
      prisma.officerOffice.deleteMany({ where: { officerId: id } }),
      ...(officeIds.length
        ? [prisma.officerOffice.createMany({ data: officeIds.map(officeId => ({ officerId: id, officeId })) })]
        : []),
    ]);

    return officerService.getById(id);
  },

  async assignProducts(id: string, productIds: string[]) {
    const existing = await prisma.officer.findUnique({ where: { id } });
    if (!existing) throw new AppError('Officer not found', 404);

    await prisma.$transaction([
      prisma.officerProduct.deleteMany({ where: { officerId: id } }),
      ...(productIds.length
        ? [prisma.officerProduct.createMany({ data: productIds.map(productId => ({ officerId: id, productId })) })]
        : []),
    ]);

    return officerService.getById(id);
  },

  async delete(id: string) {
    const officer = await prisma.officer.findUnique({ where: { id }, include: { user: true } });
    if (!officer) throw new AppError('Officer not found', 404);
    if (officer.user) {
      await prisma.user.update({ where: { id: officer.user.id }, data: { officerId: null } });
    }
    await prisma.officer.delete({ where: { id } });
  },

  async getProducts() {
    return prisma.certificateProduct.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }] });
  },

  async createProduct(data: { name: string; category?: string; sortOrder?: number }) {
    return prisma.certificateProduct.create({ data: { name: data.name.trim(), category: data.category?.trim() || null, sortOrder: data.sortOrder ?? 0 } });
  },

  async updateProduct(id: string, data: { name?: string; category?: string; sortOrder?: number }) {
    return prisma.certificateProduct.update({ where: { id }, data: { ...(data.name !== undefined && { name: data.name.trim() }), ...(data.category !== undefined && { category: data.category.trim() || null }), ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }) } });
  },

  async deleteProduct(id: string) {
    return prisma.certificateProduct.delete({ where: { id } });
  },
};

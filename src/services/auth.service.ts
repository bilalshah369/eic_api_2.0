import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/error.middleware';

export const authService = {
  async register(
    name: string,
    email: string,
    password: string,
    mobile: string,
    pan: string,
    iec: string,
    gstin?: string
  ) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already in use', 409);

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, mobile, pan, iec, gstin },
      select: { id: true, name: true, email: true, mobile: true, role: true, createdAt: true },
    });

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    return { user, accessToken, refreshToken };
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    const { password: _, refreshToken: __, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  },

  async refresh(token: string) {
    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user || user.refreshToken !== token) throw new AppError('Invalid refresh token', 401);

    const newPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(newPayload);
    const refreshToken = signRefreshToken(newPayload);

    await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    // _user is consumed by the controller for audit logging; not exposed to client
    return { accessToken, refreshToken, _user: { userId: user.id, email: user.email, name: user.name } };
  },

  async logout(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new AppError('Current password is incorrect', 400);

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  },
};

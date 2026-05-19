import { prisma } from '../config/prisma';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const generate = () => '111111';

export const otpService = {
  async send(email: string, mobile: string) {
    await prisma.otpVerification.deleteMany({ where: { email } });

    const otp = generate();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await prisma.otpVerification.create({ data: { email, mobile, otp, expiresAt } });

    // In production integrate an email/SMS provider here.
    logger.info(`[OTP] ${email} / ${mobile} → ${otp}`);
  },

  async verify(email: string, otp: string) {
    const record = await prisma.otpVerification.findFirst({
      where: { email, otp, expiresAt: { gt: new Date() } },
    });
    if (!record) throw new AppError('Invalid or expired OTP', 400);
    await prisma.otpVerification.delete({ where: { id: record.id } });
  },
};

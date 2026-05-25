import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp(): string {
  const bypass = process.env.BYPASS_OTP === 'true';
  return bypass ? '000000' : String(Math.floor(100000 + Math.random() * 900000));
}

function generateTempPassword(): string {
  // 10-char alphanumeric — sent to user via email/SMS
  return crypto.randomBytes(5).toString('hex').toUpperCase();
}

export const signupService = {
  async verifyPan(data: {
    registrationType: string;
    orgName: string;
    pan: string;
    dateOfIncorporation?: string | null;
  }) {
    const existing = await prisma.user.findFirst({ where: { pan: data.pan.toUpperCase() } });
    if (existing) throw new AppError('This PAN is already registered. Please login.', 409, 'PAN_EXISTS');

    // Mock PAN / DGFT verification — replace with real API calls in production
    const isMerchantExporter = data.registrationType === 'MERCHANT_EXPORTER';
    const fetchedDetails: Record<string, unknown> = {
      apiSource: isMerchantExporter ? 'DGFT' : 'PAN',
      orgName: data.orgName,
    };

    return { fetchedDetails };
  },

  async saveContact(data: {
    registrationType: string;
    orgName: string;
    pan: string;
    dateOfIncorporation?: string | null;
    fetchedDetails?: unknown;
    contactName: string;
    contactDesignation?: string | null;
    contactEmail: string;
    contactMobile: string;
    orgAddress: string;
    orgStateId?: number | null;
    orgStateName?: string | null;
    orgDistrictId?: number | null;
    orgDistrictName?: string | null;
    orgSubDistrictId?: number | null;
    orgSubDistrictName?: string | null;
    orgCity?: string | null;
    orgPincode?: string | null;
  }) {
    const existing = await prisma.user.findFirst({ where: { pan: data.pan.toUpperCase() } });
    if (existing) throw new AppError('This PAN is already registered. Please login.', 409, 'PAN_EXISTS');

    // Remove any prior incomplete session for the same PAN
    await prisma.signupSession.deleteMany({ where: { pan: data.pan.toUpperCase() } });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    const session = await prisma.signupSession.create({
      data: {
        pan: data.pan.toUpperCase(),
        registrationType: data.registrationType,
        orgName: data.orgName,
        dateOfIncorporation: data.dateOfIncorporation ? new Date(data.dateOfIncorporation) : null,
        fetchedDetails: (data.fetchedDetails ?? {}) as object,
        contactName: data.contactName,
        contactDesignation: data.contactDesignation ?? null,
        contactEmail: data.contactEmail.toLowerCase(),
        contactMobile: data.contactMobile,
        orgAddress: data.orgAddress,
        orgStateId: data.orgStateId ?? null,
        orgStateName: data.orgStateName ?? null,
        orgDistrictId: data.orgDistrictId ?? null,
        orgDistrictName: data.orgDistrictName ?? null,
        orgSubDistrictId: data.orgSubDistrictId ?? null,
        orgSubDistrictName: data.orgSubDistrictName ?? null,
        orgCity: data.orgCity ?? null,
        orgPincode: data.orgPincode ?? null,
        otp,
        expiresAt,
      },
    });

    // TODO: integrate email + SMS provider to send OTP
    logger.info(`[SIGNUP OTP] ${data.contactEmail} / ${data.contactMobile} → ${otp}`);

    return { sessionId: session.sessionId, expiresAt: session.expiresAt };
  },

  async verifyOtp(sessionId: string, otp: string) {
    const session = await prisma.signupSession.findUnique({ where: { sessionId } });
    if (!session) throw new AppError('Session not found or expired. Please restart registration.', 400);
    if (!session.otp || !session.expiresAt) throw new AppError('OTP not sent. Please resend.', 400);
    if (new Date() > session.expiresAt) throw new AppError('OTP has expired. Please resend.', 400);

    const bypass = process.env.BYPASS_OTP === 'true';
    if (!bypass && session.otp !== otp) throw new AppError('Invalid OTP. Please try again.', 400);

    // Final PAN check before creating account
    const existing = await prisma.user.findFirst({ where: { pan: session.pan } });
    if (existing) throw new AppError('This PAN was registered while you were filling the form. Please login.', 409, 'PAN_EXISTS');

    const emailExists = await prisma.user.findUnique({ where: { email: session.contactEmail! } });
    if (emailExists) throw new AppError('This email is already registered. Please login.', 409);

    const tempPassword = generateTempPassword();
    const hashed = await bcrypt.hash(tempPassword, 12);

    await prisma.user.create({
      data: {
        name: session.contactName ?? session.orgName,
        email: session.contactEmail!,
        password: hashed,
        mobile: session.contactMobile,
        pan: session.pan,
        registrationType: session.registrationType,
        orgName: session.orgName,
        contactDesignation: session.contactDesignation,
        orgAddress: session.orgAddress,
        orgStateId: session.orgStateId,
        orgStateName: session.orgStateName,
        orgDistrictId: session.orgDistrictId,
        orgDistrictName: session.orgDistrictName,
        orgSubDistrictId: session.orgSubDistrictId,
        orgSubDistrictName: session.orgSubDistrictName,
        orgCity: session.orgCity,
        orgPincode: session.orgPincode,
        dateOfIncorporation: session.dateOfIncorporation,
        fetchedDetails: session.fetchedDetails as object,
      },
    });

    await prisma.signupSession.delete({ where: { sessionId } });

    // TODO: send login credentials (email + tempPassword) via email / SMS
    logger.info(`[SIGNUP COMPLETE] ${session.contactEmail} registered. Temp password: ${tempPassword}`);

    return { message: 'Registration complete! Login credentials sent to your email and mobile.' };
  },

  async resendOtp(sessionId: string) {
    const session = await prisma.signupSession.findUnique({ where: { sessionId } });
    if (!session) throw new AppError('Session not found. Please restart registration.', 400);

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await prisma.signupSession.update({ where: { sessionId }, data: { otp, expiresAt } });

    // TODO: resend OTP via email + SMS
    logger.info(`[SIGNUP RESEND OTP] ${session.contactEmail} / ${session.contactMobile} → ${otp}`);

    return { expiresAt };
  },
};

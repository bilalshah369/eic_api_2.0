import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { otpService } from '../services/otp.service';
import { auditService } from '../services/audit.service';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../types';

const ip = (req: Request) =>
  (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
  req.socket.remoteAddress ||
  'unknown';

export const authController = {
  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, mobile } = req.body;
      await otpService.send(email, mobile);
      sendSuccess(res, null, 'OTP sent successfully');
    } catch (err) {
      next(err);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, mobile, pan, iec, gstin, otp } = req.body;
      await otpService.verify(email, otp);
      const result = await authService.register(name, email, password, mobile, pan, iec, gstin);

      await auditService.log({
        userId:    result.user.id,
        userName:  result.user.name,
        userEmail: result.user.email,
        action:    'REGISTER',
        description: 'New exporter account registered',
        ipAddress: ip(req),
      });

      sendSuccess(res, result, 'Registration successful', 201);
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      await auditService.log({
        userId:    result.user.id,
        userName:  result.user.name,
        userEmail: result.user.email,
        action:    'LOGIN',
        ipAddress: ip(req),
      });

      sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refresh(refreshToken);

      // log with user info from the returned payload
      const { userId, email, name } = (tokens as any)._user || {};
      await auditService.log({
        userId,
        userName:  name,
        userEmail: email,
        action:    'TOKEN_REFRESHED',
        ipAddress: ip(req),
      });

      sendSuccess(res, tokens, 'Tokens refreshed');
    } catch (err) {
      next(err);
    }
  },

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await auditService.log({
        userId:    req.user!.userId,
        userEmail: req.user!.email,
        action:    'LOGOUT',
        ipAddress: ip(req),
      });

      await authService.logout(req.user!.userId);
      sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  },

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      sendSuccess(res, req.user, 'User info');
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user!.userId, currentPassword, newPassword);

      await auditService.log({
        userId:    req.user!.userId,
        userEmail: req.user!.email,
        action:    'PASSWORD_CHANGED',
        description: 'User changed their password',
        ipAddress: ip(req),
      });

      sendSuccess(res, null, 'Password changed successfully');
    } catch (err) {
      next(err);
    }
  },
};

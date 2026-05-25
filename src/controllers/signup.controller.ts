import { Request, Response, NextFunction } from 'express';
import { signupService } from '../services/signup.service';
import { sendSuccess } from '../utils/response';

export const signupController = {
  async verifyPan(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await signupService.verifyPan(req.body);
      sendSuccess(res, result, 'PAN verified');
    } catch (err) {
      next(err);
    }
  },

  async saveContact(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await signupService.saveContact(req.body);
      sendSuccess(res, result, 'OTP sent to email and mobile');
    } catch (err) {
      next(err);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, otp } = req.body;
      const result = await signupService.verifyOtp(sessionId, otp);
      sendSuccess(res, {}, result.message);
    } catch (err) {
      next(err);
    }
  },

  async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.body;
      const result = await signupService.resendOtp(sessionId);
      sendSuccess(res, result, 'OTP resent successfully');
    } catch (err) {
      next(err);
    }
  },
};

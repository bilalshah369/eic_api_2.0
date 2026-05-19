import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { AuthRequest } from '../types';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
};

export const authorize = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      sendError(res, 'Forbidden', 403);
      return;
    }
    next();
  };

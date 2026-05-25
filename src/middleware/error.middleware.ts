import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(err.message, { stack: err.stack, url: req.url, method: req.method });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message, ...(err.code ? { code: err.code } : {}) });
    return;
  }

  res.status(500).json({ success: false, message: 'Internal server error' });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
};

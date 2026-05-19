import { Response } from 'express';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
) =>
  res.status(statusCode).json({ success: true, message, data });

export const sendError = (
  res: Response,
  message = 'Internal Server Error',
  statusCode = 500,
  errors?: unknown
) =>
  res.status(statusCode).json({ success: false, message, ...(errors ? { errors } : {}) });

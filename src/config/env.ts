import dotenv from 'dotenv';

dotenv.config();

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  UPLOAD_MAX_SIZE_MB: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '10', 10),
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV === 'development',
};

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/prisma';
import routes from './routes';
import { errorHandler, notFound } from './middleware/error.middleware';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(env.isDev ? 'dev' : 'combined'));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.isDev ? 2000 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.',
  })
);

app.use('/uploads', express.static(env.UPLOAD_DIR));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV, timestamp: new Date().toISOString() });
});

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  await prisma.$connect();
  logger.info('Database connected');

  app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
};

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

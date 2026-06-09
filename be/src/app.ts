import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { config } from '@config/index';
import logger from '@config/logger';
import prisma from '@config/prisma';
import { notFoundHandler } from '@shared/middlewares/notFoundHandler';
import { errorHandler } from '@shared/middlewares/errorHandler';
import { requestTiming } from '@shared/middlewares/requestTiming';
import { sanitizeInput } from '@shared/middlewares/sanitizeInput';
import { globalRateLimiter, publicRateLimiter } from '@shared/middlewares/rateLimiters';

// ─── Module routers (will be imported progressively as modules are built) ──
import { authRouter } from '@routes/auth.routes';
import { usersRouter } from '@routes/user.routes';
import { coursesRouter } from '@routes/course.routes';
import { lessonsRouter } from '@routes/lesson.routes';
import { enrollmentsRouter } from '@routes/enrollment.routes';
import { progressRouter } from '@routes/progress.routes';
import { quizzesRouter } from '@routes/quiz.routes';
import { assignmentsRouter } from '@routes/assignment.routes';
import { accessControlRouter } from '@routes/access-control.routes';
import { notificationsRouter } from '@routes/notification.routes';
import { chatRouter } from '@routes/chat.routes';

export function createApp(): Application {
  const app = express();

  // ── Security ──────────────────────────────────────────────────────────────
  app.use(helmet());
  if (config.app.trustProxy) app.set('trust proxy', 1);

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: config.cors.origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: config.app.jsonBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.app.jsonBodyLimit }));
  app.use(cookieParser());
  app.use(sanitizeInput);

  // ── HTTP request logging ──────────────────────────────────────────────────
  if (config.app.isDevelopment) {
    app.use(morgan('dev'));
  } else {
    app.use(
      morgan('combined', {
        stream: { write: (msg) => logger.info(msg.trim()) },
      }),
    );
  }
  app.use(requestTiming);

  // ── Global rate limiter ───────────────────────────────────────────────────
  app.use(globalRateLimiter);

  // ── Health check (no auth required) ───────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'LMS API is running',
      data: {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: config.app.env,
        version: config.app.version,
      },
    });
  });

  app.get('/ready', async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        success: true,
        message: 'LMS API is ready',
        data: {
          status: 'ready',
          database: 'ok',
          timestamp: new Date().toISOString(),
          environment: config.app.env,
          version: config.app.version,
        },
      });
    } catch (err) {
      logger.error('Readiness check failed', { err });
      res.status(503).json({
        success: false,
        message: 'LMS API is not ready',
        data: {
          status: 'not_ready',
          database: 'unavailable',
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  // ── API v1 routes ─────────────────────────────────────────────────────────
  const apiRouter = express.Router();

  // Mount module routers here as they are implemented:
  apiRouter.use('/courses/public', publicRateLimiter);
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/users', usersRouter);
  apiRouter.use('/courses', coursesRouter);
  apiRouter.use('/lessons', lessonsRouter);
  apiRouter.use('/enrollments', enrollmentsRouter);
  apiRouter.use('/progress', progressRouter);
  apiRouter.use('/quizzes', quizzesRouter);
  apiRouter.use('/assignments', assignmentsRouter);
  apiRouter.use('/access-control', accessControlRouter);
  apiRouter.use('/notifications', notificationsRouter);
  apiRouter.use('/chat', chatRouter);

  app.use('/api/v1', apiRouter);

  // ── 404 + Error handlers (must be last) ───────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

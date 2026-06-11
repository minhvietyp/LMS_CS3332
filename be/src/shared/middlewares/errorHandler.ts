import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { AppError } from '@shared/errors/AppError';
import logger from '@config/logger';
import { config } from '@config/index';

/**
 * Global error handling middleware.
 * Must be registered LAST in app.ts (after all routes).
 *
 * Handles:
 * - AppError (operational errors) — sent to client with message + code
 * - ZodError (validation) — formatted as 422 Unprocessable Entity
 * - Prisma errors — mapped to meaningful HTTP codes
 * - Unknown errors — 500 Internal Server Error (details hidden in production)
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // ── Zod validation error ───────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(422).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors,
    });
    return;
  }

  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded file exceeds the configured size limit'
        : 'Unsupported file type for this upload';

    res.status(400).json({
      success: false,
      message,
      code: err.code,
    });
    return;
  }

  // ── Operational AppError ───────────────────────────────────────────────────
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational AppError', { err });
    }

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code && { code: err.code }),
    });
    return;
  }

  // ── Prisma known request errors ────────────────────────────────────────────
  if (isPrismaError(err)) {
    const { statusCode, message, code } = mapPrismaError(err);
    res.status(statusCode).json({ success: false, message, code });
    return;
  }

  // ── Unknown / programmer errors ────────────────────────────────────────────
  logger.error('Unhandled error', { err });

  res.status(500).json({
    success: false,
    message: config.app.isProduction ? 'Internal Server Error' : String(err),
    code: 'INTERNAL_ERROR',
  });
}

// ─── Prisma error helpers ──────────────────────────────────────────────────

interface PrismaKnownError {
  code: string;
  meta?: Record<string, unknown>;
}

function isPrismaError(err: unknown): err is PrismaKnownError {
  const code =
    typeof err === 'object' && err !== null ? (err as Record<string, unknown>).code : undefined;

  return typeof code === 'string' && code.startsWith('P');
}

function mapPrismaError(err: PrismaKnownError): {
  statusCode: number;
  message: string;
  code: string;
} {
  switch (err.code) {
    case 'P2002':
      return {
        statusCode: 409,
        message: 'A record with this value already exists.',
        code: 'UNIQUE_CONSTRAINT',
      };
    case 'P2025':
      return { statusCode: 404, message: 'Record not found.', code: 'NOT_FOUND' };
    case 'P2003':
      return {
        statusCode: 400,
        message: 'Related record not found.',
        code: 'FOREIGN_KEY_CONSTRAINT',
      };
    default:
      return { statusCode: 500, message: 'Database error.', code: `PRISMA_${err.code}` };
  }
}

import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '@shared/errors/AppError';

/**
 * 404 Not Found fallthrough handler.
 * Register this AFTER all routes but BEFORE the error handler.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}

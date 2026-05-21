import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@shared/utils/jwt';
import { UnauthorizedError } from '@shared/errors/AppError';

/**
 * Middleware to authenticate user via JWT token in the Authorization header.
 * Formats supported: "Bearer <token>"
 */
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(UnauthorizedError('Missing or invalid Authorization header', 'MISSING_TOKEN'));
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    return next(UnauthorizedError('Missing or invalid Authorization header', 'MISSING_TOKEN'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
};

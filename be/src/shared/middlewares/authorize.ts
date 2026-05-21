import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '@shared/errors/AppError';
import { UserRole } from '@types';
import { Permission, ROLE_PERMISSIONS } from '@shared/constants';

export type AccessScope = UserRole | Permission;

function isPermission(scope: string): boolean {
  return scope.includes(':');
}

/**
 * Middleware to restrict access to specific roles.
 * Usage: router.get('/users', authenticate, authorize('ADMIN'), userController.list);
 */
export const authorize = (...allowedScopes: AccessScope[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(UnauthorizedError('User not authenticated'));
    }

    const userPermissions: readonly Permission[] = ROLE_PERMISSIONS[req.user.role] ?? [];
    const isAllowed = allowedScopes.some((allowed) => {
      if (isPermission(allowed)) {
        return userPermissions.includes(allowed as Permission);
      }

      return req.user?.role === allowed;
    });

    if (!isAllowed) {
      return next(ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  };
};

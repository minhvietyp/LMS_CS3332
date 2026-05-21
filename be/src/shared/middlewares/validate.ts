import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { UnprocessableError } from '@shared/errors/AppError';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Express middleware factory that validates a request part against a Zod schema.
 * On success, it replaces the original request part with the parsed (coerced) data.
 * On failure, it throws a ZodError that will be caught by the global error handler.
 *
 * Usage:
 *   router.post('/users', validate(CreateUserSchema), userController.create);
 *   router.get('/users', validate(ListUsersQuerySchema, 'query'), userController.list);
 */
export function validate(schema: ZodTypeAny, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[part]);
      req[part] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(err); // forwarded to errorHandler → 422 response
      } else {
        next(UnprocessableError('Validation failed'));
      }
    }
  };
}

import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express route handler so that any rejected promise
 * (or thrown error) is forwarded to the next(err) error middleware.
 * This eliminates the need for try/catch boilerplate in every controller.
 *
 * Usage:
 *   router.get('/path', asyncHandler(myControllerFn));
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Base application error.
 * Extends the native Error so it can be thrown and caught normally.
 * The `statusCode` maps to an HTTP status code.
 * The `isOperational` flag distinguishes expected (operational) errors
 * from programmer errors — only operational errors are sent to the client.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number, code?: string, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    // Restore prototype chain (required when extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Convenience factory helpers ──────────────────────────────────────────────

export const BadRequestError = (message = 'Bad Request', code?: string) =>
  new AppError(message, 400, code);

export const UnauthorizedError = (message = 'Unauthorized', code?: string) =>
  new AppError(message, 401, code);

export const ForbiddenError = (message = 'Forbidden', code?: string) =>
  new AppError(message, 403, code);

export const NotFoundError = (message = 'Not Found', code?: string) =>
  new AppError(message, 404, code);

export const ConflictError = (message = 'Conflict', code?: string) =>
  new AppError(message, 409, code);

export const UnprocessableError = (message = 'Unprocessable Entity', code?: string) =>
  new AppError(message, 422, code);

export const InternalError = (message = 'Internal Server Error', code?: string) =>
  new AppError(message, 500, code, false);

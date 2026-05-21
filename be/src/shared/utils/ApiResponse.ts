import { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standardised API response format.
 *
 * Success:
 * { success: true, message, data, meta? }
 *
 * Error (sent by errorHandler middleware):
 * { success: false, message, code?, errors? }
 */
export class ApiResponse {
  /**
   * Send a successful response.
   */
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200,
    meta?: PaginationMeta,
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      ...(meta && { meta }),
    });
  }

  /**
   * Send a 201 Created response.
   */
  static created<T>(res: Response, data: T, message = 'Created'): Response {
    return ApiResponse.success(res, data, message, 201);
  }

  /**
   * Send a 204 No Content response (no body).
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Build a pagination meta object from common pagination params.
   */
  static paginationMeta(page: number, limit: number, total: number): PaginationMeta {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}

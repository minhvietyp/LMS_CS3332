/**
 * Shared TypeScript types used across multiple modules.
 */

// ─── Authenticated Request ─────────────────────────────────────────────────
import { Request } from 'express';

export interface JwtPayload {
  sub: string;        // userId
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

// ─── User Roles ────────────────────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';

// ─── Common Pagination ─────────────────────────────────────────────────────
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── ID param helper ───────────────────────────────────────────────────────
export interface IdParam {
  id: string;
}

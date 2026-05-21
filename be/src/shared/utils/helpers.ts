/**
 * Pagination helper — parse and clamp page/limit from query params.
 */
export function parsePagination(
  query: Record<string, unknown>,
  defaultLimit = 20,
  maxLimit = 100,
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(query.limit ?? defaultLimit), 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Pick only defined (non-undefined, non-null) values from an object.
 * Useful for building Prisma `data` update objects.
 */
export function pickDefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null),
  ) as Partial<T>;
}

/**
 * Sleep utility for development/testing.
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

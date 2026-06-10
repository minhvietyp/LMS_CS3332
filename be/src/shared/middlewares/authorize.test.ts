import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@shared/errors/AppError', () => ({
  ForbiddenError: (message: string) => ({ statusCode: 403, message }),
  UnauthorizedError: (message: string) => ({ statusCode: 401, message }),
}));

import { authorize } from './authorize';

function createNext() {
  return vi.fn();
}

describe('authorize middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a matching role', () => {
    const next = createNext();
    const middleware = authorize('ADMIN');

    middleware({ user: { role: 'ADMIN' } } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows a matching permission for an instructor', () => {
    const next = createNext();
    const middleware = authorize('course:create');

    middleware({ user: { role: 'INSTRUCTOR' } } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('denies users without permission', () => {
    const next = createNext();
    const middleware = authorize('user:delete');

    middleware({ user: { role: 'STUDENT' } } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('denies anonymous users', () => {
    const next = createNext();
    const middleware = authorize('ADMIN');

    middleware({} as any, {} as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

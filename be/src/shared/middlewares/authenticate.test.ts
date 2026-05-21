import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@shared/utils/jwt', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('@shared/errors/AppError', () => ({
  UnauthorizedError: (message: string, code?: string) => ({ statusCode: 401, message, code }),
}));

import { verifyAccessToken } from '@shared/utils/jwt';
import { authenticate } from './authenticate';

function createNext() {
  return vi.fn();
}

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches the decoded user when the bearer token is valid', () => {
    const next = createNext();
    vi.mocked(verifyAccessToken).mockReturnValue({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'ADMIN',
    } as any);

    const req = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as any;

    authenticate(req, {} as any, next);

    expect(verifyAccessToken).toHaveBeenCalledWith('valid-token');
    expect(req.user).toEqual({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'ADMIN',
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 401 when the authorization header is missing', () => {
    const next = createNext();

    authenticate({ headers: {} } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it('returns 401 when the bearer token is empty', () => {
    const next = createNext();

    authenticate({ headers: { authorization: 'Bearer   ' } } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it('forwards token verification failures', () => {
    const next = createNext();
    vi.mocked(verifyAccessToken).mockImplementation(() => {
      throw { statusCode: 401, message: 'Invalid token' };
    });

    authenticate({ headers: { authorization: 'Bearer invalid-token' } } as any, {} as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

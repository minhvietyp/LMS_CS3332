import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@config/index', () => ({
  config: {
    app: {
      isDevelopment: false,
    },
    email: {
      host: '',
      port: 587,
      user: '',
      pass: '',
      from: 'noreply@lms.local',
    },
    bcrypt: {
      rounds: 12,
    },
    jwt: {
      accessSecret: 'test-access-secret',
      accessExpiresIn: '15m',
      refreshTokenDays: 7,
      refreshCookieName: 'refresh_token',
    },
  },
}));

vi.mock('@config/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock('@shared/utils/jwt', () => ({
  signAccessToken: vi.fn(() => 'mock-access-token'),
  verifyAccessToken: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

import bcrypt from 'bcryptjs';
import prisma from '@config/prisma';
import { signAccessToken } from '@shared/utils/jwt';
import { AuthService } from './auth.service';

const authService = new AuthService();
const mockedPrisma = prisma as any;
const mockedBcrypt = bcrypt as any;
const mockedSignAccessToken = vi.mocked(signAccessToken);

describe('AuthService.register', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('register-refresh-token') as any);
  });

  it('creates a student account, hashes the password, and returns tokens', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedBcrypt.hash.mockResolvedValue('hashed-password');
    mockedPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'newstudent@example.com',
      name: 'New Student',
      role: 'STUDENT',
      password: 'hashed-password',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });
    mockedPrisma.refreshToken.create.mockResolvedValue({ id: 'token-1' });

    const result = await authService.register({
      name: 'New Student',
      email: 'newstudent@example.com',
      password: 'password123',
    });

    const expectedRefreshToken = Buffer.from('register-refresh-token').toString('hex');
    const expectedTokenHash = crypto
      .createHash('sha256')
      .update(expectedRefreshToken)
      .digest('hex');

    expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'newstudent@example.com' },
    });
    expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 12);
    expect(mockedPrisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'New Student',
        email: 'newstudent@example.com',
        password: 'hashed-password',
        role: 'STUDENT',
      },
    });
    expect(mockedSignAccessToken).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'newstudent@example.com',
      role: 'STUDENT',
    });
    expect(mockedPrisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: expectedTokenHash,
        expiresAt: expect.any(Date),
      },
    });
    expect(result).toEqual({
      accessToken: 'mock-access-token',
      refreshToken: expectedRefreshToken,
      user: {
        id: 'user-1',
        email: 'newstudent@example.com',
        name: 'New Student',
        role: 'STUDENT',
        avatarUrl: null,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
        deletedBy: null,
      },
    });
  });

  it('rejects registration when the email already exists', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'existing@example.com',
      name: 'Existing User',
      role: 'STUDENT',
      password: 'hashed-password',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    await expect(
      authService.register({
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'User with this email already exists',
    });

    expect(mockedBcrypt.hash).not.toHaveBeenCalled();
    expect(mockedPrisma.user.create).not.toHaveBeenCalled();
    expect(mockedPrisma.refreshToken.create).not.toHaveBeenCalled();
  });
});

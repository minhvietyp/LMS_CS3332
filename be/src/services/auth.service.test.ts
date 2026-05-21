import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@config/index', () => ({
  config: {
    app: {
      isDevelopment: false,
    },
    cors: {
      origins: ['http://localhost:5173'],
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
      update: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
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

const emailServiceMock = vi.hoisted(() => ({
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('./email.service', () => ({
  EmailService: vi.fn(function EmailService() {
    return emailServiceMock;
  }),
}));

import bcrypt from 'bcryptjs';
import prisma from '@config/prisma';
import { signAccessToken } from '@shared/utils/jwt';
import { AuthService } from './auth.service';

const authService = new AuthService();
const mockedPrisma = prisma as any;
const mockedBcrypt = bcrypt as any;
const mockedSignAccessToken = vi.mocked(signAccessToken);

describe('AuthService.login', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('refresh-token') as any);
  });

  it('returns tokens and a sanitized user for valid credentials', async () => {
    const user = {
      id: 'user-1',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT' as const,
      password: 'hashed-password',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    };

    mockedPrisma.user.findUnique.mockResolvedValue(user);
    mockedPrisma.refreshToken.create.mockResolvedValue({ id: 'token-1' });
    mockedBcrypt.compare.mockResolvedValue(true);

    const result = await authService.login({
      email: 'student@example.com',
      password: 'password123',
    });

    const expectedRefreshToken = Buffer.from('refresh-token').toString('hex');
    const expectedTokenHash = crypto.createHash('sha256').update(expectedRefreshToken).digest('hex');

    expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    expect(mockedSignAccessToken).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'student@example.com',
      role: 'STUDENT',
    });
    expect(result).toEqual({
      accessToken: 'mock-access-token',
      refreshToken: expectedRefreshToken,
      user: {
        id: 'user-1',
        email: 'student@example.com',
        name: 'Student One',
        role: 'STUDENT',
        avatarUrl: null,
        isActive: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
        deletedBy: null,
      },
    });
    expect(mockedPrisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: expectedTokenHash,
        expiresAt: expect.any(Date),
      },
    });
  });

  it('rejects invalid credentials when the user does not exist', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'missing@example.com',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password',
    });

    expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    expect(mockedPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rejects invalid credentials when the password is wrong', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT',
      password: 'hashed-password',
      avatarUrl: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });
    mockedBcrypt.compare.mockResolvedValue(false);

    await expect(
      authService.login({
        email: 'student@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password',
    });

    expect(mockedPrisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('rejects login for inactive users before password comparison', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT',
      password: 'hashed-password',
      avatarUrl: null,
      isActive: false,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    await expect(
      authService.login({
        email: 'student@example.com',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password',
    });

    expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    expect(mockedPrisma.refreshToken.create).not.toHaveBeenCalled();
  });
});

describe('AuthService password recovery', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('password-reset-token') as any);
  });

  it('returns success for forgot-password when the account does not exist', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    await expect(authService.forgotPassword('missing@example.com')).resolves.toBeUndefined();
  });

  it('creates and emails a password reset token for active users', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'student@example.com',
      name: 'Student One',
      role: 'STUDENT',
      isActive: true,
    });
    mockedPrisma.passwordResetToken = {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({ id: 'reset-1' }),
    };

    await authService.forgotPassword('student@example.com');

    expect(mockedPrisma.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      },
    });
    expect(emailServiceMock.sendPasswordResetEmail).toHaveBeenCalled();
  });

  it('resets the password, marks the token as used, and revokes refresh tokens', async () => {
    const hashedResetToken = crypto.createHash('sha256').update('raw-reset-token').digest('hex');
    mockedPrisma.passwordResetToken = {
      findUnique: vi.fn().mockResolvedValue({
        id: 'reset-1',
        userId: 'user-1',
        tokenHash: hashedResetToken,
        usedAt: null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        user: {
          id: 'user-1',
          isActive: true,
        },
      }),
      update: vi.fn().mockResolvedValue({ id: 'reset-1' }),
    };
    mockedBcrypt.hash.mockResolvedValue('new-hashed-password');
    mockedPrisma.user.update.mockResolvedValue({ id: 'user-1' });
    mockedPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });
    mockedPrisma.$transaction.mockImplementation(async (operations: any[]) => Promise.all(operations));

    await authService.resetPassword('raw-reset-token', 'NewPassword123');

    expect(mockedBcrypt.hash).toHaveBeenCalledWith('NewPassword123', 12);
    expect(mockedPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: 'new-hashed-password' },
    });
    expect(mockedPrisma.passwordResetToken.update).toHaveBeenCalled();
    expect(mockedPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', isRevoked: false },
      data: { isRevoked: true },
    });
  });

  it('rejects expired password reset tokens', async () => {
    mockedPrisma.passwordResetToken = {
      findUnique: vi.fn().mockResolvedValue({
        id: 'reset-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 60 * 1000),
        user: {
          id: 'user-1',
          isActive: true,
        },
      }),
    };

    await expect(authService.resetPassword('expired-token', 'NewPassword123')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid or expired password reset token',
    });
  });
});

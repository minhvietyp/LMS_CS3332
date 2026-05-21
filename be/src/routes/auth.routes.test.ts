import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@config/index', () => ({
  config: {
    app: {
      isProduction: false,
      isDevelopment: true,
      trustProxy: false,
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
    rateLimit: {
      authWindowMs: 900000,
      authMax: 100,
    },
  },
}));

vi.mock('@config/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const authServiceMock = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  refreshToken: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('../services/auth.service', () => ({
  AuthService: vi.fn(function AuthService() {
    return authServiceMock;
  }),
}));

import { errorHandler } from '@shared/middlewares/errorHandler';
import { authRouter } from './auth.routes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', authRouter);
  app.use(errorHandler);
  return app;
}

describe('auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects malformed login payloads before reaching the service', async () => {
    const response = await request(createApp())
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: '' });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(authServiceMock.login).not.toHaveBeenCalled();
  });

  it('logs in with valid credentials and returns tokens plus user profile', async () => {
    authServiceMock.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
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

    const response = await request(createApp())
      .post('/api/v1/auth/login')
      .send({ email: 'student@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBe('access-token');
    expect(response.body.data.refreshToken).toBe('refresh-token');
    expect(response.body.data.user.password).toBeUndefined();
    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'password123',
    });
  });

  it('refreshes tokens with a valid refresh token', async () => {
    authServiceMock.refreshToken.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    const response = await request(createApp())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'refresh-token' });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    expect(authServiceMock.refreshToken).toHaveBeenCalledWith('refresh-token');
  });

  it('rejects logout requests without a refresh token', async () => {
    const response = await request(createApp()).post('/api/v1/auth/logout').send({});

    expect(response.status).toBe(422);
    expect(authServiceMock.logout).not.toHaveBeenCalled();
  });

  it('revokes the submitted refresh token on logout', async () => {
    authServiceMock.logout.mockResolvedValue(undefined);

    const response = await request(createApp())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'refresh-token' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Logout successful');
    expect(authServiceMock.logout).toHaveBeenCalledWith('refresh-token');
  });

  it('accepts forgot-password requests and always returns a generic success response', async () => {
    authServiceMock.forgotPassword.mockResolvedValue(undefined);

    const response = await request(createApp())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'student@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('If the account exists, a password reset email has been sent');
    expect(authServiceMock.forgotPassword).toHaveBeenCalledWith('student@example.com');
  });

  it('rejects malformed reset-password payloads before reaching the service', async () => {
    const response = await request(createApp())
      .post('/api/v1/auth/reset-password')
      .send({ token: '', password: 'short', confirmPassword: 'different' });

    expect(response.status).toBe(422);
    expect(authServiceMock.resetPassword).not.toHaveBeenCalled();
  });

  it('resets the password with a valid token', async () => {
    authServiceMock.resetPassword.mockResolvedValue(undefined);

    const response = await request(createApp())
      .post('/api/v1/auth/reset-password')
      .send({
        token: 'raw-reset-token',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Password reset successful');
    expect(authServiceMock.resetPassword).toHaveBeenCalledWith('raw-reset-token', 'NewPassword123');
  });
});

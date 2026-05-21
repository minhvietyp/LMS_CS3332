import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@config/index', () => ({
  config: {
    app: {
      isProduction: false,
      isDevelopment: true,
    },
  },
}));

vi.mock('@config/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@shared/utils/jwt', () => ({
  verifyAccessToken: vi.fn(() => ({
    sub: 'admin-1',
    email: 'admin@lms.local',
    role: 'ADMIN',
  })),
}));

import { errorHandler } from '@shared/middlewares/errorHandler';
import { accessControlRouter } from './access-control.routes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/access-control', accessControlRouter);
  app.use(errorHandler);
  return app;
}

describe('access-control routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the role matrix to an authenticated admin', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/api/v1/access-control/roles')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'ADMIN' }),
        expect.objectContaining({ role: 'INSTRUCTOR' }),
        expect.objectContaining({ role: 'STUDENT' }),
      ]),
    );
  });

  it('rejects requests without a bearer token', async () => {
    const app = createApp();

    const response = await request(app).get('/api/v1/access-control/roles');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Missing or invalid Authorization header');
  });
});

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@config/index', () => ({
  config: {
    app: { isProduction: false, isDevelopment: true },
  },
}));

vi.mock('@config/logger', () => ({
  default: { error: vi.fn(), info: vi.fn() },
}));

const notificationServiceMock = vi.hoisted(() => ({
  list: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}));

vi.mock('../services/notification.service', () => ({
  NotificationService: vi.fn(function NotificationService() {
    return notificationServiceMock;
  }),
}));

vi.mock('@shared/utils/jwt', () => ({
  verifyAccessToken: vi.fn(() => ({ sub: 'user-1', email: 'student@lms.local', role: 'STUDENT' })),
}));

import { errorHandler } from '@shared/middlewares/errorHandler';
import { notificationsRouter } from './notification.routes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/notifications', notificationsRouter);
  app.use(errorHandler);
  return app;
}

describe('notification routes - read-all', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    const response = await request(createApp()).patch('/api/v1/notifications/read-all');

    expect(response.status).toBe(401);
    expect(notificationServiceMock.markAllAsRead).not.toHaveBeenCalled();
  });

  it('marks all notifications as read for the authenticated user and returns updated count', async () => {
    notificationServiceMock.markAllAsRead.mockResolvedValue(3);

    const response = await request(createApp())
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({ updatedCount: 3 });
    expect(notificationServiceMock.markAllAsRead).toHaveBeenCalledWith('user-1');
  });

  it('returns zero updated count when there are no unread notifications', async () => {
    notificationServiceMock.markAllAsRead.mockResolvedValue(0);

    const response = await request(createApp())
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ updatedCount: 0 });
  });
});

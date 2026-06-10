import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, socketServiceMock } = vi.hoisted(() => {
  const prismaMock: any = {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    prismaMock,
    socketServiceMock: {
      sendToUser: vi.fn(),
    },
  };
});

vi.mock('@config/prisma', () => ({
  default: prismaMock,
}));

vi.mock('@services/socket.service', () => ({
  SocketService: socketServiceMock,
}));

import prisma from '@config/prisma';
import { SocketService } from '@services/socket.service';
import { NotificationService } from './notification.service';

const mockedPrisma = prisma as any;

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a notification and emits it to the student', async () => {
    mockedPrisma.notification.create.mockResolvedValue({
      id: 'notification-1',
      userId: 'student-1',
    });

    const service = new NotificationService();
    const result = await service.create({
      userId: 'student-1',
      type: 'COURSE',
      message: 'You were enrolled in React Basics.',
      courseId: 'course-1',
      referenceId: 'enrollment-1',
    });

    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'student-1',
        type: 'COURSE',
        message: 'You were enrolled in React Basics.',
        courseId: 'course-1',
        referenceId: 'enrollment-1',
      },
    });
    expect(SocketService.sendToUser).toHaveBeenCalledWith('student-1', 'notification', {
      id: 'notification-1',
      userId: 'student-1',
    });
    expect(result.id).toBe('notification-1');
  });

  it('lists notifications in newest-first order', async () => {
    mockedPrisma.notification.findMany.mockResolvedValue([
      { id: 'notification-2' },
      { id: 'notification-1' },
    ]);

    const service = new NotificationService();
    const result = await service.list('student-1');

    expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'student-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(2);
  });

  it('marks notifications as read for the current user', async () => {
    mockedPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

    const service = new NotificationService();
    await service.markAsRead('notification-1', 'student-1');

    expect(mockedPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'notification-1', userId: 'student-1' },
      data: { isRead: true, readAt: expect.any(Date) },
    });
  });
});

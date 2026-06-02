import prisma from '@config/prisma';
import { Notification } from '@prisma/client';
import { SocketService } from '@services/socket.service';

export class NotificationService {
  async create(data: any): Promise<Notification> {
    const notification = await prisma.notification.create({ data });

    // Realtime delivery
    SocketService.sendToUser(data.userId, 'notification', notification);

    return notification;
  }

  async list(userId: string): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return result.count;
  }
}

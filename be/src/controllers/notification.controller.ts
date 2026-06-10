import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { ApiResponse } from '@shared/utils/ApiResponse';

const notificationService = new NotificationService();

export class NotificationController {
  async list(req: Request, res: Response) {
    const result = await notificationService.list(
      req.user!.sub,
      req.query as { limit?: string; cursor?: string; unreadOnly?: boolean },
    );
    return ApiResponse.success(res, result, 'Notifications retrieved successfully');
  }

  async markAsRead(req: Request, res: Response) {
    await notificationService.markAsRead(req.params.id, req.user!.sub);
    return ApiResponse.success(res, null, 'Notification marked as read');
  }

  async markAllAsRead(req: Request, res: Response) {
    const updatedCount = await notificationService.markAllAsRead(req.user!.sub);
    return ApiResponse.success(res, { updatedCount }, 'All notifications marked as read');
  }
}

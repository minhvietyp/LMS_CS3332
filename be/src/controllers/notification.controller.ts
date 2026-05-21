import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { ApiResponse } from '@shared/utils/ApiResponse';

const notificationService = new NotificationService();

export class NotificationController {
  async list(req: Request, res: Response) {
    const result = await notificationService.list(req.user!.sub);
    return ApiResponse.success(res, result, 'Notifications retrieved successfully');
  }

  async markAsRead(req: Request, res: Response) {
    await notificationService.markAsRead(req.params.id, req.user!.sub);
    return ApiResponse.success(res, null, 'Notification marked as read');
  }
}

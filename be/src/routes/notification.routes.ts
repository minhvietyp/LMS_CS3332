import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { authenticate } from '@shared/middlewares/authenticate';
import { validate } from '@shared/middlewares/validate';
import { listNotificationsQuerySchema, notificationIdParamsSchema } from '../validators/notification.validator';

const router = Router();
const notificationController = new NotificationController();

router.get('/', authenticate, validate(listNotificationsQuerySchema, 'query'), asyncHandler(notificationController.list));
router.patch(
  '/:id/read',
  authenticate,
  validate(notificationIdParamsSchema, 'params'),
  asyncHandler(notificationController.markAsRead),
);

router.patch(
  '/read-all',
  authenticate,
  asyncHandler(notificationController.markAllAsRead),
);

export { router as notificationsRouter };

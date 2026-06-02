import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { authenticate } from '@shared/middlewares/authenticate';
import { validate } from '@shared/middlewares/validate';
import { notificationIdParamsSchema } from '../validators/notification.validator';

const router = Router();
const notificationController = new NotificationController();

router.get('/', authenticate, asyncHandler(notificationController.list));
router.patch(
  '/:id/read',
  authenticate,
  validate(notificationIdParamsSchema, 'params'),
  asyncHandler(notificationController.markAsRead),
);

export { router as notificationsRouter };

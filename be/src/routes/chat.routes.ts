import { Router } from 'express';
import { authenticate } from '@shared/middlewares/authenticate';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { validate } from '@shared/middlewares/validate';
import { ChatController } from '../controllers/chat.controller';
import {
  chatRoomIdParamsSchema,
  createDirectRoomSchema,
  listChatMessagesQuerySchema,
  sendChatMessageSchema,
} from '../validators/chat.validator';

const router = Router();
const chatController = new ChatController();

router.get('/rooms', authenticate, asyncHandler(chatController.getRooms));
router.get(
  '/rooms/:roomId/messages',
  authenticate,
  validate(chatRoomIdParamsSchema, 'params'),
  validate(listChatMessagesQuerySchema, 'query'),
  asyncHandler(chatController.getMessages),
);
router.post(
  '/direct-rooms',
  authenticate,
  validate(createDirectRoomSchema),
  asyncHandler(chatController.createDirectRoom),
);
router.post(
  '/rooms/:roomId/messages',
  authenticate,
  validate(chatRoomIdParamsSchema, 'params'),
  validate(sendChatMessageSchema),
  asyncHandler(chatController.sendMessage),
);

export { router as chatRouter };

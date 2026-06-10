import { z } from 'zod';

export const chatRoomIdParamsSchema = z.object({
  roomId: z.string().uuid(),
});

export const listChatMessagesQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).optional(),
  before: z.string().datetime().optional(),
});

export const createDirectRoomSchema = z.object({
  userId: z.string().uuid(),
});

export const sendChatMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

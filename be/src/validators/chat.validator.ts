import { z } from 'zod';

export const chatRoomIdParamsSchema = z.object({
  roomId: z.string().uuid(),
});

export const createDirectRoomSchema = z.object({
  userId: z.string().uuid(),
});

export const sendChatMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

import { z } from 'zod';

export const notificationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listNotificationsQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/)
    .optional(),
  cursor: z.string().datetime().optional(),
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

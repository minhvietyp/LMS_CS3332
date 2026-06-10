import { z } from 'zod';
import { lessonRouteParamsSchema } from './lesson.validator';

export const markLessonCompleteSchema = z.object({
  isCompleted: z.boolean(),
});

export { lessonRouteParamsSchema };
export const lessonStateSchema = z.object({
  state: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
});

export const timelineQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1))
    .optional()
    .default('10'),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(0))
    .optional()
    .default('0'),
});

export const courseProgressParamsSchema = z.object({
  courseId: z.string().uuid(),
});

export const instructorStudentProgressParamsSchema = courseProgressParamsSchema.extend({
  studentId: z.string().uuid(),
});

export const instructorProgressQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).optional().default('1'),
  pageSize: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional()
    .default('10'),
  status: z.enum(['ACTIVE', 'COMPLETED', 'DROPPED']).optional(),
  search: z.string().trim().max(100).optional(),
  sortBy: z.enum(['name', 'progress', 'lastActivity', 'enrolledAt']).optional().default('progress'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const adminCourseProgressQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).optional().default('1'),
  pageSize: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional()
    .default('10'),
  search: z.string().trim().max(100).optional(),
  instructorId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  sortBy: z
    .enum(['title', 'progress', 'students', 'completionRate'])
    .optional()
    .default('progress'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const progressHistoryQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).optional().default('1'),
  pageSize: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional()
    .default('10'),
  courseId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
  actionType: z.string().trim().max(50).optional(),
});

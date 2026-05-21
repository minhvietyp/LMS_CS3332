import { z } from 'zod';

export const enrollmentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const courseIdParamsSchema = z.object({
  courseId: z.string().uuid(),
});

export const enrollStudentSchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
});

export const updateEnrollmentStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'COMPLETED', 'DROPPED']),
});

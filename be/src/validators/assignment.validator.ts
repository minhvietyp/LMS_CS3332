import { z } from 'zod';

const uuidSchema = z.string().uuid();
const trimmedOptionalString = z.string().trim().min(1).optional();

export const assignmentIdParamsSchema = z.object({
  id: uuidSchema,
});

export const courseIdParamsSchema = z.object({
  courseId: uuidSchema,
});

export const submissionIdParamsSchema = z.object({
  submissionId: uuidSchema,
});

export const createAssignmentSchema = z.object({
  courseId: uuidSchema,
  title: z.string().trim().min(3).max(255),
  description: trimmedOptionalString,
  dueDate: z.string().datetime().optional().nullable(),
  allowLateSubmission: z.boolean().default(true),
});

export const updateAssignmentSchema = z
  .object({
    title: z.string().trim().min(3).max(255).optional(),
    description: trimmedOptionalString,
    dueDate: z.string().datetime().optional().nullable(),
    allowLateSubmission: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const submitAssignmentSchema = z.object({
  textContent: z.string().trim().optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().optional(),
})
  .refine((data) => Boolean(data.textContent || data.fileUrl), {
    message: 'Either text content or file URL must be provided',
    path: ['textContent'],
  })
  .refine((data) => !data.fileUrl || Boolean(data.fileName?.trim()), {
    message: 'File name is required when a file URL is provided',
    path: ['fileName'],
  });

export const gradeSubmissionSchema = z.object({
  grade: z.number().int().min(0).max(100),
  feedback: z.string().trim().optional(),
});

export const listSubmissionsSchema = z.object({
  status: z.enum(['ON_TIME', 'LATE', 'GRADED', 'RETURNED']).optional(),
  isLate: z.coerce.boolean().optional(),
});

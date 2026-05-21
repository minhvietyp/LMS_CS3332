import { z } from 'zod';
import { COURSE_STATUS } from '@shared/constants';

const statusEnum = z.enum([COURSE_STATUS.DRAFT, COURSE_STATUS.PUBLISHED, COURSE_STATUS.ARCHIVED]);

const courseTitleSchema = z.string().trim().min(3).max(200);
const courseDescriptionSchema = z.string().trim().max(5000);
const includeDeletedSchema = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value.length > 0;
  });

export const courseIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createCourseSchema = z.object({
  title: courseTitleSchema,
  description: courseDescriptionSchema.optional(),
});

export const updateCourseSchema = z
  .object({
    title: courseTitleSchema.optional(),
    description: courseDescriptionSchema.optional(),
  })
  .refine((value) => value.title !== undefined || value.description !== undefined, {
    message: 'At least one field must be provided',
  });

export const listCoursesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  search: z.string().trim().max(200).optional(),
  status: statusEnum.optional(),
  instructorId: z.string().uuid().optional(),
  includeDeleted: includeDeletedSchema,
  deletedOnly: includeDeletedSchema,
});

import { z } from 'zod';

const moduleTitleSchema = z.string().trim().min(1).max(200);
const lessonTitleSchema = z.string().trim().min(1).max(200);
const moduleOrderIndexSchema = z.coerce.number().int().min(0);
const lessonOrderIndexSchema = z.coerce.number().int().min(0);
const materialTypeSchema = z.enum(['pdf', 'slide', 'link', 'reading']);

export const courseIdParamsSchema = z.object({
  courseId: z.string().uuid(),
});

export const moduleRouteParamsSchema = z.object({
  moduleId: z.string().uuid(),
});

export const moduleIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const lessonRouteParamsSchema = z.object({
  lessonId: z.string().uuid(),
});

export const lessonIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const materialIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createModuleSchema = z.object({
  title: moduleTitleSchema,
  orderIndex: moduleOrderIndexSchema.optional(),
});

export const updateModuleSchema = z
  .object({
    title: moduleTitleSchema.optional(),
    orderIndex: moduleOrderIndexSchema.optional(),
  })
  .refine((value) => value.title !== undefined || value.orderIndex !== undefined, {
    message: 'At least one field must be provided',
  });

export const reorderModulesSchema = z.object({
  modules: z
    .array(
      z.object({
        id: z.string().uuid(),
        orderIndex: moduleOrderIndexSchema,
      }),
    )
    .min(1),
});

export const reorderLessonsSchema = z.object({
  lessons: z
    .array(
      z.object({
        id: z.string().uuid(),
        orderIndex: lessonOrderIndexSchema,
      }),
    )
    .min(1),
});

export const createLessonSchema = z.object({
  title: lessonTitleSchema,
  videoUrl: z.string().url().optional().nullable(),
  orderIndex: lessonOrderIndexSchema.optional(),
});

export const updateLessonSchema = z
  .object({
    title: lessonTitleSchema.optional(),
    videoUrl: z.string().url().optional().nullable(),
    orderIndex: lessonOrderIndexSchema.optional(),
    moduleId: z.string().uuid().optional(),
    isPublished: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.videoUrl !== undefined ||
      value.orderIndex !== undefined ||
      value.moduleId !== undefined ||
      value.isPublished !== undefined,
    {
      message: 'At least one field must be provided',
    },
  );

export const createMaterialSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: materialTypeSchema,
  url: z.string().url(),
});

export const createUploadedMaterialSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: materialTypeSchema,
});

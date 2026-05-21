import { z } from 'zod';
import { QUESTION_TYPE } from '@shared/constants';

const uuidSchema = z.string().uuid();
const trimmedOptionalString = z.string().trim().min(1).optional();

export const courseIdParamsSchema = z.object({
  courseId: uuidSchema,
});

export const quizIdParamsSchema = z.object({
  id: uuidSchema,
});

export const questionIdParamsSchema = z.object({
  questionId: uuidSchema,
});

export const quizAttemptResultParamsSchema = z.object({
  id: uuidSchema,
  attemptId: uuidSchema,
});

export const createQuizSchema = z.object({
  courseId: uuidSchema,
  title: z.string().trim().min(1).max(200),
  description: trimmedOptionalString,
  passingScore: z.number().int().min(0).max(100).default(60),
  maxAttempts: z.number().int().min(1).default(3),
});

export const updateQuizSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: trimmedOptionalString,
    passingScore: z.number().int().min(0).max(100).optional(),
    maxAttempts: z.number().int().min(1).optional(),
    isPublished: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

const answerOptionSchema = z.object({
  text: z.string().trim().min(1),
  isCorrect: z.boolean().default(false),
});

const questionBaseSchema = z.object({
  text: z.string().trim().min(1),
  type: z.enum([QUESTION_TYPE.MULTIPLE_CHOICE, QUESTION_TYPE.TRUE_FALSE]),
  orderIndex: z.number().int().min(0).optional(),
  options: z.array(answerOptionSchema).min(2),
});

function validateQuestionShape<T extends { type: string; options: Array<{ isCorrect: boolean }> }>(value: T, ctx: z.RefinementCtx) {
  const correctOptions = value.options.filter((option) => option.isCorrect);

  if (correctOptions.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Each question must have exactly one correct answer.',
      path: ['options'],
    });
  }

  if (value.type === QUESTION_TYPE.TRUE_FALSE && value.options.length !== 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'True/false questions must contain exactly two options.',
      path: ['options'],
    });
  }
}

export const createQuestionSchema = questionBaseSchema.superRefine(validateQuestionShape);

export const updateQuestionSchema = questionBaseSchema.partial().superRefine((value, ctx) => {
  if (value.options && value.type) {
    validateQuestionShape(
      {
        type: value.type,
        options: value.options,
      },
      ctx,
    );
  }

  if (value.options && !value.type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Question type is required when updating answer options.',
      path: ['type'],
    });
  }
});

export const submitQuizSchema = z.object({
  attemptId: uuidSchema,
  answers: z
    .array(
      z.object({
        questionId: uuidSchema,
        selectedOptionId: uuidSchema,
      }),
    )
    .min(1),
});

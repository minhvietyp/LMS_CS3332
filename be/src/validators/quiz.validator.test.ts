import { describe, expect, it } from 'vitest';
import {
  courseIdParamsSchema,
  createQuizSchema,
  questionIdParamsSchema,
  quizAttemptResultParamsSchema,
  quizIdParamsSchema,
  submitQuizSchema,
  updateQuestionSchema,
  updateQuizSchema,
} from './quiz.validator';

describe('quiz.validator', () => {
  it('accepts a valid create quiz payload and trims text fields', () => {
    const result = createQuizSchema.parse({
      courseId: '11111111-1111-1111-1111-111111111111',
      title: '  Module 1 quiz  ',
      description: '  Quiz basics  ',
      passingScore: 70,
      maxAttempts: 2,
    });

    expect(result).toEqual({
      courseId: '11111111-1111-1111-1111-111111111111',
      title: 'Module 1 quiz',
      description: 'Quiz basics',
      passingScore: 70,
      maxAttempts: 2,
    });
  });

  it('rejects an empty update quiz payload', () => {
    expect(() => updateQuizSchema.parse({})).toThrow('At least one field must be provided');
  });

  it('rejects updating options without a question type', () => {
    expect(() =>
      updateQuestionSchema.parse({
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
      }),
    ).toThrow('Question type is required when updating answer options.');
  });

  it('requires at least one answer when submitting a quiz', () => {
    expect(() =>
      submitQuizSchema.parse({
        attemptId: '11111111-1111-1111-1111-111111111111',
        answers: [],
      }),
    ).toThrow();
  });

  it('accepts valid quiz-related route params', () => {
    expect(courseIdParamsSchema.parse({ courseId: '11111111-1111-1111-1111-111111111111' }).courseId).toBe(
      '11111111-1111-1111-1111-111111111111',
    );
    expect(quizIdParamsSchema.parse({ id: '11111111-1111-1111-1111-111111111112' }).id).toBe(
      '11111111-1111-1111-1111-111111111112',
    );
    expect(questionIdParamsSchema.parse({ questionId: '11111111-1111-1111-1111-111111111113' }).questionId).toBe(
      '11111111-1111-1111-1111-111111111113',
    );
    expect(
      quizAttemptResultParamsSchema.parse({
        id: '11111111-1111-1111-1111-111111111114',
        attemptId: '11111111-1111-1111-1111-111111111115',
      }).attemptId,
    ).toBe('11111111-1111-1111-1111-111111111115');
  });

  it('rejects invalid quiz route params', () => {
    expect(() => courseIdParamsSchema.parse({ courseId: 'bad-id' })).toThrow();
    expect(() => quizIdParamsSchema.parse({ id: 'bad-id' })).toThrow();
    expect(() => questionIdParamsSchema.parse({ questionId: 'bad-id' })).toThrow();
    expect(() => quizAttemptResultParamsSchema.parse({ id: 'bad-id', attemptId: 'bad-id' })).toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import type { QuizListItem } from '../../../../../services/api/quizApi';
import { getQuizPublishReadiness } from '../../../../../pages/client/instructor/quiz-management/publishReadiness';

function buildQuiz(overrides: Partial<QuizListItem>): QuizListItem {
  return {
    id: 'quiz-1',
    courseId: 'course-1',
    title: 'Quiz 1',
    description: 'Description',
    passingScore: 60,
    maxAttempts: 3,
    isPublished: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    questions: [],
    _count: { attempts: 0 },
    ...overrides,
  };
}

describe('getQuizPublishReadiness', () => {
  it('blocks publishing when the quiz has no questions', () => {
    const readiness = getQuizPublishReadiness(buildQuiz({ questions: [] }));

    expect(readiness.canPublish).toBe(false);
    expect(readiness.label).toBe('Missing questions');
    expect(readiness.issues).toContain('Add at least one question before publishing.');
  });

  it('blocks publishing when a question has invalid answer configuration', () => {
    const readiness = getQuizPublishReadiness(
      buildQuiz({
        questions: [
          {
            id: 'question-1',
            text: 'React is a database',
            type: 'TRUE_FALSE',
            orderIndex: 0,
            answerOptions: [
              { id: 'option-1', text: 'True', isCorrect: false },
              { id: 'option-2', text: 'False', isCorrect: true },
              { id: 'option-3', text: 'Maybe', isCorrect: false },
            ],
          },
        ],
      }),
    );

    expect(readiness.canPublish).toBe(false);
    expect(readiness.label).toBe('Question validation required');
    expect(readiness.issues[0]).toContain('true/false questions need exactly two options');
  });

  it('marks a valid quiz as ready to publish', () => {
    const readiness = getQuizPublishReadiness(
      buildQuiz({
        questions: [
          {
            id: 'question-1',
            text: 'What is React?',
            type: 'MULTIPLE_CHOICE',
            orderIndex: 0,
            answerOptions: [
              { id: 'option-1', text: 'A library', isCorrect: true },
              { id: 'option-2', text: 'A database', isCorrect: false },
            ],
          },
        ],
      }),
    );

    expect(readiness.canPublish).toBe(true);
    expect(readiness.label).toBe('Ready to publish');
    expect(readiness.issues).toHaveLength(0);
  });
});

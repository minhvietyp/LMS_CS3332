import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@config/index', () => ({
  config: {
    app: {
      isProduction: false,
      isDevelopment: true,
    },
  },
}));

vi.mock('@config/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@config/prisma', () => ({
  default: {
    course: {
      findUnique: vi.fn(),
    },
    quiz: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    question: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    answerOption: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    enrollment: {
      findUnique: vi.fn(),
    },
    quizAttempt: {
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@shared/utils/jwt', () => ({
  verifyAccessToken: vi.fn(() => ({
    sub: 'instructor-1',
    email: 'instructor@lms.local',
    role: 'INSTRUCTOR',
  })),
}));

import prisma from '@config/prisma';
import { verifyAccessToken } from '@shared/utils/jwt';
import { errorHandler } from '@shared/middlewares/errorHandler';
import { quizzesRouter } from './quiz.routes';

const mockedPrisma = prisma as any;
const mockedVerifyAccessToken = vi.mocked(verifyAccessToken);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/quizzes', quizzesRouter);
  app.use(errorHandler);
  return app;
}

describe('quiz routes', () => {
  const courseId = '11111111-1111-1111-1111-111111111111';
  const quizId = '22222222-2222-2222-2222-222222222222';
  const questionId = '33333333-3333-3333-3333-333333333333';
  const attemptId = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    vi.clearAllMocks();
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'instructor-1',
      email: 'instructor@lms.local',
      role: 'INSTRUCTOR',
    } as any);
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });
  });

  it('lists quizzes for an owned course', async () => {
    mockedPrisma.quiz.findMany.mockResolvedValue([
      {
        id: quizId,
        courseId,
        title: 'Quiz 1',
        description: 'Basics',
        passingScore: 60,
        maxAttempts: 3,
        isPublished: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        questions: [],
        _count: { attempts: 0 },
      },
    ]);

    const response = await request(createApp())
      .get(`/api/v1/quizzes/courses/${courseId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0].title).toBe('Quiz 1');
  });

  it('creates a quiz for an owned course', async () => {
    mockedPrisma.quiz.create.mockResolvedValue({
      id: quizId,
      courseId,
      title: 'Module 1 quiz',
      description: 'Quiz basics',
      passingScore: 70,
      maxAttempts: 2,
      isPublished: false,
    });

    const response = await request(createApp())
      .post('/api/v1/quizzes')
      .set('Authorization', 'Bearer valid-token')
      .send({
        courseId,
        title: 'Module 1 quiz',
        description: 'Quiz basics',
        passingScore: 70,
        maxAttempts: 2,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.title).toBe('Module 1 quiz');
    expect(mockedPrisma.quiz.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          courseId,
          passingScore: 70,
          maxAttempts: 2,
        }),
      }),
    );
  });

  it('rejects invalid course id params before listing quizzes', async () => {
    const response = await request(createApp())
      .get('/api/v1/quizzes/courses/not-a-uuid')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
    expect(mockedPrisma.course.findUnique).not.toHaveBeenCalled();
  });

  it('rejects create quiz payloads without a course id', async () => {
    const response = await request(createApp())
      .post('/api/v1/quizzes')
      .set('Authorization', 'Bearer valid-token')
      .send({
        title: 'Module 1 quiz',
        passingScore: 70,
        maxAttempts: 2,
      });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
  });

  it('publishes a quiz when it has valid questions', async () => {
    mockedPrisma.quiz.findUnique.mockResolvedValue({
      id: quizId,
      courseId,
      isPublished: false,
      questions: [
        {
          id: questionId,
          answerOptions: [
            { id: 'option-1', text: 'A', isCorrect: true },
            { id: 'option-2', text: 'B', isCorrect: false },
          ],
        },
      ],
    });
    mockedPrisma.quiz.update.mockResolvedValue({
      id: quizId,
      isPublished: true,
    });

    const response = await request(createApp())
      .post(`/api/v1/quizzes/${quizId}/publish`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data.isPublished).toBe(true);
    expect(mockedPrisma.quiz.update).toHaveBeenCalledWith({
      where: { id: quizId },
      data: { isPublished: true },
    });
  });

  it('rejects publishing a quiz with no questions', async () => {
    mockedPrisma.quiz.findUnique.mockResolvedValue({
      id: quizId,
      courseId,
      isPublished: false,
      questions: [],
    });

    const response = await request(createApp())
      .post(`/api/v1/quizzes/${quizId}/publish`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Quiz must contain at least one question before publishing');
  });

  it('rejects publishing a true false quiz with more than two options', async () => {
    mockedPrisma.quiz.findUnique.mockResolvedValue({
      id: quizId,
      courseId,
      isPublished: false,
      questions: [
        {
          id: questionId,
          type: 'TRUE_FALSE',
          answerOptions: [
            { id: 'option-1', text: 'True', isCorrect: true },
            { id: 'option-2', text: 'False', isCorrect: false },
            { id: 'option-3', text: 'Maybe', isCorrect: false },
          ],
        },
      ],
    });

    const response = await request(createApp())
      .post(`/api/v1/quizzes/${quizId}/publish`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'True/false questions must contain exactly two options before publishing',
    );
  });

  it('unpublishes a published quiz', async () => {
    mockedPrisma.quiz.findUnique.mockResolvedValue({
      id: quizId,
      courseId,
      isPublished: true,
      questions: [],
    });
    mockedPrisma.quiz.update.mockResolvedValue({
      id: quizId,
      isPublished: false,
    });

    const response = await request(createApp())
      .post(`/api/v1/quizzes/${quizId}/unpublish`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data.isPublished).toBe(false);
  });

  it('adds a question with answer options to a draft quiz', async () => {
    mockedPrisma.quiz.findUnique.mockResolvedValue({
      id: quizId,
      courseId,
      isPublished: false,
    });
    mockedPrisma.question.count.mockResolvedValue(1);
    mockedPrisma.question.create.mockResolvedValue({
      id: questionId,
      text: 'What is JSX?',
      type: 'MULTIPLE_CHOICE',
      orderIndex: 1,
      answerOptions: [
        { id: 'option-1', text: 'Syntax extension', isCorrect: true },
        { id: 'option-2', text: 'Database engine', isCorrect: false },
      ],
    });

    const response = await request(createApp())
      .post(`/api/v1/quizzes/${quizId}/questions`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        text: 'What is JSX?',
        type: 'MULTIPLE_CHOICE',
        options: [
          { text: 'Syntax extension', isCorrect: true },
          { text: 'Database engine', isCorrect: false },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.data.answerOptions).toHaveLength(2);
  });

  it('rejects invalid true false question shape', async () => {
    const response = await request(createApp())
      .post(`/api/v1/quizzes/${quizId}/questions`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        text: 'React is a database',
        type: 'TRUE_FALSE',
        options: [
          { text: 'True', isCorrect: false },
          { text: 'False', isCorrect: true },
          { text: 'Maybe', isCorrect: false },
        ],
      });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
  });

  it('updates a question and replaces its answer options', async () => {
    mockedPrisma.question.findUnique.mockResolvedValue({
      id: questionId,
      quiz: {
        id: quizId,
        courseId,
        isPublished: false,
      },
    });

    mockedPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        question: {
          update: vi.fn().mockResolvedValue({ id: questionId }),
          findUnique: vi.fn().mockResolvedValue({
            id: questionId,
            text: 'Updated question',
            type: 'MULTIPLE_CHOICE',
            orderIndex: 2,
            answerOptions: [
              { id: 'option-1', text: 'Updated A', isCorrect: false },
              { id: 'option-2', text: 'Updated B', isCorrect: true },
            ],
          }),
        },
        answerOption: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      }),
    );

    const response = await request(createApp())
      .patch(`/api/v1/quizzes/questions/${questionId}`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        text: 'Updated question',
        type: 'MULTIPLE_CHOICE',
        orderIndex: 2,
        options: [
          { text: 'Updated A', isCorrect: false },
          { text: 'Updated B', isCorrect: true },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.text).toBe('Updated question');
    expect(response.body.data.answerOptions).toHaveLength(2);
  });

  it('rejects question updates that send options without a type', async () => {
    const response = await request(createApp())
      .patch(`/api/v1/quizzes/questions/${questionId}`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        options: [
          { text: 'Updated A', isCorrect: false },
          { text: 'Updated B', isCorrect: true },
        ],
      });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
  });

  it('deletes a draft question', async () => {
    mockedPrisma.question.findUnique.mockResolvedValue({
      id: questionId,
      quiz: {
        id: quizId,
        courseId,
        isPublished: false,
      },
    });
    mockedPrisma.question.delete.mockResolvedValue({ id: questionId });

    const response = await request(createApp())
      .delete(`/api/v1/quizzes/questions/${questionId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(204);
    expect(mockedPrisma.question.delete).toHaveBeenCalledWith({ where: { id: questionId } });
  });

  it('lists published quizzes for an enrolled student course', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.quiz.findMany.mockResolvedValue([
      {
        id: quizId,
        courseId,
        title: 'Published Quiz',
        description: 'Quiz description',
        passingScore: 70,
        maxAttempts: 3,
        isPublished: true,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        questions: [{ id: questionId, answerOptions: [] }],
      },
    ]);
    mockedPrisma.quizAttempt.count.mockResolvedValue(1);

    const response = await request(createApp())
      .get(`/api/v1/quizzes/courses/${courseId}/student`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data[0].attemptsRemaining).toBe(2);
  });

  it('rejects invalid result route params', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);

    const response = await request(createApp())
      .get('/api/v1/quizzes/not-a-uuid/results/not-a-uuid')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
    expect(mockedPrisma.quizAttempt.findFirst).not.toHaveBeenCalled();
  });

  it('starts a new student quiz attempt', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.quiz.findUnique.mockResolvedValue({
      id: quizId,
      courseId,
      isPublished: true,
      maxAttempts: 3,
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.quizAttempt.count.mockResolvedValue(1);
    mockedPrisma.quizAttempt.create.mockResolvedValue({
      id: attemptId,
      quizId,
      studentId: 'student-1',
      attemptNumber: 2,
    });

    const response = await request(createApp())
      .post(`/api/v1/quizzes/${quizId}/attempts/start`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(201);
    expect(response.body.data.attemptNumber).toBe(2);
  });

  it('lists student attempts newest first with derived status', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.quiz.findUnique.mockResolvedValue({
      id: quizId,
      courseId,
      isPublished: true,
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.quizAttempt.findMany.mockResolvedValue([
      {
        id: attemptId,
        quizId,
        studentId: 'student-1',
        attemptNumber: 2,
        score: null,
        isPassed: null,
        submittedAt: null,
        createdAt: new Date('2026-01-05T00:00:00.000Z'),
        updatedAt: new Date('2026-01-05T00:00:00.000Z'),
      },
      {
        id: attemptId,
        quizId,
        studentId: 'student-1',
        attemptNumber: 1,
        score: 90,
        isPassed: true,
        submittedAt: new Date('2026-01-04T00:00:00.000Z'),
        createdAt: new Date('2026-01-04T00:00:00.000Z'),
        updatedAt: new Date('2026-01-04T00:00:00.000Z'),
      },
    ]);

    const response = await request(createApp())
      .get(`/api/v1/quizzes/${quizId}/attempts/me`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data[0].attemptNumber).toBe(2);
    expect(response.body.data[0].status).toBe('STARTED');
    expect(response.body.data[1].status).toBe('PASSED');
  });

  it('rejects starting a new attempt when the maximum attempts are reached', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.quiz.findUnique.mockResolvedValue({
      id: quizId,
      courseId,
      isPublished: true,
      maxAttempts: 2,
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.quizAttempt.count.mockResolvedValue(2);

    const response = await request(createApp())
      .post(`/api/v1/quizzes/${quizId}/attempts/start`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Maximum attempts reached');
    expect(mockedPrisma.quizAttempt.create).not.toHaveBeenCalled();
  });

  it('submits a started attempt and grades the answers', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.quiz.findUnique.mockResolvedValue({
      id: quizId,
      courseId,
      isPublished: true,
      maxAttempts: 3,
      passingScore: 60,
      questions: [
        {
          id: '11111111-1111-1111-1111-111111111112',
          answerOptions: [
            { id: '11111111-1111-1111-1111-111111111113', text: 'Correct', isCorrect: true },
            { id: '11111111-1111-1111-1111-111111111114', text: 'Wrong', isCorrect: false },
          ],
        },
      ],
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.quizAttempt.findFirst.mockResolvedValue({
      id: attemptId,
      quizId,
      studentId: 'student-1',
      submittedAt: null,
    });
    mockedPrisma.quizAttempt.update.mockResolvedValue({
      id: attemptId,
      score: 100,
      isPassed: true,
    });

    const response = await request(createApp())
      .post(`/api/v1/quizzes/${quizId}/submit`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        attemptId: '11111111-1111-1111-1111-111111111111',
        answers: [
          {
            questionId: '11111111-1111-1111-1111-111111111112',
            selectedOptionId: '11111111-1111-1111-1111-111111111113',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(mockedPrisma.quizAttempt.update).toHaveBeenCalled();
  });

  it('rejects duplicate question answers during submission', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.quiz.findUnique.mockResolvedValue({
      id: quizId,
      courseId,
      isPublished: true,
      maxAttempts: 3,
      passingScore: 60,
      questions: [
        {
          id: '11111111-1111-1111-1111-111111111112',
          answerOptions: [
            { id: '11111111-1111-1111-1111-111111111113', text: 'Correct', isCorrect: true },
            { id: '11111111-1111-1111-1111-111111111114', text: 'Wrong', isCorrect: false },
          ],
        },
      ],
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.quizAttempt.findFirst.mockResolvedValue({
      id: attemptId,
      quizId,
      studentId: 'student-1',
      submittedAt: null,
    });

    const response = await request(createApp())
      .post(`/api/v1/quizzes/${quizId}/submit`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        attemptId: '11111111-1111-1111-1111-111111111111',
        answers: [
          {
            questionId: '11111111-1111-1111-1111-111111111112',
            selectedOptionId: '11111111-1111-1111-1111-111111111113',
          },
          {
            questionId: '11111111-1111-1111-1111-111111111112',
            selectedOptionId: '11111111-1111-1111-1111-111111111114',
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Duplicate answers for the same question are not allowed');
  });

  it('rejects submitted options that do not belong to the question', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.quiz.findUnique.mockResolvedValue({
      id: quizId,
      courseId,
      isPublished: true,
      maxAttempts: 3,
      passingScore: 60,
      questions: [
        {
          id: '11111111-1111-1111-1111-111111111112',
          answerOptions: [
            { id: '11111111-1111-1111-1111-111111111113', text: 'Correct', isCorrect: true },
            { id: '11111111-1111-1111-1111-111111111114', text: 'Wrong', isCorrect: false },
          ],
        },
      ],
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId,
    });
    mockedPrisma.quizAttempt.findFirst.mockResolvedValue({
      id: attemptId,
      quizId,
      studentId: 'student-1',
      submittedAt: null,
    });

    const response = await request(createApp())
      .post(`/api/v1/quizzes/${quizId}/submit`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        attemptId: '11111111-1111-1111-1111-111111111111',
        answers: [
          {
            questionId: '11111111-1111-1111-1111-111111111112',
            selectedOptionId: '11111111-1111-1111-1111-111111111199',
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Submitted answer option does not belong to the specified question',
    );
  });

  it('returns the result for a student-owned attempt', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);
    mockedPrisma.quizAttempt.findFirst.mockResolvedValue({
      id: attemptId,
      attemptNumber: 1,
      score: 88,
      isPassed: true,
      submittedAt: new Date('2026-01-03T00:00:00.000Z'),
      quiz: {
        id: quizId,
        title: 'Quiz 1',
        passingScore: 60,
        questions: [
          {
            id: questionId,
            text: 'What is React?',
            answerOptions: [
              { id: 'option-1', text: 'A library', isCorrect: true },
              { id: 'option-2', text: 'A database', isCorrect: false },
            ],
          },
        ],
      },
      answers: [
        {
          questionId,
          selectedOptionId: 'option-1',
          isCorrect: true,
        },
      ],
    });

    const response = await request(createApp())
      .get(`/api/v1/quizzes/${quizId}/results/${attemptId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data.score).toBe(88);
    expect(response.body.data.correctCount).toBe(1);
    expect(response.body.data.totalQuestions).toBe(1);
    expect(response.body.data.answers[0].correctOptionText).toBe('A library');
  });
});

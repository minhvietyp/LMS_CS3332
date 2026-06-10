import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { progressServiceMock, authenticateMock, authorizeMock } = vi.hoisted(() => ({
  progressServiceMock: {
    markComplete: vi.fn(),
    setLessonState: vi.fn(),
    getCourseProgress: vi.fn(),
    getAllStudentProgress: vi.fn(),
    getInstructorCourseProgress: vi.fn(),
    getInstructorStudentCourseProgress: vi.fn(),
    getAdminProgressOverview: vi.fn(),
    getAdminCourseProgressList: vi.fn(),
    getMyProgressHistory: vi.fn(),
    getCourseProgressHistory: vi.fn(),
    getStudentCourseProgressHistory: vi.fn(),
    getProgressOverview: vi.fn(),
    getProgressOverviewSummary: vi.fn(),
    getActivityTimeline: vi.fn(),
  },
  authenticateMock: vi.fn((req: any, _res: any, next: any) => {
    req.user = { sub: 'student-1', role: 'STUDENT', email: 'student@example.com' };
    next();
  }),
  authorizeMock: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

vi.mock('@config/index', () => ({
  config: { app: { isProduction: false, isDevelopment: true, trustProxy: false } },
}));

vi.mock('@config/logger', () => ({ default: { error: vi.fn(), info: vi.fn() } }));

vi.mock('@shared/middlewares/authenticate', () => ({ authenticate: authenticateMock }));
vi.mock('@shared/middlewares/authorize', () => ({ authorize: authorizeMock }));

vi.mock('../services/progress.service', () => ({
  ProgressService: vi.fn(function ProgressService() {
    return progressServiceMock;
  }),
}));

import { errorHandler } from '@shared/middlewares/errorHandler';
import { ForbiddenError } from '@shared/errors/AppError';
import { progressRouter } from './progress.routes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/progress', progressRouter);
  app.use(errorHandler);
  return app;
}

describe('progress routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks a lesson as complete for a student', async () => {
    progressServiceMock.markComplete.mockResolvedValue({ id: 'progress-1', isCompleted: true });

    const response = await request(createApp())
      .patch('/api/v1/progress/lessons/11111111-1111-1111-1111-111111111111/complete')
      .set('Authorization', 'Bearer valid-token')
      .send({ isCompleted: true });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Lesson progress updated successfully');
    expect(progressServiceMock.markComplete).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      'student-1',
      true,
    );
  });

  it('rejects invalid lesson id before reaching service', async () => {
    const response = await request(createApp())
      .patch('/api/v1/progress/lessons/not-a-uuid/complete')
      .set('Authorization', 'Bearer valid-token')
      .send({ isCompleted: true });

    expect(response.status).toBe(422);
    expect(progressServiceMock.markComplete).not.toHaveBeenCalled();
  });

  it('returns forbidden when student not enrolled', async () => {
    progressServiceMock.markComplete.mockRejectedValue(
      ForbiddenError('Student is not enrolled in this course'),
    );

    const response = await request(createApp())
      .patch('/api/v1/progress/lessons/11111111-1111-1111-1111-111111111111/complete')
      .set('Authorization', 'Bearer valid-token')
      .send({ isCompleted: true });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('sets lesson state for a student', async () => {
    progressServiceMock.setLessonState.mockResolvedValue({ id: 'progress-1', isCompleted: false });

    const response = await request(createApp())
      .patch('/api/v1/progress/lessons/11111111-1111-1111-1111-111111111111/state')
      .set('Authorization', 'Bearer valid-token')
      .send({ state: 'IN_PROGRESS' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Lesson state updated successfully');
    expect(progressServiceMock.setLessonState).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      'student-1',
      'IN_PROGRESS',
    );
  });

  it('rejects invalid course id for student my-progress route', async () => {
    const response = await request(createApp())
      .get('/api/v1/progress/courses/not-a-uuid/my-progress')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(422);
    expect(progressServiceMock.getCourseProgress).not.toHaveBeenCalled();
  });

  describe('Progress Overview Endpoints', () => {
    it('returns progress overview for authenticated student', async () => {
      progressServiceMock.getProgressOverview.mockResolvedValue({
        summary: {
          totalCourses: 2,
          activeCourses: 1,
          completedCourses: 1,
          droppedCourses: 0,
          overallProgress: 50,
          lastActivityAt: new Date('2026-01-15'),
        },
        courses: [
          {
            courseId: 'course-1',
            courseTitle: 'Course 1',
            courseThumbnail: null,
            instructorName: 'Instructor A',
            enrollmentStatus: 'ACTIVE',
            percentage: 50,
            weightedPercentage: 50,
          },
        ],
      });

      const response = await request(createApp())
        .get('/api/v1/progress/overview')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('courses');
      expect(response.body.data.summary.totalCourses).toBe(2);
      expect(progressServiceMock.getProgressOverview).toHaveBeenCalledWith('student-1');
    });

    it('returns progress summary for authenticated student', async () => {
      progressServiceMock.getProgressOverviewSummary.mockResolvedValue({
        summary: {
          totalCourses: 2,
          activeCourses: 1,
          completedCourses: 1,
          droppedCourses: 0,
          overallProgress: 50,
          lastActivityAt: new Date('2026-01-15'),
        },
      });

      const response = await request(createApp())
        .get('/api/v1/progress/overview/summary')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary.totalCourses).toBe(2);
      expect(progressServiceMock.getProgressOverviewSummary).toHaveBeenCalledWith('student-1');
    });

    it('returns activity timeline with default pagination', async () => {
      progressServiceMock.getActivityTimeline.mockResolvedValue({
        activities: [
          {
            id: 'a1',
            type: 'LESSON_COMPLETED',
            courseId: 'course-1',
            courseTitle: 'Course 1',
            description: 'Completed lesson: Introduction',
            timestamp: new Date('2026-01-15'),
          },
        ],
        hasMore: false,
      });

      const response = await request(createApp())
        .get('/api/v1/progress/overview/timeline')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('activities');
      expect(response.body.data).toHaveProperty('hasMore');
      expect(progressServiceMock.getActivityTimeline).toHaveBeenCalledWith('student-1', 10, 0);
    });

    it('returns activity timeline with custom limit and offset', async () => {
      progressServiceMock.getActivityTimeline.mockResolvedValue({
        activities: [],
        hasMore: false,
      });

      const response = await request(createApp())
        .get('/api/v1/progress/overview/timeline?limit=5&offset=10')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(progressServiceMock.getActivityTimeline).toHaveBeenCalledWith('student-1', 5, 10);
    });

    it('caps limit at 50 for timeline', async () => {
      progressServiceMock.getActivityTimeline.mockResolvedValue({
        activities: [],
        hasMore: false,
      });

      const response = await request(createApp())
        .get('/api/v1/progress/overview/timeline?limit=100&offset=0')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(progressServiceMock.getActivityTimeline).toHaveBeenCalledWith('student-1', 50, 0);
    });

    it('rejects invalid limit parameter', async () => {
      const response = await request(createApp())
        .get('/api/v1/progress/overview/timeline?limit=abc')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(422);
      expect(progressServiceMock.getActivityTimeline).not.toHaveBeenCalled();
    });

    it('rejects negative offset parameter', async () => {
      const response = await request(createApp())
        .get('/api/v1/progress/overview/timeline?offset=-1')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(422);
      expect(progressServiceMock.getActivityTimeline).not.toHaveBeenCalled();
    });
  });

  describe('Instructor progress endpoints', () => {
    it('returns instructor course progress with query filters', async () => {
      authenticateMock.mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = { sub: 'instructor-1', role: 'INSTRUCTOR', email: 'instructor@example.com' };
        next();
      });
      progressServiceMock.getInstructorCourseProgress.mockResolvedValue({
        course: { id: '11111111-1111-1111-1111-111111111111', title: 'Course A' },
        students: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const response = await request(createApp())
        .get(
          '/api/v1/progress/courses/11111111-1111-1111-1111-111111111111/students-progress?status=ACTIVE&page=1&pageSize=10',
        )
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(progressServiceMock.getInstructorCourseProgress).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        { sub: 'instructor-1', role: 'INSTRUCTOR', email: 'instructor@example.com' },
        expect.objectContaining({ status: 'ACTIVE', page: 1, pageSize: 10 }),
      );
    });

    it('returns instructor student course progress detail', async () => {
      authenticateMock.mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = { sub: 'instructor-1', role: 'INSTRUCTOR', email: 'instructor@example.com' };
        next();
      });
      progressServiceMock.getInstructorStudentCourseProgress.mockResolvedValue({
        student: {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'Student A',
          email: 'student@example.com',
        },
        course: { id: '11111111-1111-1111-1111-111111111111', title: 'Course A' },
        summary: { percentage: 50 },
        lessons: [],
      });

      const response = await request(createApp())
        .get(
          '/api/v1/progress/courses/11111111-1111-1111-1111-111111111111/students/22222222-2222-2222-2222-222222222222',
        )
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(progressServiceMock.getInstructorStudentCourseProgress).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        { sub: 'instructor-1', role: 'INSTRUCTOR', email: 'instructor@example.com' },
      );
    });

    it('rejects invalid student progress params before reaching service', async () => {
      const response = await request(createApp())
        .get('/api/v1/progress/courses/not-a-uuid/students/also-not-a-uuid')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(422);
      expect(progressServiceMock.getInstructorStudentCourseProgress).not.toHaveBeenCalled();
    });

    it('rejects invalid instructor progress query before reaching service', async () => {
      const response = await request(createApp())
        .get(
          '/api/v1/progress/courses/11111111-1111-1111-1111-111111111111/students-progress?sortBy=invalid',
        )
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(422);
      expect(progressServiceMock.getInstructorCourseProgress).not.toHaveBeenCalled();
    });
  });

  describe('Admin progress endpoints', () => {
    it('returns admin progress overview', async () => {
      authenticateMock.mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = { sub: 'admin-1', role: 'ADMIN', email: 'admin@example.com' };
        next();
      });
      progressServiceMock.getAdminProgressOverview.mockResolvedValue({
        summary: { totalCourses: 4, totalStudents: 20 },
      });

      const response = await request(createApp())
        .get('/api/v1/progress/admin/overview')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(progressServiceMock.getAdminProgressOverview).toHaveBeenCalled();
    });

    it('returns admin course progress list', async () => {
      authenticateMock.mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = { sub: 'admin-1', role: 'ADMIN', email: 'admin@example.com' };
        next();
      });
      progressServiceMock.getAdminCourseProgressList.mockResolvedValue({
        courses: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const response = await request(createApp())
        .get('/api/v1/progress/admin/courses?sortBy=progress&sortOrder=desc')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(progressServiceMock.getAdminCourseProgressList).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'progress', sortOrder: 'desc' }),
      );
    });

    it('rejects invalid admin course query before reaching service', async () => {
      const response = await request(createApp())
        .get('/api/v1/progress/admin/courses?pageSize=1000')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(422);
      expect(progressServiceMock.getAdminCourseProgressList).not.toHaveBeenCalled();
    });
  });

  describe('Progress history endpoints', () => {
    it('returns student self progress history', async () => {
      progressServiceMock.getMyProgressHistory.mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const response = await request(createApp())
        .get('/api/v1/progress/history/me?page=1&pageSize=10')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(progressServiceMock.getMyProgressHistory).toHaveBeenCalledWith(
        'student-1',
        expect.objectContaining({ page: 1, pageSize: 10 }),
      );
    });

    it('returns course progress history for instructor', async () => {
      authenticateMock.mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = { sub: 'instructor-1', role: 'INSTRUCTOR', email: 'instructor@example.com' };
        next();
      });
      progressServiceMock.getCourseProgressHistory.mockResolvedValue({
        items: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const response = await request(createApp())
        .get('/api/v1/progress/courses/11111111-1111-1111-1111-111111111111/history')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(progressServiceMock.getCourseProgressHistory).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        { sub: 'instructor-1', role: 'INSTRUCTOR', email: 'instructor@example.com' },
        expect.objectContaining({ page: 1, pageSize: 10 }),
      );
    });

    it('rejects invalid history query before reaching service', async () => {
      const response = await request(createApp())
        .get('/api/v1/progress/history/me?courseId=bad-uuid')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(422);
      expect(progressServiceMock.getMyProgressHistory).not.toHaveBeenCalled();
    });

    it('passes validated query to student course history endpoint', async () => {
      authenticateMock.mockImplementationOnce((req: any, _res: any, next: any) => {
        req.user = { sub: 'instructor-1', role: 'INSTRUCTOR', email: 'instructor@example.com' };
        next();
      });
      progressServiceMock.getStudentCourseProgressHistory.mockResolvedValue({
        items: [],
        pagination: { page: 2, pageSize: 5, total: 0, totalPages: 0 },
      });

      const response = await request(createApp())
        .get(
          '/api/v1/progress/courses/11111111-1111-1111-1111-111111111111/students/22222222-2222-2222-2222-222222222222/history?page=2&pageSize=5&actionType=MARK_COMPLETE',
        )
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(progressServiceMock.getStudentCourseProgressHistory).toHaveBeenCalledWith(
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        { sub: 'instructor-1', role: 'INSTRUCTOR', email: 'instructor@example.com' },
        expect.objectContaining({ page: 2, pageSize: 5, actionType: 'MARK_COMPLETE' }),
      );
    });
  });
});

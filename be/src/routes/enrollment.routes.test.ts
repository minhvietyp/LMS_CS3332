import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { enrollmentServiceMock, authenticateMock, authorizeMock } = vi.hoisted(() => ({
  enrollmentServiceMock: {
    enroll: vi.fn(),
    unenroll: vi.fn(),
    updateStatus: vi.fn(),
    listByCourse: vi.fn(),
    listByStudent: vi.fn(),
    getMyEnrollmentStatus: vi.fn(),
  },
  authenticateMock: vi.fn((req: any, _res: any, next: any) => {
    req.user = {
      sub: 'student-1',
      role: 'STUDENT',
      email: 'student@example.com',
    };
    next();
  }),
  authorizeMock: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

vi.mock('@config/index', () => ({
  config: {
    app: {
      isProduction: false,
      isDevelopment: true,
      trustProxy: false,
    },
  },
}));

vi.mock('@config/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@shared/middlewares/authenticate', () => ({
  authenticate: authenticateMock,
}));

vi.mock('@shared/middlewares/authorize', () => ({
  authorize: authorizeMock,
}));

vi.mock('../services/enrollment.service', () => ({
  EnrollmentService: vi.fn(function EnrollmentService() {
    return enrollmentServiceMock;
  }),
}));

import { errorHandler } from '@shared/middlewares/errorHandler';
import { NotFoundError } from '@shared/errors/AppError';
import { enrollmentsRouter } from './enrollment.routes';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/enrollments', enrollmentsRouter);
  app.use(errorHandler);
  return app;
}

describe('enrollment routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current enrollment status for a student course', async () => {
    enrollmentServiceMock.getMyEnrollmentStatus.mockResolvedValue({
      enrollmentId: 'enrollment-1',
      enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
      enrollmentUpdatedAt: new Date('2026-01-02T00:00:00.000Z'),
      status: 'ACTIVE',
      course: {
        id: 'course-1',
        title: 'React Basics',
        instructor: { id: 'instructor-1', name: 'Instructor One' },
      },
      progress: {
        totalLessons: 8,
        completedLessons: 3,
        percentage: 38,
        enrollmentStatus: 'ACTIVE',
        lastProgressAt: new Date('2026-01-03T00:00:00.000Z'),
      },
    });

    const response = await request(createApp()).get(
      '/api/v1/enrollments/my-courses/11111111-1111-1111-1111-111111111111/status',
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Course enrollment status retrieved successfully');
    expect(response.body.data.enrollmentId).toBe('enrollment-1');
    expect(enrollmentServiceMock.getMyEnrollmentStatus).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      'student-1',
    );
    expect(authenticateMock).toHaveBeenCalled();
  });

  it('rejects an invalid course id before reaching the service', async () => {
    const response = await request(createApp()).get(
      '/api/v1/enrollments/my-courses/not-a-uuid/status',
    );

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(enrollmentServiceMock.getMyEnrollmentStatus).not.toHaveBeenCalled();
  });

  it('updates an enrollment status for instructors', async () => {
    enrollmentServiceMock.updateStatus.mockResolvedValue({
      id: 'enrollment-1',
      status: 'DROPPED',
    });

    const response = await request(createApp())
      .patch('/api/v1/enrollments/11111111-1111-1111-1111-111111111111/status')
      .set('Authorization', 'Bearer valid-token')
      .send({ status: 'DROPPED' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Enrollment status updated successfully');
    expect(enrollmentServiceMock.updateStatus).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      'student-1',
      'STUDENT',
      'DROPPED',
    );
  });

  it('rejects malformed enrollment status payloads', async () => {
    const response = await request(createApp())
      .patch('/api/v1/enrollments/11111111-1111-1111-1111-111111111111/status')
      .set('Authorization', 'Bearer valid-token')
      .send({ status: 'FINISHED' });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(enrollmentServiceMock.updateStatus).not.toHaveBeenCalled();
  });

  it('rejects malformed enroll payloads', async () => {
    const response = await request(createApp())
      .post('/api/v1/enrollments')
      .set('Authorization', 'Bearer valid-token')
      .send({ studentId: 'not-a-uuid', courseId: '11111111-1111-1111-1111-111111111111' });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(enrollmentServiceMock.enroll).not.toHaveBeenCalled();
  });

  it('returns not found when the student has no active enrollment', async () => {
    enrollmentServiceMock.getMyEnrollmentStatus.mockRejectedValue(
      NotFoundError('Enrollment not found'),
    );

    const response = await request(createApp()).get(
      '/api/v1/enrollments/my-courses/11111111-1111-1111-1111-111111111111/status',
    );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Enrollment not found');
  });
});

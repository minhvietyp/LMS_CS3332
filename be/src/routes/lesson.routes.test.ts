import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@config/index', () => ({
  config: {
    app: {
      isProduction: false,
      isDevelopment: true,
    },
    bcrypt: {
      rounds: 12,
    },
    jwt: {
      accessSecret: 'test-secret',
      accessExpiresIn: '15m',
      refreshTokenDays: 7,
      refreshCookieName: 'refresh_token',
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
    course: { findUnique: vi.fn() },
    courseModule: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    lesson: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    lessonMaterial: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@shared/utils/jwt', () => ({
  verifyAccessToken: vi.fn(() => ({
    sub: 'instructor-1',
    email: 'teacher@lms.local',
    role: 'INSTRUCTOR',
  })),
}));

vi.mock('@shared/utils/cloudinary', () => ({
  uploadRawBuffer: vi.fn(),
}));

import prisma from '@config/prisma';
import { errorHandler } from '@shared/middlewares/errorHandler';
import { verifyAccessToken } from '@shared/utils/jwt';
import { uploadRawBuffer } from '@shared/utils/cloudinary';
import { lessonsRouter } from './lesson.routes';

const mockedPrisma = prisma as any;
const mockedVerifyAccessToken = vi.mocked(verifyAccessToken);
const mockedUploadRawBuffer = vi.mocked(uploadRawBuffer);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/lessons', lessonsRouter);
  app.use(errorHandler);
  return app;
}

describe('lesson routes', () => {
  const courseId = '11111111-1111-1111-1111-111111111111';
  const moduleId = '22222222-2222-2222-2222-222222222222';
  const otherModuleId = '33333333-3333-3333-3333-333333333333';
  const lessonId = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    vi.clearAllMocks();
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'instructor-1',
      email: 'teacher@lms.local',
      role: 'INSTRUCTOR',
    } as any);
  });

  it('creates a module for an owned course', async () => {
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });
    mockedPrisma.courseModule.findFirst.mockResolvedValue({ orderIndex: 0 });
    mockedPrisma.courseModule.create.mockResolvedValue({
      id: moduleId,
      courseId,
      title: 'Module 2',
      orderIndex: 1,
    });

    const response = await request(createApp())
      .post(`/api/v1/lessons/courses/${courseId}/modules`)
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Module 2' });

    expect(response.status).toBe(201);
    expect(response.body.data.title).toBe('Module 2');
  });

  it('lists modules for an owned course', async () => {
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });
    mockedPrisma.courseModule.findMany.mockResolvedValue([
      {
        id: moduleId,
        courseId,
        title: 'Module 1',
        orderIndex: 0,
        lessons: [{ id: 'lesson-1', title: 'Lesson 1', orderIndex: 0 }],
      },
    ]);

    const response = await request(createApp())
      .get(`/api/v1/lessons/courses/${courseId}/modules`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data[0].lessons).toHaveLength(1);
  });

  it('reorders modules for an owned course', async () => {
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });
    mockedPrisma.courseModule.findMany.mockResolvedValue([{ id: moduleId }, { id: otherModuleId }]);
    mockedPrisma.courseModule.update.mockImplementation(async ({ where, data }: any) => ({
      id: where.id,
      orderIndex: data.orderIndex,
    }));
    mockedPrisma.$transaction.mockImplementation(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
    );

    const response = await request(createApp())
      .patch(`/api/v1/lessons/courses/${courseId}/modules/reorder`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        modules: [
          { id: otherModuleId, orderIndex: 0 },
          { id: moduleId, orderIndex: 1 },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Modules reordered successfully');
  });

  it('deletes a module for an owned course', async () => {
    mockedPrisma.courseModule.findFirst.mockResolvedValue({
      id: moduleId,
      courseId,
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });
    mockedPrisma.courseModule.delete.mockResolvedValue({
      id: moduleId,
      courseId,
    });

    const response = await request(createApp())
      .delete(`/api/v1/lessons/modules/${moduleId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Module deleted successfully');
  });

  it('creates a lesson for an owned module', async () => {
    mockedPrisma.courseModule.findFirst.mockResolvedValue({
      id: moduleId,
      courseId,
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });
    mockedPrisma.lesson.findFirst.mockResolvedValue({ orderIndex: 0 });
    mockedPrisma.lesson.create.mockResolvedValue({
      id: lessonId,
      moduleId,
      title: 'Lesson 2',
      videoUrl: 'https://example.com/lesson-2',
      orderIndex: 1,
      isPublished: false,
    });

    const response = await request(createApp())
      .post(`/api/v1/lessons/modules/${moduleId}/lessons`)
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Lesson 2', videoUrl: 'https://example.com/lesson-2' });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Lesson created successfully');
    expect(response.body.data.id).toBe(lessonId);
  });

  it('loads lesson detail for an owned lesson', async () => {
    mockedPrisma.lesson.findFirst.mockResolvedValue({
      id: lessonId,
      moduleId,
      title: 'Lesson detail',
      videoUrl: null,
      orderIndex: 0,
      isPublished: false,
      deletedAt: null,
      module: { id: moduleId, courseId, title: 'Module 1', orderIndex: 0 },
      materials: [
        {
          id: '55555555-5555-5555-5555-555555555555',
          lessonId,
          title: 'Handout',
          type: 'pdf',
          url: 'https://cdn.example.com/handout.pdf',
        },
      ],
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });

    const response = await request(createApp())
      .get(`/api/v1/lessons/lessons/${lessonId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Lesson loaded successfully');
    expect(response.body.data.materials).toHaveLength(1);
  });

  it('reorders lessons for an owned module', async () => {
    mockedPrisma.courseModule.findFirst.mockResolvedValue({
      id: moduleId,
      courseId,
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });
    mockedPrisma.lesson.findMany.mockResolvedValue([
      { id: lessonId },
      { id: '55555555-5555-5555-5555-555555555555' },
    ]);
    mockedPrisma.lesson.update.mockImplementation(async ({ where, data }: any) => ({
      id: where.id,
      orderIndex: data.orderIndex,
    }));
    mockedPrisma.$transaction.mockImplementation(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
    );

    const response = await request(createApp())
      .patch(`/api/v1/lessons/modules/${moduleId}/lessons/reorder`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        lessons: [
          { id: '55555555-5555-5555-5555-555555555555', orderIndex: 0 },
          { id: lessonId, orderIndex: 1 },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Lessons reordered successfully');
  });

  it('updates an owned lesson', async () => {
    mockedPrisma.lesson.findFirst.mockResolvedValue({
      id: lessonId,
      moduleId,
      module: { id: moduleId, courseId },
      deletedAt: null,
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });
    mockedPrisma.lesson.update.mockResolvedValue({
      id: lessonId,
      moduleId,
      title: 'Updated lesson',
      videoUrl: 'https://example.com/updated',
      orderIndex: 0,
      isPublished: false,
    });

    const response = await request(createApp())
      .patch(`/api/v1/lessons/lessons/${lessonId}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated lesson', videoUrl: 'https://example.com/updated' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Lesson updated successfully');
    expect(response.body.data.title).toBe('Updated lesson');
  });

  it('soft deletes an owned lesson', async () => {
    mockedPrisma.lesson.findFirst.mockResolvedValue({
      id: lessonId,
      moduleId,
      module: { id: moduleId, courseId },
      deletedAt: null,
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });
    mockedPrisma.lesson.update.mockResolvedValue({
      id: lessonId,
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedBy: 'instructor-1',
    });

    const response = await request(createApp())
      .delete(`/api/v1/lessons/lessons/${lessonId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Lesson deleted successfully');
  });

  it('lists materials for an owned lesson', async () => {
    mockedPrisma.lesson.findFirst.mockResolvedValue({
      id: lessonId,
      moduleId,
      module: { id: moduleId, courseId },
      deletedAt: null,
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });
    mockedPrisma.lessonMaterial.findMany.mockResolvedValue([
      {
        id: '55555555-5555-5555-5555-555555555555',
        lessonId,
        title: 'Handout',
        type: 'pdf',
        url: 'https://cdn.example.com/handout.pdf',
      },
    ]);

    const response = await request(createApp())
      .get(`/api/v1/lessons/lessons/${lessonId}/materials`)
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it('uploads a lesson material file for an owned lesson', async () => {
    mockedPrisma.lesson.findFirst.mockResolvedValue({
      id: lessonId,
      moduleId,
      module: { id: moduleId, courseId },
      deletedAt: null,
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });
    mockedUploadRawBuffer.mockResolvedValue({
      secureUrl: 'https://cdn.example.com/material.pdf',
      publicId: 'lms/lesson-materials/material-1',
    });
    mockedPrisma.lessonMaterial.create.mockResolvedValue({
      id: '55555555-5555-5555-5555-555555555555',
      lessonId,
      title: 'Lesson handout',
      type: 'pdf',
      url: 'https://cdn.example.com/material.pdf',
    });

    const response = await request(createApp())
      .post(`/api/v1/lessons/lessons/${lessonId}/materials/upload`)
      .set('Authorization', 'Bearer valid-token')
      .field('title', 'Lesson handout')
      .field('type', 'pdf')
      .attach('file', Buffer.from('material-bytes'), {
        filename: 'handout.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Material uploaded successfully');
    expect(response.body.data.url).toBe('https://cdn.example.com/material.pdf');
  });

  it('rejects lesson material upload when file is missing', async () => {
    const response = await request(createApp())
      .post(`/api/v1/lessons/lessons/${lessonId}/materials/upload`)
      .set('Authorization', 'Bearer valid-token')
      .field('title', 'Lesson handout')
      .field('type', 'pdf');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Material file is required');
  });

  it('rejects unsupported file types for lesson material upload', async () => {
    const response = await request(createApp())
      .post(`/api/v1/lessons/lessons/${lessonId}/materials/upload`)
      .set('Authorization', 'Bearer valid-token')
      .field('title', 'Executable')
      .field('type', 'reading')
      .attach('file', Buffer.from('binary'), {
        filename: 'app.exe',
        contentType: 'application/octet-stream',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Only image uploads are allowed');
  });

  it('rejects module creation for a non-owner instructor', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'instructor-2',
      email: 'other@lms.local',
      role: 'INSTRUCTOR',
    } as any);
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: courseId,
      instructorId: 'instructor-1',
    });

    const response = await request(createApp())
      .post(`/api/v1/lessons/courses/${courseId}/modules`)
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Module 2' });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      'You do not have permission to manage content for this course',
    );
  });
});

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
    cloudinary: {
      cloudName: '',
      apiKey: '',
      apiSecret: '',
    },
    upload: {
      materialMaxSizeMb: 100,
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
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    enrollment: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@shared/utils/jwt', () => ({
  verifyAccessToken: vi.fn(() => ({
    sub: 'admin-1',
    email: 'admin@lms.local',
    role: 'ADMIN',
  })),
  signAccessToken: vi.fn(() => 'mock-access-token'),
}));

vi.mock('@shared/utils/cloudinary', () => ({
  uploadImageBuffer: vi.fn(),
}));

import prisma from '@config/prisma';
import { errorHandler } from '@shared/middlewares/errorHandler';
import { verifyAccessToken } from '@shared/utils/jwt';
import { uploadImageBuffer } from '@shared/utils/cloudinary';
import { coursesRouter } from './course.routes';

const mockedPrisma = prisma as any;
const mockedUploadImageBuffer = vi.mocked(uploadImageBuffer);
const mockedVerifyAccessToken = vi.mocked(verifyAccessToken);

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/courses', coursesRouter);
  app.use(errorHandler);
  return app;
}

describe('course routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'admin-1',
      email: 'admin@lms.local',
      role: 'ADMIN',
    } as any);
  });

  const setInstructorToken = () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'instructor-2',
      email: 'instructor2@lms.local',
      role: 'INSTRUCTOR',
    } as any);
  };

  it('lists courses for authenticated admins', async () => {
    mockedPrisma.course.count.mockResolvedValue(1);
    mockedPrisma.course.findMany.mockResolvedValue([
      {
        id: 'course-1',
        title: 'React Basics',
        description: 'Learn React',
        thumbnailUrl: null,
        status: 'DRAFT',
        instructorId: 'admin-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      },
    ]);

    const response = await request(createApp())
      .get('/api/v1/courses')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
  });

  it('returns course detail with modules and lessons for authenticated admins', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'React Basics',
      description: 'Learn React',
      thumbnailUrl: null,
      status: 'DRAFT',
      instructorId: 'admin-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      instructor: { id: 'admin-1', name: 'LMS Admin', avatarUrl: null },
      modules: [
        {
          id: 'module-1',
          title: 'Getting Started',
          orderIndex: 1,
          lessons: [{ id: 'lesson-1', title: 'Introduction', orderIndex: 1, isPublished: true }],
        },
      ],
    });

    const response = await request(createApp())
      .get('/api/v1/courses/11111111-1111-1111-1111-111111111111')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe('React Basics');
    expect(response.body.data.modules).toHaveLength(1);
  });

  it('creates a course for authorized users', async () => {
    mockedPrisma.course.create.mockResolvedValue({
      id: 'course-1',
      title: 'New course',
      description: 'Intro course',
      thumbnailUrl: null,
      status: 'DRAFT',
      instructorId: 'admin-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const response = await request(createApp())
      .post('/api/v1/courses')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'New course', description: 'Intro course' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('New course');
  });

  it('allows instructors to create their own courses', async () => {
    setInstructorToken();
    mockedPrisma.course.create.mockResolvedValue({
      id: 'course-2',
      title: 'Instructor course',
      description: 'Owned by instructor',
      thumbnailUrl: null,
      status: 'DRAFT',
      instructorId: 'instructor-2',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const response = await request(createApp())
      .post('/api/v1/courses')
      .set('Authorization', 'Bearer instructor-token')
      .send({ title: 'Instructor course', description: 'Owned by instructor' });

    expect(response.status).toBe(201);
    expect(response.body.data.instructorId).toBe('instructor-2');
  });

  it('creates a course with a thumbnail upload', async () => {
    mockedUploadImageBuffer.mockResolvedValue({
      secureUrl: 'https://cdn.example.com/course-thumb.png',
      publicId: 'lms/course-thumbnails/course-1',
    });
    mockedPrisma.course.create.mockResolvedValue({
      id: 'course-1',
      title: 'New course',
      description: 'Intro course',
      thumbnailUrl: 'https://cdn.example.com/course-thumb.png',
      status: 'DRAFT',
      instructorId: 'admin-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const response = await request(createApp())
      .post('/api/v1/courses')
      .set('Authorization', 'Bearer valid-token')
      .field('title', 'New course')
      .field('description', 'Intro course')
      .attach('thumbnail', Buffer.from('thumbnail-bytes'), 'thumbnail.png');

    expect(response.status).toBe(201);
    expect(response.body.data.thumbnailUrl).toBe('https://cdn.example.com/course-thumb.png');
  });

  it('publishes a course through the lifecycle endpoint', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      instructorId: 'admin-1',
      status: 'DRAFT',
      deletedAt: null,
    });
    mockedPrisma.course.update.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'New course',
      description: 'Intro course',
      thumbnailUrl: null,
      status: 'PUBLISHED',
      instructorId: 'admin-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const response = await request(createApp())
      .post('/api/v1/courses/11111111-1111-1111-1111-111111111111/publish')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('PUBLISHED');
  });

  it('rejects publishing an already published course', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      instructorId: 'admin-1',
      status: 'PUBLISHED',
      deletedAt: null,
    });

    const response = await request(createApp())
      .post('/api/v1/courses/11111111-1111-1111-1111-111111111111/publish')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Only draft courses can be published');
  });

  it('updates a course through the patch endpoint', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      instructorId: 'admin-1',
      deletedAt: null,
    });
    mockedPrisma.course.update.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Updated course',
      description: 'Updated description',
      thumbnailUrl: null,
      status: 'DRAFT',
      instructorId: 'admin-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const response = await request(createApp())
      .patch('/api/v1/courses/11111111-1111-1111-1111-111111111111')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Updated course', description: 'Updated description' });

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe('Updated course');
  });

  it('rejects students from creating courses', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);

    const response = await request(createApp())
      .post('/api/v1/courses')
      .set('Authorization', 'Bearer student-token')
      .send({ title: 'Blocked course', description: 'Should not be created' });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('You do not have permission to perform this action');
    expect(mockedPrisma.course.create).not.toHaveBeenCalled();
  });

  it('rejects students from updating courses', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);

    const response = await request(createApp())
      .patch('/api/v1/courses/11111111-1111-1111-1111-111111111111')
      .set('Authorization', 'Bearer student-token')
      .send({ title: 'Blocked update' });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('You do not have permission to perform this action');
    expect(mockedPrisma.course.update).not.toHaveBeenCalled();
  });

  it('uploads a thumbnail through the multipart endpoint', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      instructorId: 'admin-1',
      deletedAt: null,
    });
    mockedUploadImageBuffer.mockResolvedValue({
      secureUrl: 'https://cdn.example.com/course-thumb.png',
      publicId: 'lms/course-thumbnails/course-1',
    });
    mockedPrisma.course.update.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Updated course',
      description: 'Updated description',
      thumbnailUrl: 'https://cdn.example.com/course-thumb.png',
      status: 'DRAFT',
      instructorId: 'admin-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const response = await request(createApp())
      .patch('/api/v1/courses/11111111-1111-1111-1111-111111111111/thumbnail')
      .set('Authorization', 'Bearer valid-token')
      .attach('thumbnail', Buffer.from('thumbnail-bytes'), 'thumbnail.png');

    expect(response.status).toBe(200);
    expect(response.body.data.thumbnailUrl).toBe('https://cdn.example.com/course-thumb.png');
  });

  it('rejects non image files for thumbnail upload', async () => {
    const response = await request(createApp())
      .patch('/api/v1/courses/11111111-1111-1111-1111-111111111111/thumbnail')
      .set('Authorization', 'Bearer valid-token')
      .attach('thumbnail', Buffer.from('plain-text-content'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Unsupported file type for this upload');
  });

  it('soft deletes a course through the delete endpoint', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      instructorId: 'admin-1',
      deletedAt: null,
    });
    mockedPrisma.course.update.mockResolvedValue({});

    const response = await request(createApp())
      .delete('/api/v1/courses/11111111-1111-1111-1111-111111111111')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockedPrisma.course.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedBy: 'admin-1' }),
      }),
    );
  });

  it('rejects students from deleting courses', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);

    const response = await request(createApp())
      .delete('/api/v1/courses/11111111-1111-1111-1111-111111111111')
      .set('Authorization', 'Bearer student-token');

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('You do not have permission to perform this action');
    expect(mockedPrisma.course.update).not.toHaveBeenCalled();
  });

  it('rejects archiving a draft course', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      instructorId: 'admin-1',
      status: 'DRAFT',
      deletedAt: null,
    });

    const response = await request(createApp())
      .post('/api/v1/courses/11111111-1111-1111-1111-111111111111/archive')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Only published courses can be archived');
  });

  it('restores a soft deleted course', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      instructorId: 'admin-1',
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedBy: 'admin-1',
    });
    mockedPrisma.course.update.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Restored course',
      description: 'Back again',
      thumbnailUrl: null,
      status: 'ARCHIVED',
      instructorId: 'admin-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-04T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const response = await request(createApp())
      .post('/api/v1/courses/11111111-1111-1111-1111-111111111111/restore')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body.data.deletedAt).toBeNull();
  });

  it('rejects students from restoring courses', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'student-1',
      email: 'student@lms.local',
      role: 'STUDENT',
    } as any);

    const response = await request(createApp())
      .post('/api/v1/courses/11111111-1111-1111-1111-111111111111/restore')
      .set('Authorization', 'Bearer student-token');

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('You do not have permission to perform this action');
    expect(mockedPrisma.course.update).not.toHaveBeenCalled();
  });

  it('rejects non-owner instructors from updating a course', async () => {
    mockedVerifyAccessToken.mockReturnValue({
      sub: 'instructor-2',
      email: 'instructor2@lms.local',
      role: 'INSTRUCTOR',
    } as any);
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      instructorId: 'instructor-1',
      deletedAt: null,
    });

    const response = await request(createApp())
      .patch('/api/v1/courses/11111111-1111-1111-1111-111111111111')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'Should fail' });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('You do not have permission to modify this course');
  });
});

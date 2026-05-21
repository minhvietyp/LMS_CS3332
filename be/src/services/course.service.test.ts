import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@shared/utils/cloudinary', () => ({
  uploadImageBuffer: vi.fn(),
}));

import prisma from '@config/prisma';
import { uploadImageBuffer } from '@shared/utils/cloudinary';
import { COURSE_STATUS, USER_ROLES } from '@shared/constants';
import { CourseService } from './course.service';

const courseService = new CourseService();
const mockedPrisma = prisma as any;
const mockedUploadImageBuffer = vi.mocked(uploadImageBuffer);

describe('CourseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists instructor courses with ownership filtering', async () => {
    mockedPrisma.course.count.mockResolvedValue(1);
    mockedPrisma.course.findMany.mockResolvedValue([
      {
        id: 'course-1',
        title: 'React Basics',
        description: 'Learn React',
        thumbnailUrl: null,
        status: COURSE_STATUS.DRAFT,
        instructorId: 'instructor-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        deletedAt: null,
      },
    ]);

    const result = await courseService.list({ page: '1', limit: '10' }, { sub: 'instructor-1', role: USER_ROLES.INSTRUCTOR });

    expect(mockedPrisma.course.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: expect.arrayContaining([expect.objectContaining({ instructorId: 'instructor-1' })]),
      }),
    });
    expect(result.data).toHaveLength(1);
    expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
  });

  it('returns published or enrolled courses for students', async () => {
    mockedPrisma.course.count.mockResolvedValue(1);
    mockedPrisma.course.findMany.mockResolvedValue([]);

    await courseService.list({}, { sub: 'student-1', role: USER_ROLES.STUDENT });

    const countArgs = mockedPrisma.course.count.mock.calls[0][0];
    expect(countArgs.where.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ deletedAt: null }),
        expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ status: COURSE_STATUS.PUBLISHED }),
            expect.objectContaining({ enrollments: expect.any(Object) }),
          ]),
        }),
      ]),
    );
  });

  it('creates a draft course for the instructor', async () => {
    mockedPrisma.course.create.mockResolvedValue({
      id: 'course-1',
      title: 'New course',
      description: 'Intro course',
      thumbnailUrl: null,
      status: COURSE_STATUS.DRAFT,
      instructorId: 'instructor-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const result = await courseService.create({ title: 'New course', description: 'Intro course' }, 'instructor-1');

    expect(mockedPrisma.course.create).toHaveBeenCalledWith({
      data: {
        title: 'New course',
        description: 'Intro course',
        instructorId: 'instructor-1',
        status: COURSE_STATUS.DRAFT,
      },
    });
    expect(result.status).toBe(COURSE_STATUS.DRAFT);
  });

  it('creates a draft course with an uploaded thumbnail', async () => {
    mockedUploadImageBuffer.mockResolvedValue({
      secureUrl: 'https://cdn.example.com/course-thumbnail.png',
      publicId: 'lms/course-thumbnails/course-1',
    });
    mockedPrisma.course.create.mockResolvedValue({
      id: 'course-1',
      title: 'New course',
      description: 'Intro course',
      thumbnailUrl: 'https://cdn.example.com/course-thumbnail.png',
      status: COURSE_STATUS.DRAFT,
      instructorId: 'instructor-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const result = await courseService.create(
      { title: 'New course', description: 'Intro course' },
      'instructor-1',
      { buffer: Buffer.from('thumbnail-bytes') } as any,
    );

    expect(mockedUploadImageBuffer).toHaveBeenCalledWith(Buffer.from('thumbnail-bytes'), 'lms/course-thumbnails');
    expect(mockedPrisma.course.create).toHaveBeenCalledWith({
      data: {
        title: 'New course',
        description: 'Intro course',
        instructorId: 'instructor-1',
        status: COURSE_STATUS.DRAFT,
        thumbnailUrl: 'https://cdn.example.com/course-thumbnail.png',
      },
    });
    expect(result.thumbnailUrl).toBe('https://cdn.example.com/course-thumbnail.png');
  });

  it('updates a course after ownership is verified', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      deletedAt: null,
    });
    mockedPrisma.course.update.mockResolvedValue({
      id: 'course-1',
      title: 'Updated React Basics',
      description: 'Updated description',
      thumbnailUrl: null,
      status: COURSE_STATUS.DRAFT,
      instructorId: 'instructor-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const result = await courseService.update(
      'course-1',
      { title: 'Updated React Basics', description: 'Updated description' },
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
    );

    expect(mockedPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: {
        title: 'Updated React Basics',
        description: 'Updated description',
      },
    });
    expect(result.title).toBe('Updated React Basics');
  });

  it('soft deletes a course and stores the deleter id', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      deletedAt: null,
    });
    mockedPrisma.course.update.mockResolvedValue({});

    await courseService.softDelete('course-1', 'instructor-1', USER_ROLES.INSTRUCTOR);

    expect(mockedPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: {
        deletedAt: expect.any(Date),
        deletedBy: 'instructor-1',
      },
    });
  });

  it('rejects updates from non owners', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      instructorId: 'other-instructor',
      deletedAt: null,
    });

    await expect(
      courseService.update('course-1', { title: 'Illegal update' }, 'instructor-1', USER_ROLES.INSTRUCTOR),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'You do not have permission to modify this course',
    });

    expect(mockedPrisma.course.update).not.toHaveBeenCalled();
  });

  it('allows admin users to update a course owned by another instructor', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      instructorId: 'other-instructor',
      deletedAt: null,
    });
    mockedPrisma.course.update.mockResolvedValue({
      id: 'course-1',
      title: 'Admin updated course',
      description: 'Admin updated description',
      thumbnailUrl: null,
      status: COURSE_STATUS.DRAFT,
      instructorId: 'other-instructor',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const result = await courseService.update(
      'course-1',
      { title: 'Admin updated course', description: 'Admin updated description' },
      'admin-1',
      USER_ROLES.ADMIN,
    );

    expect(mockedPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: {
        title: 'Admin updated course',
        description: 'Admin updated description',
      },
    });
    expect(result.title).toBe('Admin updated course');
  });

  it('allows admin users to soft delete a course owned by another instructor', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      instructorId: 'other-instructor',
      deletedAt: null,
    });
    mockedPrisma.course.update.mockResolvedValue({});

    await courseService.softDelete('course-1', 'admin-1', USER_ROLES.ADMIN);

    expect(mockedPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: {
        deletedAt: expect.any(Date),
        deletedBy: 'admin-1',
      },
    });
  });

  it('returns a course detail view for the owner', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      title: 'React Basics',
      description: 'Learn React',
      thumbnailUrl: null,
      status: COURSE_STATUS.DRAFT,
      instructorId: 'instructor-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      modules: [],
    });

    const result = await courseService.getById('course-1', { sub: 'instructor-1', role: USER_ROLES.INSTRUCTOR });

    expect(mockedPrisma.course.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'course-1', instructorId: 'instructor-1' }),
      }),
    );
    expect(result.id).toBe('course-1');
  });

  it('returns a deleted course detail for admins', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      title: 'Archived React Basics',
      description: 'Learn React',
      thumbnailUrl: null,
      status: COURSE_STATUS.ARCHIVED,
      instructorId: 'instructor-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: new Date('2026-01-05T00:00:00.000Z'),
      deletedBy: 'admin-1',
      modules: [],
    });

    const result = await courseService.getById('course-1', { sub: 'admin-1', role: USER_ROLES.ADMIN });

    expect(mockedPrisma.course.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'course-1' }),
      }),
    );
    expect(result.deletedAt).not.toBeNull();
  });

  it('publishes a draft course after ownership check', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
      deletedAt: null,
    });
    mockedPrisma.course.update.mockResolvedValue({
      id: 'course-1',
      title: 'React Basics',
      description: 'Learn React',
      thumbnailUrl: null,
      status: COURSE_STATUS.PUBLISHED,
      instructorId: 'instructor-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    await courseService.publish('course-1', 'instructor-1', USER_ROLES.INSTRUCTOR);

    expect(mockedPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: { status: COURSE_STATUS.PUBLISHED },
    });
  });

  it('archives a published course after ownership check', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.PUBLISHED,
      deletedAt: null,
    });
    mockedPrisma.course.update.mockResolvedValue({
      id: 'course-1',
      title: 'React Basics',
      description: 'Learn React',
      thumbnailUrl: null,
      status: COURSE_STATUS.ARCHIVED,
      instructorId: 'instructor-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    await courseService.archive('course-1', 'instructor-1', USER_ROLES.INSTRUCTOR);

    expect(mockedPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: { status: COURSE_STATUS.ARCHIVED },
    });
  });

  it('rejects publishing a non draft course', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.PUBLISHED,
      deletedAt: null,
    });

    await expect(courseService.publish('course-1', 'instructor-1', USER_ROLES.INSTRUCTOR)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Only draft courses can be published',
    });

    expect(mockedPrisma.course.update).not.toHaveBeenCalled();
  });

  it('rejects archiving a course that is not published', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
      deletedAt: null,
    });

    await expect(courseService.archive('course-1', 'instructor-1', USER_ROLES.INSTRUCTOR)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Only published courses can be archived',
    });

    expect(mockedPrisma.course.update).not.toHaveBeenCalled();
  });

  it('uploads a thumbnail and stores the secure url', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      deletedAt: null,
    });
    mockedUploadImageBuffer.mockResolvedValue({
      secureUrl: 'https://cdn.example.com/course-thumbnail.png',
      publicId: 'lms/course-thumbnails/course-1',
    });
    mockedPrisma.course.update.mockResolvedValue({
      id: 'course-1',
      title: 'React Basics',
      description: 'Learn React',
      thumbnailUrl: 'https://cdn.example.com/course-thumbnail.png',
      status: COURSE_STATUS.DRAFT,
      instructorId: 'instructor-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const result = await courseService.updateThumbnail(
      'course-1',
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
      { buffer: Buffer.from('thumbnail-bytes') } as any,
    );

    expect(mockedUploadImageBuffer).toHaveBeenCalledWith(Buffer.from('thumbnail-bytes'), 'lms/course-thumbnails');
    expect(mockedPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: { thumbnailUrl: 'https://cdn.example.com/course-thumbnail.png' },
    });
    expect(result.thumbnailUrl).toBe('https://cdn.example.com/course-thumbnail.png');
  });

  it('allows admin users to upload a thumbnail for another instructor course', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      instructorId: 'other-instructor',
      deletedAt: null,
    });
    mockedUploadImageBuffer.mockResolvedValue({
      secureUrl: 'https://cdn.example.com/admin-course-thumbnail.png',
      publicId: 'lms/course-thumbnails/course-1',
    });
    mockedPrisma.course.update.mockResolvedValue({
      id: 'course-1',
      title: 'React Basics',
      description: 'Learn React',
      thumbnailUrl: 'https://cdn.example.com/admin-course-thumbnail.png',
      status: COURSE_STATUS.DRAFT,
      instructorId: 'other-instructor',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
    });

    const result = await courseService.updateThumbnail(
      'course-1',
      'admin-1',
      USER_ROLES.ADMIN,
      { buffer: Buffer.from('admin-thumbnail-bytes') } as any,
    );

    expect(mockedUploadImageBuffer).toHaveBeenCalledWith(Buffer.from('admin-thumbnail-bytes'), 'lms/course-thumbnails');
    expect(mockedPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: { thumbnailUrl: 'https://cdn.example.com/admin-course-thumbnail.png' },
    });
    expect(result.thumbnailUrl).toBe('https://cdn.example.com/admin-course-thumbnail.png');
  });

  it('lists deleted courses when deletedOnly is enabled', async () => {
    mockedPrisma.course.count.mockResolvedValue(1);
    mockedPrisma.course.findMany.mockResolvedValue([]);

    await courseService.list({ deletedOnly: true }, { sub: 'admin-1', role: USER_ROLES.ADMIN });

    expect(mockedPrisma.course.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: expect.arrayContaining([expect.objectContaining({ deletedAt: { not: null } })]),
      }),
    });
  });

  it('restores a deleted course', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      deletedAt: new Date('2026-01-05T00:00:00.000Z'),
      deletedBy: 'admin-1',
    });
    mockedPrisma.course.update.mockResolvedValue({
      id: 'course-1',
      title: 'Restored course',
      description: 'Back again',
      thumbnailUrl: null,
      status: COURSE_STATUS.ARCHIVED,
      instructorId: 'instructor-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-06T00:00:00.000Z'),
      deletedAt: null,
      deletedBy: null,
    });

    const result = await courseService.restore('course-1', 'admin-1', USER_ROLES.ADMIN);

    expect(mockedPrisma.course.update).toHaveBeenCalledWith({
      where: { id: 'course-1' },
      data: {
        deletedAt: null,
        deletedBy: null,
      },
    });
    expect(result.deletedAt).toBeNull();
  });
});

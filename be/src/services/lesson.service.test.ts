import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@config/prisma', () => ({
  default: {
    course: {
      findUnique: vi.fn(),
    },
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

vi.mock('@shared/utils/cloudinary', () => ({
  uploadAutoBuffer: vi.fn(),
}));

import prisma from '@config/prisma';
import { COURSE_STATUS, USER_ROLES } from '@shared/constants';
import { LessonService } from './lesson.service';
import { uploadAutoBuffer } from '@shared/utils/cloudinary';

const lessonService = new LessonService();
const mockedPrisma = prisma as any;
const mockedUploadAutoBuffer = vi.mocked(uploadAutoBuffer);

describe('LessonService module management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists modules for an owned course with lessons', async () => {
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
    });
    mockedPrisma.courseModule.findMany.mockResolvedValue([
      {
        id: 'module-1',
        courseId: 'course-1',
        title: 'Module 1',
        orderIndex: 0,
        lessons: [{ id: 'lesson-1', title: 'Lesson 1', orderIndex: 0 }],
      },
    ]);

    const result = await lessonService.listCourseModules(
      'course-1',
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
    );

    expect(mockedPrisma.courseModule.findMany).toHaveBeenCalledWith({
      where: { courseId: 'course-1' },
      orderBy: { orderIndex: 'asc' },
      include: {
        lessons: {
          where: { deletedAt: null },
          orderBy: { orderIndex: 'asc' },
          include: {
            materials: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
    expect(result[0].lessons).toHaveLength(1);
  });

  it('creates a module at the next order index when none is provided', async () => {
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
    });
    mockedPrisma.courseModule.findFirst.mockResolvedValue({ orderIndex: 1 });
    mockedPrisma.courseModule.create.mockResolvedValue({
      id: 'module-1',
      courseId: 'course-1',
      title: 'Module 2',
      orderIndex: 2,
    });

    const result = await lessonService.createModule(
      'course-1',
      { title: ' Module 2 ' },
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
    );

    expect(mockedPrisma.courseModule.create).toHaveBeenCalledWith({
      data: {
        courseId: 'course-1',
        title: 'Module 2',
        orderIndex: 2,
      },
    });
    expect(result.orderIndex).toBe(2);
  });

  it('reorders modules within a course', async () => {
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
    });
    mockedPrisma.courseModule.findMany.mockResolvedValue([{ id: 'module-1' }, { id: 'module-2' }]);
    mockedPrisma.courseModule.update.mockImplementation(async ({ where, data }: any) => ({
      id: where.id,
      orderIndex: data.orderIndex,
    }));
    mockedPrisma.$transaction.mockImplementation(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
    );

    const result = await lessonService.reorderModules(
      'course-1',
      [
        { id: 'module-2', orderIndex: 0 },
        { id: 'module-1', orderIndex: 1 },
      ],
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
    );

    expect(mockedPrisma.courseModule.update).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { id: 'module-2', orderIndex: 0 },
      { id: 'module-1', orderIndex: 1 },
    ]);
  });

  it('deletes an owned module', async () => {
    mockedPrisma.courseModule.findFirst.mockResolvedValue({
      id: 'module-1',
      courseId: 'course-1',
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
    });
    mockedPrisma.courseModule.delete.mockResolvedValue({
      id: 'module-1',
      courseId: 'course-1',
    });

    await lessonService.deleteModule('module-1', 'instructor-1', USER_ROLES.INSTRUCTOR);

    expect(mockedPrisma.courseModule.delete).toHaveBeenCalledWith({
      where: { id: 'module-1' },
    });
  });

  it('moves a lesson to another module and reassigns its order', async () => {
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
    });
    mockedPrisma.courseModule.findFirst.mockResolvedValueOnce({
      id: 'module-2',
      courseId: 'course-1',
    });
    mockedPrisma.lesson.findFirst
      .mockResolvedValueOnce({
        id: 'lesson-1',
        moduleId: 'module-1',
        module: { id: 'module-1', courseId: 'course-1' },
        deletedAt: null,
      })
      .mockResolvedValueOnce({ orderIndex: 0 });
    mockedPrisma.lesson.update.mockResolvedValue({
      id: 'lesson-1',
      moduleId: 'module-2',
      title: 'Moved lesson',
      videoUrl: null,
      orderIndex: 1,
      isPublished: false,
    });

    const result = await lessonService.updateLesson(
      'lesson-1',
      { moduleId: 'module-2', title: 'Moved lesson' },
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
    );

    expect(mockedPrisma.lesson.update).toHaveBeenCalledWith({
      where: { id: 'lesson-1' },
      data: {
        title: 'Moved lesson',
        moduleId: 'module-2',
        orderIndex: 1,
      },
    });
    expect(result.moduleId).toBe('module-2');
  });

  it('returns lesson detail with materials for an owned lesson', async () => {
    mockedPrisma.lesson.findFirst.mockResolvedValue({
      id: 'lesson-1',
      moduleId: 'module-1',
      title: 'Lesson 1',
      videoUrl: null,
      orderIndex: 0,
      isPublished: false,
      deletedAt: null,
      module: { id: 'module-1', courseId: 'course-1', title: 'Module 1', orderIndex: 0 },
      materials: [
        {
          id: 'material-1',
          lessonId: 'lesson-1',
          title: 'Handout',
          type: 'pdf',
          url: 'https://cdn.example.com/handout.pdf',
        },
      ],
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
    });

    const result = await lessonService.getLessonById(
      'lesson-1',
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
    );

    expect(mockedPrisma.lesson.findFirst).toHaveBeenCalledWith({
      where: { id: 'lesson-1', deletedAt: null },
      include: {
        module: true,
        materials: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    expect(result.materials).toHaveLength(1);
  });

  it('reorders lessons within a module', async () => {
    mockedPrisma.courseModule.findFirst.mockResolvedValue({
      id: 'module-1',
      courseId: 'course-1',
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
    });
    mockedPrisma.lesson.findMany.mockResolvedValue([{ id: 'lesson-1' }, { id: 'lesson-2' }]);
    mockedPrisma.lesson.update.mockImplementation(async ({ where, data }: any) => ({
      id: where.id,
      orderIndex: data.orderIndex,
    }));
    mockedPrisma.$transaction.mockImplementation(async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
    );

    const result = await lessonService.reorderLessons(
      'module-1',
      [
        { id: 'lesson-2', orderIndex: 0 },
        { id: 'lesson-1', orderIndex: 1 },
      ],
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
    );

    expect(mockedPrisma.lesson.update).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { id: 'lesson-2', orderIndex: 0 },
      { id: 'lesson-1', orderIndex: 1 },
    ]);
  });

  it('creates a lesson at the next order index when none is provided', async () => {
    mockedPrisma.courseModule.findFirst.mockResolvedValue({
      id: 'module-1',
      courseId: 'course-1',
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
    });
    mockedPrisma.lesson.findFirst.mockResolvedValue({ orderIndex: 1 });
    mockedPrisma.lesson.create.mockResolvedValue({
      id: 'lesson-2',
      moduleId: 'module-1',
      title: 'Lesson 2',
      videoUrl: 'https://example.com/video-2',
      orderIndex: 2,
      isPublished: false,
    });

    const result = await lessonService.createLesson(
      'module-1',
      { title: ' Lesson 2 ', videoUrl: 'https://example.com/video-2' },
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
    );

    expect(mockedPrisma.lesson.create).toHaveBeenCalledWith({
      data: {
        moduleId: 'module-1',
        title: 'Lesson 2',
        videoUrl: 'https://example.com/video-2',
        orderIndex: 2,
      },
    });
    expect(result.orderIndex).toBe(2);
  });

  it('soft deletes an owned lesson', async () => {
    mockedPrisma.lesson.findFirst.mockResolvedValue({
      id: 'lesson-1',
      moduleId: 'module-1',
      module: { id: 'module-1', courseId: 'course-1' },
      deletedAt: null,
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
    });
    mockedPrisma.lesson.update.mockResolvedValue({
      id: 'lesson-1',
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedBy: 'instructor-1',
    });

    await lessonService.softDeleteLesson('lesson-1', 'instructor-1', USER_ROLES.INSTRUCTOR);

    expect(mockedPrisma.lesson.update).toHaveBeenCalledWith({
      where: { id: 'lesson-1' },
      data: expect.objectContaining({ deletedBy: 'instructor-1' }),
    });
  });

  it('lists materials for an owned lesson', async () => {
    mockedPrisma.lesson.findFirst.mockResolvedValue({
      id: 'lesson-1',
      moduleId: 'module-1',
      module: { id: 'module-1', courseId: 'course-1' },
      deletedAt: null,
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
    });
    mockedPrisma.lessonMaterial.findMany.mockResolvedValue([
      {
        id: 'material-1',
        lessonId: 'lesson-1',
        title: 'Handout',
        type: 'pdf',
        url: 'https://cdn.example.com/handout.pdf',
      },
    ]);

    const result = await lessonService.listMaterials(
      'lesson-1',
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
    );

    expect(mockedPrisma.lessonMaterial.findMany).toHaveBeenCalledWith({
      where: { lessonId: 'lesson-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(1);
  });

  it('uploads a file material and stores the uploaded url', async () => {
    mockedPrisma.lesson.findFirst.mockResolvedValue({
      id: 'lesson-1',
      moduleId: 'module-1',
      module: { id: 'module-1', courseId: 'course-1' },
      deletedAt: null,
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
    });
    mockedUploadAutoBuffer.mockResolvedValue({
      secureUrl: 'https://cdn.example.com/material.pdf',
      publicId: 'lms/lesson-materials/material-1',
    });
    mockedPrisma.lessonMaterial.create.mockResolvedValue({
      id: 'material-1',
      lessonId: 'lesson-1',
      title: 'Lesson handout',
      type: 'pdf',
      url: 'https://cdn.example.com/material.pdf',
    });

    const result = await lessonService.uploadMaterial(
      'lesson-1',
      { buffer: Buffer.from('pdf-bytes') } as any,
      { title: ' Lesson handout ', type: 'pdf' },
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
    );

    expect(mockedUploadAutoBuffer).toHaveBeenCalledWith(
      Buffer.from('pdf-bytes'),
      'lms/lesson-materials',
    );
    expect(mockedPrisma.lessonMaterial.create).toHaveBeenCalledWith({
      data: {
        lessonId: 'lesson-1',
        title: 'Lesson handout',
        type: 'pdf',
        url: 'https://cdn.example.com/material.pdf',
      },
    });
    expect(result.url).toBe('https://cdn.example.com/material.pdf');
  });

  it('uploads a video material and stores the video type with uploaded url', async () => {
    mockedPrisma.lesson.findFirst.mockResolvedValue({
      id: 'lesson-1',
      moduleId: 'module-1',
      module: { id: 'module-1', courseId: 'course-1' },
      deletedAt: null,
    });
    mockedPrisma.course.findUnique.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
      status: COURSE_STATUS.DRAFT,
    });
    mockedUploadAutoBuffer.mockResolvedValue({
      secureUrl: 'https://res.cloudinary.com/demo/video/upload/lesson-video.mp4',
      publicId: 'lms/lesson-materials/video-1',
    });
    mockedPrisma.lessonMaterial.create.mockResolvedValue({
      id: 'material-video-1',
      lessonId: 'lesson-1',
      title: 'Lecture recording',
      type: 'video',
      url: 'https://res.cloudinary.com/demo/video/upload/lesson-video.mp4',
    });

    const result = await lessonService.uploadMaterial(
      'lesson-1',
      { buffer: Buffer.from('video-bytes'), mimetype: 'video/mp4' } as any,
      { title: ' Lecture recording ', type: 'video' },
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
    );

    expect(mockedUploadAutoBuffer).toHaveBeenCalledWith(
      Buffer.from('video-bytes'),
      'lms/lesson-materials',
    );
    expect(mockedPrisma.lessonMaterial.create).toHaveBeenCalledWith({
      data: {
        lessonId: 'lesson-1',
        title: 'Lecture recording',
        type: 'video',
        url: 'https://res.cloudinary.com/demo/video/upload/lesson-video.mp4',
      },
    });
    expect(result.type).toBe('video');
  });
});

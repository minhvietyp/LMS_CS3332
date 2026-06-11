import prisma from '@config/prisma';
import { NotFoundError, ForbiddenError } from '@shared/errors/AppError';
import { CourseModule, Lesson, LessonMaterial } from '@prisma/client';
import { pickDefined } from '@shared/utils/helpers';
import { USER_ROLES } from '@shared/constants';
import { uploadAutoBuffer } from '@shared/utils/cloudinary';

type MaterialFile = Express.Multer.File;
type CourseModuleWithLessons = CourseModule & {
  lessons: Array<Lesson & { materials: LessonMaterial[] }>;
};

export class LessonService {
  // ─── Module Operations ────────────────────────────────────────────────────

  async listCourseModules(
    courseId: string,
    userId: string,
    userRole: string,
  ): Promise<CourseModuleWithLessons[]> {
    await this.checkCourseOwnership(courseId, userId, userRole);

    return prisma.courseModule.findMany({
      where: { courseId },
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
  }

  async createModule(
    courseId: string,
    data: any,
    userId: string,
    userRole: string,
  ): Promise<CourseModule> {
    await this.checkCourseOwnership(courseId, userId, userRole);

    const nextOrderIndex = data.orderIndex ?? (await this.getLastModuleOrderIndex(courseId)) + 1;

    return prisma.courseModule.create({
      data: {
        courseId,
        title: String(data.title).trim(),
        orderIndex: nextOrderIndex,
      },
    });
  }

  async updateModule(
    id: string,
    data: any,
    userId: string,
    userRole: string,
  ): Promise<CourseModule> {
    const module = await prisma.courseModule.findFirst({ where: { id } });
    if (!module) throw NotFoundError('Module not found');
    await this.checkCourseOwnership(module.courseId, userId, userRole);

    return prisma.courseModule.update({
      where: { id },
      data: pickDefined({
        title: data.title ? String(data.title).trim() : undefined,
        orderIndex: data.orderIndex,
      }),
    });
  }

  async deleteModule(id: string, userId: string, userRole: string): Promise<void> {
    const module = await prisma.courseModule.findFirst({ where: { id } });
    if (!module) throw NotFoundError('Module not found');
    await this.checkCourseOwnership(module.courseId, userId, userRole);

    await prisma.courseModule.delete({ where: { id } });
  }

  async reorderModules(
    courseId: string,
    modules: Array<{ id: string; orderIndex: number }>,
    userId: string,
    userRole: string,
  ): Promise<CourseModule[]> {
    await this.checkCourseOwnership(courseId, userId, userRole);

    const existingModules = await prisma.courseModule.findMany({
      where: { courseId },
      select: { id: true },
    });

    const existingIds = new Set(existingModules.map((module) => module.id));
    const requestedIds = new Set(modules.map((module) => module.id));

    if (requestedIds.size !== modules.length) {
      throw NotFoundError('Module not found');
    }

    for (const moduleId of requestedIds) {
      if (!existingIds.has(moduleId)) {
        throw NotFoundError('Module not found');
      }
    }

    return prisma.$transaction(
      modules.map((module) =>
        prisma.courseModule.update({
          where: { id: module.id },
          data: { orderIndex: module.orderIndex },
        }),
      ),
    );
  }

  // ─── Lesson Operations ────────────────────────────────────────────────────

  async createLesson(
    moduleId: string,
    data: any,
    userId: string,
    userRole: string,
  ): Promise<Lesson> {
    const module = await prisma.courseModule.findFirst({ where: { id: moduleId } });
    if (!module) throw NotFoundError('Module not found');
    await this.checkCourseOwnership(module.courseId, userId, userRole);

    const nextOrderIndex = data.orderIndex ?? (await this.getLastLessonOrderIndex(moduleId)) + 1;

    return prisma.lesson.create({
      data: {
        moduleId,
        title: String(data.title).trim(),
        videoUrl: data.videoUrl ?? null,
        orderIndex: nextOrderIndex,
      },
    });
  }

  async getLessonById(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<Lesson & { module: CourseModule; materials: LessonMaterial[] }> {
    const lesson = await prisma.lesson.findFirst({
      where: { id, deletedAt: null },
      include: {
        module: true,
        materials: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!lesson) throw NotFoundError('Lesson not found');
    await this.checkCourseOwnership(lesson.module.courseId, userId, userRole);

    return lesson;
  }

  async updateLesson(id: string, data: any, userId: string, userRole: string): Promise<Lesson> {
    const lesson = await prisma.lesson.findFirst({
      where: { id, deletedAt: null },
      include: { module: true },
    });
    if (!lesson) throw NotFoundError('Lesson not found');
    await this.checkCourseOwnership(lesson.module.courseId, userId, userRole);

    const nextModuleId = data.moduleId ?? lesson.moduleId;
    if (data.moduleId && data.moduleId !== lesson.moduleId) {
      const targetModule = await prisma.courseModule.findFirst({ where: { id: data.moduleId } });
      if (!targetModule) throw NotFoundError('Module not found');
      await this.checkCourseOwnership(targetModule.courseId, userId, userRole);
    }

    const nextOrderIndex =
      data.orderIndex ??
      (data.moduleId && data.moduleId !== lesson.moduleId
        ? (await this.getLastLessonOrderIndex(nextModuleId)) + 1
        : undefined);

    return prisma.lesson.update({
      where: { id },
      data: pickDefined({
        title: data.title ? String(data.title).trim() : undefined,
        videoUrl: data.videoUrl,
        orderIndex: nextOrderIndex,
        moduleId: data.moduleId,
        isPublished: data.isPublished,
      }),
    });
  }

  async reorderLessons(
    moduleId: string,
    lessons: Array<{ id: string; orderIndex: number }>,
    userId: string,
    userRole: string,
  ): Promise<Lesson[]> {
    const module = await prisma.courseModule.findFirst({ where: { id: moduleId } });
    if (!module) throw NotFoundError('Module not found');
    await this.checkCourseOwnership(module.courseId, userId, userRole);

    const existingLessons = await prisma.lesson.findMany({
      where: { moduleId, deletedAt: null },
      select: { id: true },
    });

    const existingIds = new Set(existingLessons.map((lesson) => lesson.id));
    const requestedIds = new Set(lessons.map((lesson) => lesson.id));

    if (requestedIds.size !== lessons.length) {
      throw NotFoundError('Lesson not found');
    }

    for (const lessonId of requestedIds) {
      if (!existingIds.has(lessonId)) {
        throw NotFoundError('Lesson not found');
      }
    }

    return prisma.$transaction(
      lessons.map((lesson) =>
        prisma.lesson.update({
          where: { id: lesson.id },
          data: { orderIndex: lesson.orderIndex },
        }),
      ),
    );
  }

  async softDeleteLesson(id: string, userId: string, userRole: string): Promise<void> {
    const lesson = await prisma.lesson.findFirst({
      where: { id, deletedAt: null },
      include: { module: true },
    });
    if (!lesson) throw NotFoundError('Lesson not found');
    await this.checkCourseOwnership(lesson.module.courseId, userId, userRole);

    await prisma.lesson.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });
  }

  // ─── Material Operations ──────────────────────────────────────────────────

  async listMaterials(
    lessonId: string,
    userId: string,
    userRole: string,
  ): Promise<LessonMaterial[]> {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null },
      include: { module: true },
    });
    if (!lesson) throw NotFoundError('Lesson not found');
    await this.checkCourseOwnership(lesson.module.courseId, userId, userRole);

    return prisma.lessonMaterial.findMany({
      where: { lessonId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addMaterial(
    lessonId: string,
    data: any,
    userId: string,
    userRole: string,
  ): Promise<LessonMaterial> {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId },
      include: { module: true },
    });
    if (!lesson) throw NotFoundError('Lesson not found');
    await this.checkCourseOwnership(lesson.module.courseId, userId, userRole);

    return prisma.lessonMaterial.create({
      data: { ...data, lessonId },
    });
  }

  async uploadMaterial(
    lessonId: string,
    file: MaterialFile,
    data: any,
    userId: string,
    userRole: string,
  ): Promise<LessonMaterial> {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null },
      include: { module: true },
    });
    if (!lesson) throw NotFoundError('Lesson not found');
    await this.checkCourseOwnership(lesson.module.courseId, userId, userRole);

    const uploaded = await uploadAutoBuffer(file.buffer, 'lms/lesson-materials');

    return prisma.lessonMaterial.create({
      data: {
        lessonId,
        title: String(data.title).trim(),
        type: data.type,
        url: uploaded.secureUrl,
      },
    });
  }

  async deleteMaterial(id: string, userId: string, userRole: string): Promise<void> {
    const material = await prisma.lessonMaterial.findFirst({
      where: { id },
      include: { lesson: { include: { module: true } } },
    });
    if (!material) throw NotFoundError('Material not found');
    await this.checkCourseOwnership(material.lesson.module.courseId, userId, userRole);

    await prisma.lessonMaterial.delete({ where: { id } });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async checkCourseOwnership(
    courseId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw NotFoundError('Course not found');

    if (userRole !== USER_ROLES.ADMIN && course.instructorId !== userId) {
      throw ForbiddenError('You do not have permission to manage content for this course');
    }
  }

  private async getLastModuleOrderIndex(courseId: string): Promise<number> {
    const lastModule = await prisma.courseModule.findFirst({
      where: { courseId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    return lastModule?.orderIndex ?? -1;
  }

  private async getLastLessonOrderIndex(moduleId: string): Promise<number> {
    const lastLesson = await prisma.lesson.findFirst({
      where: { moduleId, deletedAt: null },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    return lastLesson?.orderIndex ?? -1;
  }
}

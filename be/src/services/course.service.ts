import prisma from '@config/prisma';
import { NotFoundError, ForbiddenError, BadRequestError } from '@shared/errors/AppError';
import { Prisma, Course } from '@prisma/client';
import { parsePagination, pickDefined } from '@shared/utils/helpers';
import { PaginatedResult } from '@types';
import { COURSE_STATUS, ENROLLMENT_STATUS, USER_ROLES } from '@shared/constants';
import { uploadImageBuffer } from '@shared/utils/cloudinary';
import { config } from '@config/index';
import { appCache } from '@shared/utils/cache';

type Viewer = {
  sub: string;
  role: string;
};

type CourseResourceMaterial = {
  id: string;
  title: string;
  type: string;
  url: string;
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string;
  createdAt: Date;
};

type PublishedCourseLesson = {
  id: string;
  moduleId: string;
  title: string;
  videoUrl: string | null;
  orderIndex: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type PublishedCourseModule = {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  lessons: PublishedCourseLesson[];
};

type CreateCourseData = {
  title: string;
  description?: string;
};

type UpdateCourseData = {
  title?: string;
  description?: string;
};

type CourseFile = Express.Multer.File;

export class CourseService {
  private publicCachePrefix = 'public:courses:';

  private clearPublicCourseCache(): void {
    appCache.deleteByPrefix(this.publicCachePrefix);
  }

  async listPublic(query: any): Promise<PaginatedResult<any>> {
    const cacheKey = `${this.publicCachePrefix}list:${JSON.stringify(query ?? {})}`;
    const cached = config.cache.enabled ? appCache.get<PaginatedResult<any>>(cacheKey) : null;
    if (cached) return cached;

    const { page, limit, skip } = parsePagination(query);
    const { search } = query;

    const where: Prisma.CourseWhereInput = {
      deletedAt: null,
      status: COURSE_STATUS.PUBLISHED,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          status: true,
          instructorId: true,
          createdAt: true,
          updatedAt: true,
          instructor: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              occupation: true,
              bio: true,
            },
          },
          modules: {
            select: {
              id: true,
              lessons: {
                where: { deletedAt: null, isPublished: true },
                select: { id: true },
              },
            },
          },
          enrollments: {
            where: { status: ENROLLMENT_STATUS.ACTIVE },
            select: { id: true },
          },
        },
      }),
    ]);

    const result = {
      data: courses.map((course) => ({
        ...course,
        moduleCount: course.modules.length,
        lessonCount: course.modules.reduce((count, module) => count + module.lessons.length, 0),
        enrollmentCount: course.enrollments.length,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    if (config.cache.enabled) {
      appCache.set(cacheKey, result, config.cache.publicTtlMs);
    }

    return result;
  }

  async getPublicById(id: string): Promise<any> {
    const cacheKey = `${this.publicCachePrefix}detail:${id}`;
    const cached = config.cache.enabled ? appCache.get<any>(cacheKey) : null;
    if (cached) return cached;

    const course = await prisma.course.findFirst({
      where: {
        id,
        deletedAt: null,
        status: COURSE_STATUS.PUBLISHED,
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            occupation: true,
            bio: true,
            websiteUrl: true,
            linkedinUrl: true,
            githubUrl: true,
          },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              where: { deletedAt: null, isPublished: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        enrollments: {
          where: { status: ENROLLMENT_STATUS.ACTIVE },
          select: { id: true },
        },
      },
    });

    if (!course) {
      throw NotFoundError('Course not found');
    }

    const result = {
      ...course,
      moduleCount: course.modules.length,
      lessonCount: course.modules.reduce((count, module) => count + module.lessons.length, 0),
      enrollmentCount: course.enrollments.length,
    };

    if (config.cache.enabled) {
      appCache.set(cacheKey, result, config.cache.publicTtlMs);
    }

    return result;
  }

  /**
   * List courses with pagination and filters
   */
  async list(query: any, user: Viewer): Promise<PaginatedResult<Course>> {
    const { page, limit, skip } = parsePagination(query);
    const { search, status, instructorId } = query;
    const includeDeleted = query.includeDeleted === true;
    const deletedOnly = query.deletedOnly === true;

    const andConditions: Prisma.CourseWhereInput[] = [];

    if (deletedOnly) {
      andConditions.push({ deletedAt: { not: null } });
    } else if (!includeDeleted) {
      andConditions.push({ deletedAt: null });
    }

    if (status) {
      andConditions.push({ status });
    }

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (user.role === USER_ROLES.ADMIN && instructorId) {
      andConditions.push({ instructorId });
    }

    if (user.role === USER_ROLES.INSTRUCTOR) {
      andConditions.push({ instructorId: user.sub });
    }

    if (user.role === USER_ROLES.STUDENT) {
      andConditions.push({
        OR: [
          { status: COURSE_STATUS.PUBLISHED },
          {
            enrollments: {
              some: {
                studentId: user.sub,
                status: ENROLLMENT_STATUS.ACTIVE,
              },
            },
          },
        ],
      });
    }

    const where: Prisma.CourseWhereInput = andConditions.length ? { AND: andConditions } : {};

    const [total, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          instructor: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      }),
    ]);

    return {
      data: courses,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get course details with modules and lessons
   */
  async getById(id: string, viewer: Viewer): Promise<any> {
    const course = await prisma.course.findFirst({
      where: {
        id,
        ...(viewer.role === USER_ROLES.ADMIN ? {} : { deletedAt: null }),
        ...(viewer.role === USER_ROLES.INSTRUCTOR ? { instructorId: viewer.sub } : {}),
        ...(viewer.role === USER_ROLES.STUDENT
          ? {
              OR: [
                { status: COURSE_STATUS.PUBLISHED },
                {
                  enrollments: {
                    some: {
                      studentId: viewer.sub,
                      status: ENROLLMENT_STATUS.ACTIVE,
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        instructor: {
          select: { id: true, name: true, avatarUrl: true },
        },
        modules: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              where: { deletedAt: null },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
    });

    if (!course) {
      throw NotFoundError('Course not found');
    }

    return course;
  }

  async listPublishedModules(id: string, viewer: Viewer): Promise<PublishedCourseModule[]> {
    const course = await prisma.course.findFirst({
      where: {
        id,
        ...(viewer.role === USER_ROLES.ADMIN ? {} : { deletedAt: null }),
        ...(viewer.role === USER_ROLES.INSTRUCTOR ? { instructorId: viewer.sub } : {}),
        ...(viewer.role === USER_ROLES.STUDENT
          ? {
              enrollments: {
                some: {
                  studentId: viewer.sub,
                  status: ENROLLMENT_STATUS.ACTIVE,
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });

    if (!course) {
      throw NotFoundError('Course not found');
    }

    const modules = await prisma.courseModule.findMany({
      where: { courseId: id },
      orderBy: { orderIndex: 'asc' },
      include: {
        lessons: {
          where: {
            deletedAt: null,
            isPublished: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return modules.filter((module) => module.lessons.length > 0);
  }

  async listResources(
    id: string,
    viewer: Viewer,
  ): Promise<{ materials: CourseResourceMaterial[] }> {
    const course = await prisma.course.findFirst({
      where: {
        id,
        ...(viewer.role === USER_ROLES.ADMIN ? {} : { deletedAt: null }),
        ...(viewer.role === USER_ROLES.INSTRUCTOR ? { instructorId: viewer.sub } : {}),
        ...(viewer.role === USER_ROLES.STUDENT
          ? {
              OR: [
                { status: COURSE_STATUS.PUBLISHED },
                {
                  enrollments: {
                    some: {
                      studentId: viewer.sub,
                      status: ENROLLMENT_STATUS.ACTIVE,
                    },
                  },
                },
              ],
            }
          : {}),
      },
      select: { id: true },
    });

    if (!course) {
      throw NotFoundError('Course not found');
    }

    const materials = await prisma.lessonMaterial.findMany({
      where: {
        lesson: {
          deletedAt: null,
          ...(viewer.role === USER_ROLES.STUDENT ? { isPublished: true } : {}),
          module: {
            courseId: id,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            module: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return {
      materials: materials.map((material) => ({
        id: material.id,
        title: material.title,
        type: material.type,
        url: material.url,
        lessonId: material.lessonId,
        lessonTitle: material.lesson.title,
        moduleId: material.lesson.module.id,
        moduleTitle: material.lesson.module.title,
        createdAt: material.createdAt,
      })),
    };
  }

  /**
   * Create a new course
   */
  async create(data: CreateCourseData, instructorId: string, file?: CourseFile): Promise<Course> {
    const thumbnailUrl = file
      ? (await uploadImageBuffer(file.buffer, 'lms/course-thumbnails')).secureUrl
      : undefined;

    return prisma.course
      .create({
        data: {
          title: data.title,
          description: data.description,
          instructorId,
          status: COURSE_STATUS.DRAFT,
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
        },
      })
      .finally(() => this.clearPublicCourseCache());
  }

  /**
   * Update course details
   */
  async update(
    id: string,
    data: UpdateCourseData,
    userId: string,
    userRole: string,
  ): Promise<Course> {
    await this.checkOwnership(id, userId, userRole);

    return prisma.course
      .update({
        where: { id },
        data: pickDefined(data),
      })
      .finally(() => this.clearPublicCourseCache());
  }

  async publish(id: string, userId: string, userRole: string): Promise<Course> {
    const course = await this.checkOwnership(id, userId, userRole);

    if (course.status !== COURSE_STATUS.DRAFT) {
      throw BadRequestError('Only draft courses can be published');
    }

    return prisma.course
      .update({
        where: { id },
        data: { status: COURSE_STATUS.PUBLISHED },
      })
      .finally(() => this.clearPublicCourseCache());
  }

  async archive(id: string, userId: string, userRole: string): Promise<Course> {
    const course = await this.checkOwnership(id, userId, userRole);

    if (course.status !== COURSE_STATUS.PUBLISHED) {
      throw BadRequestError('Only published courses can be archived');
    }

    return prisma.course
      .update({
        where: { id },
        data: { status: COURSE_STATUS.ARCHIVED },
      })
      .finally(() => this.clearPublicCourseCache());
  }

  async updateThumbnail(
    id: string,
    userId: string,
    userRole: string,
    file: CourseFile,
  ): Promise<Course> {
    await this.checkOwnership(id, userId, userRole);

    const uploaded = await uploadImageBuffer(file.buffer, 'lms/course-thumbnails');

    return prisma.course
      .update({
        where: { id },
        data: {
          thumbnailUrl: uploaded.secureUrl,
        },
      })
      .finally(() => this.clearPublicCourseCache());
  }

  /**
   * Soft delete course
   */
  async softDelete(id: string, userId: string, userRole: string): Promise<void> {
    await this.checkOwnership(id, userId, userRole);

    await prisma.course.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });
    this.clearPublicCourseCache();
  }

  async restore(id: string, userId: string, userRole: string): Promise<Course> {
    const course = await prisma.course.findFirst({
      where: { id },
    });

    if (!course) {
      throw NotFoundError('Course not found');
    }

    if (userRole !== USER_ROLES.ADMIN && course.instructorId !== userId) {
      throw ForbiddenError('You do not have permission to modify this course');
    }

    return prisma.course
      .update({
        where: { id },
        data: {
          deletedAt: null,
          deletedBy: null,
        },
      })
      .finally(() => this.clearPublicCourseCache());
  }

  /**
   * Ownership check helper
   */
  private async checkOwnership(id: string, userId: string, userRole: string): Promise<Course> {
    const course = await prisma.course.findFirst({
      where: { id, deletedAt: null },
    });

    if (!course) {
      throw NotFoundError('Course not found');
    }

    if (userRole !== USER_ROLES.ADMIN && course.instructorId !== userId) {
      throw ForbiddenError('You do not have permission to modify this course');
    }

    return course;
  }
}

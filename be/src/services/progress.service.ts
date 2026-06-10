import prisma from '@config/prisma';
import { NotFoundError, ForbiddenError } from '@shared/errors/AppError';
import { CourseStatus, Progress } from '@prisma/client';
import { ENROLLMENT_STATUS, PROGRESS_STATE } from '@shared/constants';
import { EmailService } from './email.service';
import { JwtPayload } from '@types';

type ProgressLesson = {
  id: string;
  title: string;
  orderIndex: number;
  weight: number;
};

type StudentProgressSummary = {
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrollmentStatus: string;
  enrolledAt: Date;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  weightedPercentage: number;
  totalWeight: number;
  completedWeight: number;
  lastProgressAt: Date | null;
};

type InstructorProgressQuery = {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: 'name' | 'progress' | 'lastActivity' | 'enrolledAt';
  sortOrder?: 'asc' | 'desc';
};

type AdminCourseProgressQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  instructorId?: string;
  status?: CourseStatus;
  sortBy?: 'title' | 'progress' | 'students' | 'completionRate';
  sortOrder?: 'asc' | 'desc';
};

type ProgressHistoryQuery = {
  page?: number;
  pageSize?: number;
  courseId?: string;
  lessonId?: string;
  actionType?: string;
};

type CourseProgressAggregate = {
  courseId: string;
  courseTitle: string;
  instructorId: string;
  instructorName: string;
  status: string;
  totalLessons: number;
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  droppedStudents: number;
  averageProgress: number;
  averageWeightedProgress: number;
  completionRate: number;
  lastActivityAt: Date | null;
};

export class ProgressService {
  private emailService = new EmailService();

  /**
   * Mark lesson as complete/incomplete
   */
  async markComplete(lessonId: string, studentId: string, isCompleted: boolean): Promise<Progress> {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null },
      select: {
        id: true,
        module: {
          select: {
            courseId: true,
            course: { select: { title: true } },
          },
        },
      },
    });
    if (!lesson) throw NotFoundError('Lesson not found');

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: lesson.module.courseId } },
      include: {
        student: { select: { id: true, email: true, name: true } },
      },
    });

    if (!enrollment || enrollment.status === ENROLLMENT_STATUS.DROPPED) {
      throw ForbiddenError('Student is not enrolled in this course');
    }

    return prisma.$transaction(async (tx) => {
      const existingProgress = await tx.progress.findUnique({
        where: { studentId_lessonId: { studentId, lessonId } },
        select: { isCompleted: true },
      });
      const fromState = this.deriveProgressState(existingProgress?.isCompleted);
      const toState = isCompleted ? PROGRESS_STATE.COMPLETED : PROGRESS_STATE.IN_PROGRESS;
      const progress = await tx.progress.upsert({
        where: { studentId_lessonId: { studentId, lessonId } },
        update: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
        create: {
          studentId,
          lessonId,
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      });

      const [totalLessons, completedLessons] = await Promise.all([
        tx.lesson.count({
          where: { module: { courseId: lesson.module.courseId }, deletedAt: null },
        }),
        tx.progress.count({
          where: {
            studentId,
            isCompleted: true,
            lesson: { module: { courseId: lesson.module.courseId } },
          },
        }),
      ]);

      const nextEnrollmentStatus =
        totalLessons > 0 && completedLessons === totalLessons
          ? ENROLLMENT_STATUS.COMPLETED
          : ENROLLMENT_STATUS.ACTIVE;

      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { status: nextEnrollmentStatus },
      });

      await this.createProgressHistoryRecord(tx, {
        studentId,
        lessonId,
        courseId: lesson.module.courseId,
        fromState,
        toState,
        isCompleted,
        actionType: isCompleted ? 'MARK_COMPLETE' : 'MARK_INCOMPLETE',
        changedById: studentId,
      });

      if (enrollment.status !== nextEnrollmentStatus) {
        await this.createProgressHistoryRecord(tx, {
          studentId,
          lessonId: null,
          courseId: lesson.module.courseId,
          fromState: enrollment.status,
          toState: nextEnrollmentStatus,
          isCompleted: nextEnrollmentStatus === ENROLLMENT_STATUS.COMPLETED,
          actionType:
            nextEnrollmentStatus === ENROLLMENT_STATUS.COMPLETED
              ? 'COURSE_COMPLETED'
              : 'COURSE_REOPENED',
          changedById: studentId,
        });
      }

      if (
        enrollment.status !== ENROLLMENT_STATUS.COMPLETED &&
        nextEnrollmentStatus === ENROLLMENT_STATUS.COMPLETED
      ) {
        await this.emailService.sendCourseCompletedEmail({
          userId: enrollment.student.id,
          recipient: enrollment.student.email,
          studentName: enrollment.student.name,
          courseTitle: lesson.module.course.title,
          completedLessons,
          totalLessons,
        });
      }

      return progress;
    });
  }

  /**
   * Get course progress for a student
   */
  async getCourseProgress(courseId: string, studentId: string): Promise<any> {
    const course = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: { id: true },
    });
    if (!course) throw NotFoundError('Course not found');

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });
    if (!enrollment || enrollment.status === ENROLLMENT_STATUS.DROPPED) {
      throw ForbiddenError('Student is not enrolled in this course');
    }

    const [totalLessons, lessons, completedLessonCount, progress] = await Promise.all([
      prisma.lesson.count({
        where: { module: { courseId }, deletedAt: null },
      }),
      prisma.lesson.findMany({
        where: { module: { courseId }, deletedAt: null },
        select: { id: true, title: true, orderIndex: true },
        orderBy: [{ module: { orderIndex: 'asc' } }, { orderIndex: 'asc' }],
      }),
      prisma.progress.count({
        where: {
          studentId,
          isCompleted: true,
          lesson: { module: { courseId } },
        },
      }),
      prisma.progress.findMany({
        where: { studentId, lesson: { module: { courseId } } },
        select: { lessonId: true, isCompleted: true, completedAt: true, updatedAt: true },
      }),
    ]);

    const progressMap = new Map(progress.map((item) => [item.lessonId, item]));
    const lastProgressAt = progress.reduce<Date | null>((latest, item) => {
      const current = item.completedAt ?? item.updatedAt;

      if (!current) return latest;
      if (!latest || current > latest) return current;
      return latest;
    }, null);

    const lessonProgress = lessons.map((lesson) => {
      const lessonProgress = progressMap.get(lesson.id);

      return {
        lessonId: lesson.id,
        title: lesson.title,
        orderIndex: lesson.orderIndex,
        weight: (lesson as any).weight ?? 1,
        isCompleted: lessonProgress?.isCompleted ?? false,
        completedAt: lessonProgress?.completedAt ?? null,
      };
    });
    const percentage =
      totalLessons > 0 ? Math.round((completedLessonCount / totalLessons) * 100) : 0;
    const totalWeight = lessons.reduce((sum, l: any) => sum + ((l.weight as number) ?? 1), 0);
    const completedWeight = lessons.reduce((sum: number, l: any) => {
      const p = progressMap.get(l.id);
      return sum + (p && p.isCompleted ? ((l.weight as number) ?? 1) : 0);
    }, 0);
    const weightedPercentage =
      totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

    return {
      courseId,
      studentId,
      totalLessons,
      completedLessons: completedLessonCount,
      percentage,
      totalWeight,
      completedWeight,
      weightedPercentage,
      enrollmentStatus: enrollment.status,
      lastProgressAt,
      lessons: lessonProgress,
    };
  }

  /**
   * Instructor view of all student progress in a course
   */
  async getAllStudentProgress(courseId: string): Promise<any[]> {
    const result = await this.getInstructorCourseProgress(courseId, {
      sub: 'system',
      email: 'system@local',
      role: 'ADMIN',
    });

    return result.students.map((student) => ({
      student: {
        id: student.studentId,
        name: student.studentName,
        email: student.studentEmail,
      },
      courseId,
      studentId: student.studentId,
      totalLessons: student.totalLessons,
      completedLessons: student.completedLessons,
      percentage: student.percentage,
      totalWeight: student.totalWeight,
      completedWeight: student.completedWeight,
      weightedPercentage: student.weightedPercentage,
      enrollmentStatus: student.enrollmentStatus,
      lastProgressAt: student.lastProgressAt,
    }));
  }

  async getInstructorCourseProgress(
    courseId: string,
    actor: JwtPayload,
    query: InstructorProgressQuery = {},
  ) {
    const course = await this.assertCanViewCourseProgress(courseId, actor);
    const lessons = await this.getCourseLessons(courseId);
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const studentIds = enrollments.map((enrollment) => enrollment.studentId);
    const progressRows = studentIds.length
      ? await prisma.progress.findMany({
          where: {
            studentId: { in: studentIds },
            lesson: { module: { courseId } },
          },
          select: {
            studentId: true,
            lessonId: true,
            isCompleted: true,
            completedAt: true,
            updatedAt: true,
          },
        })
      : [];

    const summaries = enrollments.map((enrollment) => {
      const studentProgress = progressRows.filter((row) => row.studentId === enrollment.studentId);
      const metrics = this.buildProgressMetrics(lessons, studentProgress);

      return {
        studentId: enrollment.student.id,
        studentName: enrollment.student.name,
        studentEmail: enrollment.student.email,
        enrollmentStatus: enrollment.status,
        enrolledAt: enrollment.createdAt,
        ...metrics,
      } satisfies StudentProgressSummary;
    });

    const filteredStudents = this.applyInstructorProgressFilters(summaries, query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    const pagedStudents = filteredStudents.slice(start, start + pageSize);

    return {
      course: {
        id: course.id,
        title: course.title,
        totalLessons: lessons.length,
        totalStudents: summaries.length,
        activeStudents: summaries.filter(
          (student) => student.enrollmentStatus === ENROLLMENT_STATUS.ACTIVE,
        ).length,
        completedStudents: summaries.filter(
          (student) => student.enrollmentStatus === ENROLLMENT_STATUS.COMPLETED,
        ).length,
        droppedStudents: summaries.filter(
          (student) => student.enrollmentStatus === ENROLLMENT_STATUS.DROPPED,
        ).length,
        averageProgress: summaries.length
          ? Math.round(
              summaries.reduce((sum, student) => sum + student.percentage, 0) / summaries.length,
            )
          : 0,
        averageWeightedProgress: summaries.length
          ? Math.round(
              summaries.reduce((sum, student) => sum + student.weightedPercentage, 0) /
                summaries.length,
            )
          : 0,
      },
      students: pagedStudents,
      pagination: {
        page,
        pageSize,
        total: filteredStudents.length,
        totalPages: filteredStudents.length ? Math.ceil(filteredStudents.length / pageSize) : 0,
      },
    };
  }

  async getInstructorStudentCourseProgress(courseId: string, studentId: string, actor: JwtPayload) {
    const course = await this.assertCanViewCourseProgress(courseId, actor);
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw NotFoundError('Enrollment not found');
    }

    const lessons = await this.getCourseLessons(courseId);
    const progressRows = await prisma.progress.findMany({
      where: {
        studentId,
        lesson: { module: { courseId } },
      },
      select: {
        lessonId: true,
        isCompleted: true,
        completedAt: true,
        updatedAt: true,
      },
    });
    const metrics = this.buildProgressMetrics(lessons, progressRows);
    const progressMap = new Map(progressRows.map((row) => [row.lessonId, row]));

    return {
      course: {
        id: course.id,
        title: course.title,
      },
      student: enrollment.student,
      summary: {
        enrollmentStatus: enrollment.status,
        completedLessons: metrics.completedLessons,
        totalLessons: metrics.totalLessons,
        percentage: metrics.percentage,
        weightedPercentage: metrics.weightedPercentage,
        lastProgressAt: metrics.lastProgressAt,
      },
      lessons: lessons.map((lesson) => {
        const progress = progressMap.get(lesson.id);

        return {
          lessonId: lesson.id,
          title: lesson.title,
          orderIndex: lesson.orderIndex,
          weight: lesson.weight,
          isCompleted: progress?.isCompleted ?? false,
          completedAt: progress?.completedAt ?? null,
        };
      }),
    };
  }

  async getMyProgressHistory(studentId: string, query: ProgressHistoryQuery = {}) {
    return this.getProgressHistory({ studentId }, query);
  }

  async getCourseProgressHistory(
    courseId: string,
    actor: JwtPayload,
    query: ProgressHistoryQuery = {},
  ) {
    await this.assertCanViewCourseProgress(courseId, actor);
    return this.getProgressHistory({ courseId }, query);
  }

  async getStudentCourseProgressHistory(
    courseId: string,
    studentId: string,
    actor: JwtPayload,
    query: ProgressHistoryQuery = {},
  ) {
    await this.assertCanViewCourseProgress(courseId, actor);
    return this.getProgressHistory({ courseId, studentId }, query);
  }

  async getAdminProgressOverview() {
    const courses = await prisma.course.findMany({
      where: { deletedAt: null },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const aggregates = await this.buildCourseProgressAggregates(courses);
    const totalCourses = aggregates.length;
    const totalStudents = aggregates.reduce((sum, course) => sum + course.totalStudents, 0);
    const activeStudents = aggregates.reduce((sum, course) => sum + course.activeStudents, 0);
    const completedStudents = aggregates.reduce((sum, course) => sum + course.completedStudents, 0);
    const droppedStudents = aggregates.reduce((sum, course) => sum + course.droppedStudents, 0);
    const averageProgress = totalCourses
      ? Math.round(
          aggregates.reduce((sum, course) => sum + course.averageProgress, 0) / totalCourses,
        )
      : 0;
    const averageWeightedProgress = totalCourses
      ? Math.round(
          aggregates.reduce((sum, course) => sum + course.averageWeightedProgress, 0) /
            totalCourses,
        )
      : 0;
    const averageCompletionRate = totalCourses
      ? Math.round(
          aggregates.reduce((sum, course) => sum + course.completionRate, 0) / totalCourses,
        )
      : 0;
    const lastActivityAt = aggregates.reduce<Date | null>((latest, course) => {
      if (!course.lastActivityAt) {
        return latest;
      }

      if (!latest || course.lastActivityAt > latest) {
        return course.lastActivityAt;
      }

      return latest;
    }, null);

    return {
      summary: {
        totalCourses,
        totalStudents,
        activeStudents,
        completedStudents,
        droppedStudents,
        averageProgress,
        averageWeightedProgress,
        averageCompletionRate,
        lastActivityAt,
      },
    };
  }

  async getAdminCourseProgressList(query: AdminCourseProgressQuery = {}) {
    const courseWhere = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' as const } },
              { instructor: { name: { contains: query.search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
      ...(query.instructorId ? { instructorId: query.instructorId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const courses = await prisma.course.findMany({
      where: courseWhere,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const aggregates = await this.buildCourseProgressAggregates(courses);
    const sorted = this.applyAdminCourseSort(aggregates, query);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    const data = sorted.slice(start, start + pageSize);

    return {
      courses: data,
      pagination: {
        page,
        pageSize,
        total: sorted.length,
        totalPages: sorted.length ? Math.ceil(sorted.length / pageSize) : 0,
      },
    };
  }

  /**
   * Set lesson progress state (NOT_STARTED, IN_PROGRESS, COMPLETED)
   */
  async setLessonState(lessonId: string, studentId: string, state: string): Promise<Progress> {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, deletedAt: null },
      select: {
        id: true,
        module: { select: { courseId: true, course: { select: { title: true } } } },
      },
    });
    if (!lesson) throw NotFoundError('Lesson not found');

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: lesson.module.courseId } },
      include: { student: { select: { id: true, email: true, name: true } } },
    });

    if (!enrollment || enrollment.status === ENROLLMENT_STATUS.DROPPED) {
      throw ForbiddenError('Student is not enrolled in this course');
    }

    return prisma.$transaction(async (tx) => {
      const isCompleted = state === PROGRESS_STATE.COMPLETED;
      const existingProgress = await tx.progress.findUnique({
        where: { studentId_lessonId: { studentId, lessonId } },
        select: { isCompleted: true },
      });
      const fromState = this.deriveProgressState(existingProgress?.isCompleted);

      const progress = await tx.progress.upsert({
        where: { studentId_lessonId: { studentId, lessonId } },
        update: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
        create: {
          studentId,
          lessonId,
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      });

      const [totalLessons, completedLessons] = await Promise.all([
        tx.lesson.count({
          where: { module: { courseId: lesson.module.courseId }, deletedAt: null },
        }),
        tx.progress.count({
          where: {
            studentId,
            isCompleted: true,
            lesson: { module: { courseId: lesson.module.courseId } },
          },
        }),
      ]);

      const nextEnrollmentStatus =
        totalLessons > 0 && completedLessons === totalLessons
          ? ENROLLMENT_STATUS.COMPLETED
          : ENROLLMENT_STATUS.ACTIVE;

      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { status: nextEnrollmentStatus },
      });

      await this.createProgressHistoryRecord(tx, {
        studentId,
        lessonId,
        courseId: lesson.module.courseId,
        fromState,
        toState: state,
        isCompleted,
        actionType: `SET_${state}`,
        changedById: studentId,
      });

      if (enrollment.status !== nextEnrollmentStatus) {
        await this.createProgressHistoryRecord(tx, {
          studentId,
          lessonId: null,
          courseId: lesson.module.courseId,
          fromState: enrollment.status,
          toState: nextEnrollmentStatus,
          isCompleted: nextEnrollmentStatus === ENROLLMENT_STATUS.COMPLETED,
          actionType:
            nextEnrollmentStatus === ENROLLMENT_STATUS.COMPLETED
              ? 'COURSE_COMPLETED'
              : 'COURSE_REOPENED',
          changedById: studentId,
        });
      }

      if (
        enrollment.status !== ENROLLMENT_STATUS.COMPLETED &&
        nextEnrollmentStatus === ENROLLMENT_STATUS.COMPLETED
      ) {
        await this.emailService.sendCourseCompletedEmail({
          userId: enrollment.student.id,
          recipient: enrollment.student.email,
          studentName: enrollment.student.name,
          courseTitle: lesson.module.course.title,
          completedLessons,
          totalLessons,
        });
      }

      return progress;
    });
  }

  /**
   * Get comprehensive progress overview for a student
   * Includes summary stats and all course progress
   */
  async getProgressOverview(studentId: string): Promise<any> {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
            instructor: { select: { name: true } },
          },
        },
        student: { select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Get progress for each course
    const courseProgressList = await Promise.all(
      enrollments.map(async (e) => {
        const progress = await this.getCourseProgress(e.courseId, studentId);
        return {
          courseId: e.course.id,
          courseTitle: e.course.title,
          courseThumbnail: e.course.thumbnailUrl,
          instructorName: e.course.instructor.name,
          enrollmentStatus: e.status,
          enrolledAt: e.createdAt,
          completedAt: e.updatedAt,
          lessonsCompleted: progress.completedLessons,
          totalLessons: progress.totalLessons,
          percentage: progress.percentage,
          weightedPercentage: progress.weightedPercentage,
          totalWeight: progress.totalWeight,
          completedWeight: progress.completedWeight,
        };
      }),
    );

    // Calculate summary stats
    const activeCourses = courseProgressList.filter(
      (c) => c.enrollmentStatus === ENROLLMENT_STATUS.ACTIVE,
    ).length;
    const completedCourses = courseProgressList.filter(
      (c) => c.enrollmentStatus === ENROLLMENT_STATUS.COMPLETED,
    ).length;
    const droppedCourses = courseProgressList.filter(
      (c) => c.enrollmentStatus === ENROLLMENT_STATUS.DROPPED,
    ).length;
    const totalCourses = courseProgressList.length;

    // Calculate overall weighted progress
    let totalOverallWeight = 0;
    let totalCompletedOverallWeight = 0;

    courseProgressList.forEach((course) => {
      totalOverallWeight += course.totalWeight;
      totalCompletedOverallWeight += course.completedWeight;
    });

    const overallProgress =
      totalOverallWeight > 0
        ? Math.round((totalCompletedOverallWeight / totalOverallWeight) * 100)
        : 0;

    // Get last activity timestamp
    const lastActivity = await prisma.progress.findFirst({
      where: { studentId },
      select: { updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      summary: {
        totalCourses,
        activeCourses,
        completedCourses,
        droppedCourses,
        overallProgress,
        lastActivityAt: lastActivity?.updatedAt ?? null,
      },
      courses: courseProgressList,
    };
  }

  /**
   * Get progress overview summary only (lightweight)
   */
  async getProgressOverviewSummary(studentId: string): Promise<any> {
    const enrollmentCounts = await prisma.enrollment.groupBy({
      by: ['status'],
      where: { studentId },
      _count: true,
    });

    const statusMap = new Map();
    enrollmentCounts.forEach((item) => {
      statusMap.set(item.status, item._count);
    });

    const totalCourses = enrollmentCounts.reduce((sum, item) => sum + item._count, 0);
    const activeCourses = statusMap.get(ENROLLMENT_STATUS.ACTIVE) ?? 0;
    const completedCourses = statusMap.get(ENROLLMENT_STATUS.COMPLETED) ?? 0;
    const droppedCourses = statusMap.get(ENROLLMENT_STATUS.DROPPED) ?? 0;

    // Calculate overall weighted progress
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      select: { courseId: true },
    });

    let totalOverallWeight = 0;
    let totalCompletedOverallWeight = 0;

    for (const enrollment of enrollments) {
      const lessons = await prisma.lesson.findMany({
        where: { module: { courseId: enrollment.courseId }, deletedAt: null },
        select: { id: true },
      });

      const progress = await prisma.progress.findMany({
        where: { studentId, lesson: { module: { courseId: enrollment.courseId } } },
        select: { lessonId: true, isCompleted: true },
      });

      const progressMap = new Map(progress.map((p) => [p.lessonId, p.isCompleted]));

      lessons.forEach((lesson) => {
        const weight = 1;
        totalOverallWeight += weight;
        if (progressMap.get(lesson.id)) {
          totalCompletedOverallWeight += weight;
        }
      });
    }

    const overallProgress =
      totalOverallWeight > 0
        ? Math.round((totalCompletedOverallWeight / totalOverallWeight) * 100)
        : 0;

    // Get last activity
    const lastActivity = await prisma.progress.findFirst({
      where: { studentId },
      select: { updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      summary: {
        totalCourses,
        activeCourses,
        completedCourses,
        droppedCourses,
        overallProgress,
        lastActivityAt: lastActivity?.updatedAt ?? null,
      },
    };
  }

  /**
   * Get student activity timeline
   */
  async getActivityTimeline(
    studentId: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<any> {
    // Get recent progress updates
    const progressActivities = await prisma.progress.findMany({
      where: { studentId, isCompleted: true },
      select: {
        id: true,
        lessonId: true,
        completedAt: true,
        lesson: {
          select: {
            title: true,
            module: {
              select: {
                courseId: true,
                course: { select: { title: true } },
              },
            },
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: limit * 2, // Fetch more to mix with enrollments
    });

    // Get recent enrollments
    const enrollmentActivities = await prisma.enrollment.findMany({
      where: { studentId },
      select: {
        id: true,
        createdAt: true,
        status: true,
        course: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
    });

    // Combine and sort
    const allActivities: any[] = [];

    progressActivities.forEach((p) => {
      if (p.completedAt) {
        allActivities.push({
          id: p.id,
          type: 'LESSON_COMPLETED',
          courseId: p.lesson.module.courseId,
          courseTitle: p.lesson.module.course.title,
          description: `Completed lesson: ${p.lesson.title}`,
          timestamp: p.completedAt,
        });
      }
    });

    enrollmentActivities.forEach((e) => {
      const typeMap: Record<string, string> = {
        [ENROLLMENT_STATUS.ACTIVE]: 'ENROLLED',
        [ENROLLMENT_STATUS.COMPLETED]: 'COURSE_COMPLETED',
        [ENROLLMENT_STATUS.DROPPED]: 'DROPPED',
      };

      allActivities.push({
        id: e.id,
        type: typeMap[e.status] ?? 'ENROLLED',
        courseId: '', // Enrollment doesn't have courseId in select, would need to add
        courseTitle: e.course.title,
        description:
          e.status === ENROLLMENT_STATUS.COMPLETED
            ? `Completed course: ${e.course.title}`
            : e.status === ENROLLMENT_STATUS.DROPPED
              ? `Dropped course: ${e.course.title}`
              : `Enrolled in: ${e.course.title}`,
        timestamp: e.createdAt,
      });
    });

    // Sort by timestamp descending
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Paginate
    const paginatedActivities = allActivities.slice(offset, offset + limit);
    const hasMore = allActivities.length > offset + limit;

    return {
      activities: paginatedActivities,
      hasMore,
    };
  }

  private async assertCanViewCourseProgress(courseId: string, actor: JwtPayload) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, deletedAt: null },
      select: {
        id: true,
        title: true,
        instructorId: true,
      },
    });

    if (!course) {
      throw NotFoundError('Course not found');
    }

    if (actor.role !== 'ADMIN' && course.instructorId !== actor.sub) {
      throw ForbiddenError('You do not have permission to view progress for this course');
    }

    return course;
  }

  private async getCourseLessons(courseId: string): Promise<ProgressLesson[]> {
    const lessons = await prisma.lesson.findMany({
      where: { module: { courseId }, deletedAt: null },
      select: { id: true, title: true, orderIndex: true },
      orderBy: [{ module: { orderIndex: 'asc' } }, { orderIndex: 'asc' }],
    });

    return lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      orderIndex: lesson.orderIndex,
      weight: 1,
    }));
  }

  private buildProgressMetrics(
    lessons: ProgressLesson[],
    progressRows: Array<{
      lessonId: string;
      isCompleted: boolean;
      completedAt: Date | null;
      updatedAt: Date;
    }>,
  ) {
    const progressMap = new Map(progressRows.map((row) => [row.lessonId, row]));
    const totalLessons = lessons.length;
    const completedLessons = lessons.reduce((count, lesson) => {
      const progress = progressMap.get(lesson.id);
      return count + (progress?.isCompleted ? 1 : 0);
    }, 0);
    const totalWeight = lessons.reduce((sum, lesson) => sum + lesson.weight, 0);
    const completedWeight = lessons.reduce((sum, lesson) => {
      const progress = progressMap.get(lesson.id);
      return sum + (progress?.isCompleted ? lesson.weight : 0);
    }, 0);
    const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const weightedPercentage =
      totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
    const lastProgressAt = progressRows.reduce<Date | null>((latest, row) => {
      const current = row.completedAt ?? row.updatedAt;

      if (!latest || current > latest) {
        return current;
      }

      return latest;
    }, null);

    return {
      totalLessons,
      completedLessons,
      percentage,
      totalWeight,
      completedWeight,
      weightedPercentage,
      lastProgressAt,
    };
  }

  private applyInstructorProgressFilters(
    students: StudentProgressSummary[],
    query: InstructorProgressQuery,
  ) {
    const search = query.search?.trim().toLowerCase();
    const sortBy = query.sortBy ?? 'progress';
    const sortOrder = query.sortOrder ?? 'desc';

    const filtered = students.filter((student) => {
      if (query.status && student.enrollmentStatus !== query.status) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        student.studentName.toLowerCase().includes(search) ||
        student.studentEmail.toLowerCase().includes(search)
      );
    });

    filtered.sort((left, right) => {
      let comparison = 0;

      if (sortBy === 'name') {
        comparison = left.studentName.localeCompare(right.studentName);
      } else if (sortBy === 'lastActivity') {
        comparison = (left.lastProgressAt?.getTime() ?? 0) - (right.lastProgressAt?.getTime() ?? 0);
      } else if (sortBy === 'enrolledAt') {
        comparison = left.enrolledAt.getTime() - right.enrolledAt.getTime();
      } else {
        comparison = left.weightedPercentage - right.weightedPercentage;
      }

      return sortOrder === 'asc' ? comparison : comparison * -1;
    });

    return filtered;
  }

  private async buildCourseProgressAggregates(
    courses: Array<{
      id: string;
      title: string;
      status: string;
      instructorId: string;
      instructor: { id: string; name: string };
    }>,
  ): Promise<CourseProgressAggregate[]> {
    const courseIds = courses.map((course) => course.id);

    if (!courseIds.length) {
      return [];
    }

    const [lessons, enrollments, progressRows] = await Promise.all([
      prisma.lesson.findMany({
        where: {
          module: { courseId: { in: courseIds } },
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          orderIndex: true,
          module: { select: { courseId: true } },
        },
      }),
      prisma.enrollment.findMany({
        where: { courseId: { in: courseIds } },
        select: {
          courseId: true,
          studentId: true,
          status: true,
          createdAt: true,
          student: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.progress.findMany({
        where: {
          lesson: { module: { courseId: { in: courseIds } } },
        },
        select: {
          studentId: true,
          lessonId: true,
          isCompleted: true,
          completedAt: true,
          updatedAt: true,
          lesson: { select: { module: { select: { courseId: true } } } },
        },
      }),
    ]);

    const lessonsByCourse = new Map<string, ProgressLesson[]>();
    lessons.forEach((lesson) => {
      const courseLessons = lessonsByCourse.get(lesson.module.courseId) ?? [];
      courseLessons.push({
        id: lesson.id,
        title: lesson.title,
        orderIndex: lesson.orderIndex,
        weight: 1,
      });
      lessonsByCourse.set(lesson.module.courseId, courseLessons);
    });

    const enrollmentsByCourse = new Map<string, typeof enrollments>();
    enrollments.forEach((enrollment) => {
      const courseEnrollments = enrollmentsByCourse.get(enrollment.courseId) ?? [];
      courseEnrollments.push(enrollment);
      enrollmentsByCourse.set(enrollment.courseId, courseEnrollments);
    });

    const progressByCourseStudent = new Map<
      string,
      Array<{ lessonId: string; isCompleted: boolean; completedAt: Date | null; updatedAt: Date }>
    >();
    progressRows.forEach((row) => {
      const key = `${row.lesson.module.courseId}:${row.studentId}`;
      const studentProgress = progressByCourseStudent.get(key) ?? [];
      studentProgress.push({
        lessonId: row.lessonId,
        isCompleted: row.isCompleted,
        completedAt: row.completedAt,
        updatedAt: row.updatedAt,
      });
      progressByCourseStudent.set(key, studentProgress);
    });

    return courses.map((course) => {
      const courseLessons = lessonsByCourse.get(course.id) ?? [];
      const courseEnrollments = enrollmentsByCourse.get(course.id) ?? [];
      const studentSummaries = courseEnrollments.map((enrollment) =>
        this.buildProgressMetrics(
          courseLessons,
          progressByCourseStudent.get(`${course.id}:${enrollment.studentId}`) ?? [],
        ),
      );
      const totalStudents = courseEnrollments.length;
      const activeStudents = courseEnrollments.filter(
        (enrollment) => enrollment.status === ENROLLMENT_STATUS.ACTIVE,
      ).length;
      const completedStudents = courseEnrollments.filter(
        (enrollment) => enrollment.status === ENROLLMENT_STATUS.COMPLETED,
      ).length;
      const droppedStudents = courseEnrollments.filter(
        (enrollment) => enrollment.status === ENROLLMENT_STATUS.DROPPED,
      ).length;
      const averageProgress = totalStudents
        ? Math.round(
            studentSummaries.reduce((sum, student) => sum + student.percentage, 0) / totalStudents,
          )
        : 0;
      const averageWeightedProgress = totalStudents
        ? Math.round(
            studentSummaries.reduce((sum, student) => sum + student.weightedPercentage, 0) /
              totalStudents,
          )
        : 0;
      const completionRate = totalStudents
        ? Math.round((completedStudents / totalStudents) * 100)
        : 0;
      const lastActivityAt = studentSummaries.reduce<Date | null>((latest, student) => {
        if (!student.lastProgressAt) {
          return latest;
        }

        if (!latest || student.lastProgressAt > latest) {
          return student.lastProgressAt;
        }

        return latest;
      }, null);

      return {
        courseId: course.id,
        courseTitle: course.title,
        instructorId: course.instructor.id,
        instructorName: course.instructor.name,
        status: course.status,
        totalLessons: courseLessons.length,
        totalStudents,
        activeStudents,
        completedStudents,
        droppedStudents,
        averageProgress,
        averageWeightedProgress,
        completionRate,
        lastActivityAt,
      };
    });
  }

  private applyAdminCourseSort(
    courses: CourseProgressAggregate[],
    query: AdminCourseProgressQuery,
  ) {
    const sortBy = query.sortBy ?? 'progress';
    const sortOrder = query.sortOrder ?? 'desc';
    const sorted = [...courses];

    sorted.sort((left, right) => {
      let comparison = 0;

      if (sortBy === 'title') {
        comparison = left.courseTitle.localeCompare(right.courseTitle);
      } else if (sortBy === 'students') {
        comparison = left.totalStudents - right.totalStudents;
      } else if (sortBy === 'completionRate') {
        comparison = left.completionRate - right.completionRate;
      } else {
        comparison = left.averageWeightedProgress - right.averageWeightedProgress;
      }

      return sortOrder === 'asc' ? comparison : comparison * -1;
    });

    return sorted;
  }

  private deriveProgressState(isCompleted?: boolean | null) {
    if (isCompleted === true) {
      return PROGRESS_STATE.COMPLETED;
    }

    if (isCompleted === false) {
      return PROGRESS_STATE.IN_PROGRESS;
    }

    return PROGRESS_STATE.NOT_STARTED;
  }

  private async createProgressHistoryRecord(
    tx: any,
    record: {
      studentId: string;
      lessonId: string | null;
      courseId: string;
      fromState: string | null;
      toState: string;
      isCompleted: boolean;
      actionType: string;
      changedById: string;
    },
  ) {
    if (!tx.progressHistory?.create) {
      return;
    }

    await tx.progressHistory.create({
      data: record,
    });
  }

  private async getProgressHistory(
    filters: { studentId?: string; courseId?: string },
    query: ProgressHistoryQuery,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = {
      ...(filters.studentId ? { studentId: filters.studentId } : {}),
      ...(filters.courseId ? { courseId: filters.courseId } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.lessonId ? { lessonId: query.lessonId } : {}),
      ...(query.actionType ? { actionType: query.actionType } : {}),
    };

    const repo = (prisma as any).progressHistory;
    const [total, items] = await Promise.all([
      repo.count({ where }),
      repo.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          lesson: { select: { id: true, title: true } },
          course: { select: { id: true, title: true } },
          student: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      items: items.map((item: any) => ({
        id: item.id,
        studentId: item.studentId,
        studentName: item.student?.name,
        courseId: item.courseId,
        courseTitle: item.course?.title,
        lessonId: item.lessonId,
        lessonTitle: item.lesson?.title ?? null,
        fromState: item.fromState,
        toState: item.toState,
        actionType: item.actionType,
        changedById: item.changedById,
        createdAt: item.createdAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total ? Math.ceil(total / pageSize) : 0,
      },
    };
  }
}

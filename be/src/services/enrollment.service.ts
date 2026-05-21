import prisma from '@config/prisma';
import { NotFoundError, ConflictError, ForbiddenError } from '@shared/errors/AppError';
import { Enrollment, EnrollmentStatus } from '@prisma/client';
import { ENROLLMENT_STATUS, NOTIFICATION_TYPE, USER_ROLES } from '@shared/constants';
import { SocketService } from './socket.service';
import { ProgressService } from './progress.service';
import { EmailService } from './email.service';

export class EnrollmentService {
  private progressService = new ProgressService();
  private emailService = new EmailService();

  private async initializeProgress(studentId: string, courseId: string) {
    const lessons = await prisma.lesson.findMany({
      where: {
        deletedAt: null,
        module: {
          courseId,
        },
      },
      select: { id: true },
    });

    if (lessons.length === 0) return;

    await prisma.progress.createMany({
      data: lessons.map((lesson) => ({
        studentId,
        lessonId: lesson.id,
        isCompleted: false,
      })),
      skipDuplicates: true,
    });
  }

  private async sendEnrollmentNotification(params: {
    studentId: string;
    courseId: string;
    courseTitle: string;
    enrollmentId: string;
    action: 'enrolled' | 'reactivated' | 'unenrolled';
  }) {
    const messageMap = {
      enrolled: `You have been enrolled in "${params.courseTitle}".`,
      reactivated: `Your enrollment in "${params.courseTitle}" has been reactivated.`,
      unenrolled: `You have been unenrolled from "${params.courseTitle}".`,
    } as const;

    const notification = await prisma.notification.create({
      data: {
        userId: params.studentId,
        type: NOTIFICATION_TYPE.COURSE,
        message: messageMap[params.action],
        courseId: params.courseId,
        referenceId: params.enrollmentId,
      },
    });

    SocketService.sendToUser(params.studentId, 'notification', notification);
  }

  /**
   * Enroll a student in a course
   */
  async enroll(data: { studentId: string; courseId: string }, userId: string, userRole: string): Promise<Enrollment> {
    const course = await prisma.course.findFirst({
      where: { id: data.courseId, deletedAt: null },
      select: { id: true, title: true, instructorId: true },
    });
    if (!course) throw NotFoundError('Course not found');

    if (userRole !== USER_ROLES.ADMIN && course.instructorId !== userId) {
      throw ForbiddenError('You do not have permission to enroll students in this course');
    }

    const student = await prisma.user.findFirst({
      where: { id: data.studentId, role: USER_ROLES.STUDENT, deletedAt: null },
      select: { id: true, email: true, name: true },
    });
    if (!student) throw NotFoundError('Student not found');

    const existing = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: data.studentId, courseId: data.courseId } },
    });
    const emailAction = existing?.status === ENROLLMENT_STATUS.DROPPED ? 'reactivated' : 'enrolled';

    const enrollment = await prisma.$transaction(async (tx) => {
      if (existing && existing.status !== ENROLLMENT_STATUS.DROPPED) {
        throw ConflictError('Student is already enrolled in this course');
      }

      const record = existing
        ? await tx.enrollment.update({
            where: { id: existing.id },
            data: { status: ENROLLMENT_STATUS.ACTIVE },
          })
        : await tx.enrollment.create({
            data: {
              studentId: data.studentId,
              courseId: data.courseId,
              status: ENROLLMENT_STATUS.ACTIVE,
            },
          });

      await this.initializeProgress(data.studentId, data.courseId);

      return record;
    });

    await this.sendEnrollmentNotification({
      studentId: data.studentId,
      courseId: data.courseId,
      courseTitle: course.title,
      enrollmentId: enrollment.id,
      action: emailAction,
    });

    await this.emailService.sendEnrollmentEmail({
      userId: student.id,
      recipient: student.email,
      studentName: student.name,
      courseTitle: course.title,
      action: emailAction,
    });

    return enrollment;
  }

  /**
   * Unenroll student
   */
  async unenroll(id: string, userId: string, userRole: string): Promise<void> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, instructorId: true } },
        student: { select: { id: true, email: true, name: true } },
      },
    });
    if (!enrollment) throw NotFoundError('Enrollment not found');

    if (userRole !== USER_ROLES.ADMIN && enrollment.course.instructorId !== userId) {
      throw ForbiddenError('You do not have permission to unenroll students from this course');
    }

    const updated = await prisma.enrollment.update({
      where: { id },
      data: { status: ENROLLMENT_STATUS.DROPPED },
    });

    await this.sendEnrollmentNotification({
      studentId: updated.studentId,
      courseId: updated.courseId,
      courseTitle: enrollment.course.title,
      enrollmentId: updated.id,
      action: 'unenrolled',
    });

    await this.emailService.sendEnrollmentEmail({
      userId: enrollment.student.id,
      recipient: enrollment.student.email,
      studentName: enrollment.student.name,
      courseTitle: enrollment.course.title,
      action: 'unenrolled',
    });
  }

  /**
   * Update an enrollment status
   */
  async updateStatus(
    id: string,
    userId: string,
    userRole: string,
    status: EnrollmentStatus,
  ): Promise<Enrollment> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, instructorId: true } },
        student: { select: { id: true, email: true, name: true } },
      },
    });

    if (!enrollment) throw NotFoundError('Enrollment not found');

    if (userRole !== USER_ROLES.ADMIN && enrollment.course.instructorId !== userId) {
      throw ForbiddenError('You do not have permission to update this enrollment');
    }

    if (enrollment.status === status) {
      return enrollment;
    }

    const updated = await prisma.enrollment.update({
      where: { id },
      data: { status },
    });

    const action =
      status === ENROLLMENT_STATUS.DROPPED
        ? 'unenrolled'
        : enrollment.status === ENROLLMENT_STATUS.DROPPED && status === ENROLLMENT_STATUS.ACTIVE
          ? 'reactivated'
          : 'enrolled';

    await this.sendEnrollmentNotification({
      studentId: enrollment.student.id,
      courseId: enrollment.course.id,
      courseTitle: enrollment.course.title,
      enrollmentId: updated.id,
      action,
    });

    await this.emailService.sendEnrollmentEmail({
      userId: enrollment.student.id,
      recipient: enrollment.student.email,
      studentName: enrollment.student.name,
      courseTitle: enrollment.course.title,
      action,
    });

    return updated;
  }

  /**
   * List students enrolled in a course
   */
  async listByCourse(courseId: string, userId: string, userRole: string): Promise<any[]> {
    const course = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
    if (!course) throw NotFoundError('Course not found');

    if (userRole !== USER_ROLES.ADMIN && course.instructorId !== userId) {
      throw ForbiddenError('Access denied');
    }

    return prisma.enrollment.findMany({
      where: { courseId, status: { not: ENROLLMENT_STATUS.DROPPED } },
      include: {
        student: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * List courses a student is enrolled in
   */
  async listByStudent(studentId: string): Promise<any[]> {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: { not: ENROLLMENT_STATUS.DROPPED } },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, name: true } },
          },
        },
      },
    });

    return Promise.all(
      enrollments.map(async (enrollment) => {
        const progress = await this.progressService.getCourseProgress(enrollment.courseId, studentId);

        return {
          enrollmentId: enrollment.id,
          enrolledAt: enrollment.createdAt,
          enrollmentUpdatedAt: enrollment.updatedAt,
          status: enrollment.status,
          course: enrollment.course,
          progress: {
            totalLessons: progress.totalLessons,
            completedLessons: progress.completedLessons,
            percentage: progress.percentage,
            enrollmentStatus: progress.enrollmentStatus,
            lastProgressAt: progress.lastProgressAt,
          },
        };
      }),
    );
  }

  /**
   * Get a student's enrollment status for a course
   */
  async getMyEnrollmentStatus(courseId: string, studentId: string): Promise<any> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!enrollment || enrollment.status === ENROLLMENT_STATUS.DROPPED) {
      throw NotFoundError('Enrollment not found');
    }

    const progress = await this.progressService.getCourseProgress(courseId, studentId);

    return {
      enrollmentId: enrollment.id,
      enrolledAt: enrollment.createdAt,
      enrollmentUpdatedAt: enrollment.updatedAt,
      status: enrollment.status,
      course: enrollment.course,
      progress: {
        totalLessons: progress.totalLessons,
        completedLessons: progress.completedLessons,
        percentage: progress.percentage,
        enrollmentStatus: progress.enrollmentStatus,
        lastProgressAt: progress.lastProgressAt,
      },
    };
  }
}

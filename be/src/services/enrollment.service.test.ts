import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, socketServiceMock, progressServiceMock, emailServiceMock } = vi.hoisted(() => {
  const prismaMock: any = {
    course: {
      findFirst: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    enrollment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    lesson: {
      findMany: vi.fn(),
    },
    progress: {
      createMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  };

  prismaMock.$transaction = vi.fn(async (callback: any) => callback(prismaMock));

  return {
    prismaMock,
    socketServiceMock: {
      sendToUser: vi.fn(),
    },
    progressServiceMock: {
      getCourseProgress: vi.fn(),
    },
    emailServiceMock: {
      sendEnrollmentEmail: vi.fn(),
    },
  };
});

vi.mock('@config/prisma', () => ({
  default: prismaMock,
}));

vi.mock('./socket.service', () => ({
  SocketService: socketServiceMock,
}));

vi.mock('./progress.service', () => ({
  ProgressService: class {
    getCourseProgress = progressServiceMock.getCourseProgress;
  },
}));

vi.mock('./email.service', () => ({
  EmailService: class {
    sendEnrollmentEmail = emailServiceMock.sendEnrollmentEmail;
  },
}));

import prisma from '@config/prisma';
import { COURSE_STATUS, ENROLLMENT_STATUS, NOTIFICATION_TYPE, USER_ROLES } from '@shared/constants';
import { EnrollmentService } from './enrollment.service';
import { SocketService } from './socket.service';

const enrollmentService = new EnrollmentService();
const mockedPrisma = prisma as any;

describe('EnrollmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enrolls a student, initializes progress rows, and sends a notification', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      title: 'React Basics',
      instructorId: 'instructor-1',
    });
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'student-1',
      email: 'student@example.com',
      name: 'Student One',
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue(null);
    mockedPrisma.enrollment.create.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId: 'course-1',
      status: ENROLLMENT_STATUS.ACTIVE,
    });
    mockedPrisma.lesson.findMany.mockResolvedValue([{ id: 'lesson-1' }, { id: 'lesson-2' }]);
    mockedPrisma.notification.create.mockResolvedValue({ id: 'notification-1' });

    const result = await enrollmentService.enroll(
      { studentId: 'student-1', courseId: 'course-1' },
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
    );

    expect(mockedPrisma.enrollment.create).toHaveBeenCalledWith({
      data: {
        studentId: 'student-1',
        courseId: 'course-1',
        status: ENROLLMENT_STATUS.ACTIVE,
      },
    });
    expect(mockedPrisma.progress.createMany).toHaveBeenCalledWith({
      data: [
        { studentId: 'student-1', lessonId: 'lesson-1', isCompleted: false },
        { studentId: 'student-1', lessonId: 'lesson-2', isCompleted: false },
      ],
      skipDuplicates: true,
    });
    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'student-1',
        type: NOTIFICATION_TYPE.COURSE,
        courseId: 'course-1',
        referenceId: 'enrollment-1',
      }),
    });
    expect(emailServiceMock.sendEnrollmentEmail).toHaveBeenCalledWith({
      userId: 'student-1',
      recipient: 'student@example.com',
      studentName: 'Student One',
      courseTitle: 'React Basics',
      action: 'enrolled',
    });
    expect(SocketService.sendToUser).toHaveBeenCalledWith('student-1', 'notification', {
      id: 'notification-1',
    });
    expect(result.status).toBe(ENROLLMENT_STATUS.ACTIVE);
  });

  it('reactivates a dropped enrollment instead of creating a duplicate', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({
      id: 'course-1',
      title: 'React Basics',
      instructorId: 'instructor-1',
    });
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'student-1',
      email: 'student@example.com',
      name: 'Student One',
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      status: ENROLLMENT_STATUS.DROPPED,
    });
    mockedPrisma.enrollment.update.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId: 'course-1',
      status: ENROLLMENT_STATUS.ACTIVE,
    });
    mockedPrisma.lesson.findMany.mockResolvedValue([]);
    mockedPrisma.notification.create.mockResolvedValue({ id: 'notification-1' });

    const result = await enrollmentService.enroll(
      { studentId: 'student-1', courseId: 'course-1' },
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
    );

    expect(mockedPrisma.enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enrollment-1' },
      data: { status: ENROLLMENT_STATUS.ACTIVE },
    });
    expect(mockedPrisma.enrollment.create).not.toHaveBeenCalled();
    expect(emailServiceMock.sendEnrollmentEmail).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'reactivated', courseTitle: 'React Basics' }),
    );
    expect(result.status).toBe(ENROLLMENT_STATUS.ACTIVE);
  });

  it('marks an enrollment as dropped on unenroll', async () => {
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId: 'course-1',
      course: {
        id: 'course-1',
        title: 'React Basics',
        instructorId: 'instructor-1',
      },
      student: {
        id: 'student-1',
        email: 'student@example.com',
        name: 'Student One',
      },
    });
    mockedPrisma.enrollment.update.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId: 'course-1',
    });
    mockedPrisma.notification.create.mockResolvedValue({ id: 'notification-1' });

    await enrollmentService.unenroll('enrollment-1', 'instructor-1', USER_ROLES.INSTRUCTOR);

    expect(mockedPrisma.enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enrollment-1' },
      data: { status: ENROLLMENT_STATUS.DROPPED },
    });
    expect(mockedPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'student-1',
        courseId: 'course-1',
      }),
    });
    expect(emailServiceMock.sendEnrollmentEmail).toHaveBeenCalledWith({
      userId: 'student-1',
      recipient: 'student@example.com',
      studentName: 'Student One',
      courseTitle: 'React Basics',
      action: 'unenrolled',
    });
  });

  it('returns enrolled course summaries for a student', async () => {
    mockedPrisma.enrollment.findMany.mockResolvedValue([
      {
        id: 'enrollment-1',
        studentId: 'student-1',
        courseId: 'course-1',
        status: ENROLLMENT_STATUS.ACTIVE,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        course: {
          id: 'course-1',
          title: 'React Basics',
          description: 'Learn React',
          thumbnailUrl: null,
          status: COURSE_STATUS.PUBLISHED,
          instructor: { id: 'instructor-1', name: 'Instructor One' },
        },
      },
    ]);
    progressServiceMock.getCourseProgress.mockResolvedValue({
      totalLessons: 10,
      completedLessons: 4,
      percentage: 40,
      enrollmentStatus: ENROLLMENT_STATUS.ACTIVE,
      lastProgressAt: new Date('2026-01-03T00:00:00.000Z'),
    });

    const result = await enrollmentService.listByStudent('student-1');

    expect(mockedPrisma.enrollment.findMany).toHaveBeenCalledWith({
      where: { studentId: 'student-1', status: { not: ENROLLMENT_STATUS.DROPPED } },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, name: true } },
          },
        },
      },
    });
    expect(progressServiceMock.getCourseProgress).toHaveBeenCalledWith('course-1', 'student-1');
    expect(result).toEqual([
      {
        enrollmentId: 'enrollment-1',
        enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
        enrollmentUpdatedAt: new Date('2026-01-02T00:00:00.000Z'),
        status: ENROLLMENT_STATUS.ACTIVE,
        course: {
          id: 'course-1',
          title: 'React Basics',
          description: 'Learn React',
          thumbnailUrl: null,
          status: COURSE_STATUS.PUBLISHED,
          instructor: { id: 'instructor-1', name: 'Instructor One' },
        },
        progress: {
          totalLessons: 10,
          completedLessons: 4,
          percentage: 40,
          enrollmentStatus: ENROLLMENT_STATUS.ACTIVE,
          lastProgressAt: new Date('2026-01-03T00:00:00.000Z'),
        },
      },
    ]);
  });

  it('returns a direct enrollment status summary for a student course', async () => {
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId: 'course-1',
      status: ENROLLMENT_STATUS.ACTIVE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      course: {
        id: 'course-1',
        title: 'React Basics',
        description: 'Learn React',
        thumbnailUrl: null,
        status: COURSE_STATUS.PUBLISHED,
        instructor: { id: 'instructor-1', name: 'Instructor One' },
      },
    });
    progressServiceMock.getCourseProgress.mockResolvedValue({
      totalLessons: 10,
      completedLessons: 7,
      percentage: 70,
      enrollmentStatus: ENROLLMENT_STATUS.ACTIVE,
      lastProgressAt: new Date('2026-01-04T00:00:00.000Z'),
    });

    const result = await enrollmentService.getMyEnrollmentStatus('course-1', 'student-1');

    expect(mockedPrisma.enrollment.findUnique).toHaveBeenCalledWith({
      where: { studentId_courseId: { studentId: 'student-1', courseId: 'course-1' } },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, name: true } },
          },
        },
      },
    });
    expect(progressServiceMock.getCourseProgress).toHaveBeenCalledWith('course-1', 'student-1');
    expect(result).toEqual({
      enrollmentId: 'enrollment-1',
      enrolledAt: new Date('2026-01-01T00:00:00.000Z'),
      enrollmentUpdatedAt: new Date('2026-01-02T00:00:00.000Z'),
      status: ENROLLMENT_STATUS.ACTIVE,
      course: {
        id: 'course-1',
        title: 'React Basics',
        description: 'Learn React',
        thumbnailUrl: null,
        status: COURSE_STATUS.PUBLISHED,
        instructor: { id: 'instructor-1', name: 'Instructor One' },
      },
      progress: {
        totalLessons: 10,
        completedLessons: 7,
        percentage: 70,
        enrollmentStatus: ENROLLMENT_STATUS.ACTIVE,
        lastProgressAt: new Date('2026-01-04T00:00:00.000Z'),
      },
    });
  });

  it('updates an enrollment status and sends lifecycle alerts', async () => {
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId: 'course-1',
      status: ENROLLMENT_STATUS.ACTIVE,
      course: {
        id: 'course-1',
        title: 'React Basics',
        instructorId: 'instructor-1',
      },
      student: {
        id: 'student-1',
        email: 'student@example.com',
        name: 'Student One',
      },
    });
    mockedPrisma.enrollment.update.mockResolvedValue({
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId: 'course-1',
      status: ENROLLMENT_STATUS.DROPPED,
    });
    mockedPrisma.notification.create.mockResolvedValue({ id: 'notification-1' });
    mockedPrisma.user.findFirst.mockResolvedValue({
      id: 'student-1',
      email: 'student@example.com',
      name: 'Student One',
    });

    const result = await enrollmentService.updateStatus(
      'enrollment-1',
      'instructor-1',
      USER_ROLES.INSTRUCTOR,
      ENROLLMENT_STATUS.DROPPED,
    );

    expect(mockedPrisma.enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enrollment-1' },
      data: { status: ENROLLMENT_STATUS.DROPPED },
    });
    expect(emailServiceMock.sendEnrollmentEmail).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'unenrolled', courseTitle: 'React Basics' }),
    );
    expect(result.status).toBe(ENROLLMENT_STATUS.DROPPED);
  });
});

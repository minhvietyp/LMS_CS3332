import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, emailServiceMock } = vi.hoisted(() => {
  const prismaMock: any = {
    course: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    lesson: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    enrollment: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    progress: {
      upsert: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    progressHistory: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
  };

  prismaMock.$transaction = vi.fn(async (callback: any) => callback(prismaMock));

  return {
    prismaMock,
    emailServiceMock: {
      sendCourseCompletedEmail: vi.fn(),
    },
  };
});

vi.mock('@config/prisma', () => ({
  default: prismaMock,
}));

vi.mock('./email.service', () => ({
  EmailService: class {
    sendCourseCompletedEmail = emailServiceMock.sendCourseCompletedEmail;
  },
}));

import prisma from '@config/prisma';
import { ENROLLMENT_STATUS } from '@shared/constants';
import { ProgressService } from './progress.service';

const progressService = new ProgressService();
const mockedPrisma = prisma as any;

describe('ProgressService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks a lesson complete and updates enrollment status when the course is finished', async () => {
    mockedPrisma.lesson.findFirst.mockResolvedValue({
      id: 'lesson-1',
      module: { courseId: 'course-1', course: { title: 'React Basics' } },
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      status: ENROLLMENT_STATUS.ACTIVE,
      student: {
        id: 'student-1',
        email: 'student@example.com',
        name: 'Student One',
      },
    });
    mockedPrisma.progress.upsert.mockResolvedValue({
      id: 'progress-1',
      isCompleted: true,
    });
    mockedPrisma.lesson.count.mockResolvedValue(2);
    mockedPrisma.progress.count.mockResolvedValue(2);
    mockedPrisma.enrollment.update.mockResolvedValue({
      id: 'enrollment-1',
      status: ENROLLMENT_STATUS.COMPLETED,
    });

    const result = await progressService.markComplete('lesson-1', 'student-1', true);

    expect(mockedPrisma.progress.upsert).toHaveBeenCalledWith({
      where: { studentId_lessonId: { studentId: 'student-1', lessonId: 'lesson-1' } },
      update: { isCompleted: true, completedAt: expect.any(Date) },
      create: {
        studentId: 'student-1',
        lessonId: 'lesson-1',
        isCompleted: true,
        completedAt: expect.any(Date),
      },
    });
    expect(mockedPrisma.enrollment.update).toHaveBeenCalledWith({
      where: { id: 'enrollment-1' },
      data: { status: ENROLLMENT_STATUS.COMPLETED },
    });
    expect(mockedPrisma.progressHistory.create).toHaveBeenCalled();
    expect(emailServiceMock.sendCourseCompletedEmail).toHaveBeenCalledWith({
      userId: 'student-1',
      recipient: 'student@example.com',
      studentName: 'Student One',
      courseTitle: 'React Basics',
      completedLessons: 2,
      totalLessons: 2,
    });
    expect(result.isCompleted).toBe(true);
  });

  it('returns full lesson progress for an enrolled student', async () => {
    mockedPrisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enrollment-1',
      status: ENROLLMENT_STATUS.ACTIVE,
    });
    mockedPrisma.lesson.count.mockResolvedValue(2);
    mockedPrisma.lesson.findMany.mockResolvedValue([
      { id: 'lesson-1', title: 'Intro', orderIndex: 1, weight: 1 },
      { id: 'lesson-2', title: 'Setup', orderIndex: 2, weight: 1 },
    ]);
    mockedPrisma.progress.count.mockResolvedValue(1);
    mockedPrisma.progress.findMany.mockResolvedValue([
      {
        lessonId: 'lesson-1',
        isCompleted: true,
        completedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const result = await progressService.getCourseProgress('course-1', 'student-1');

    expect(result.percentage).toBe(50);
    expect(result.totalWeight).toBe(2);
    expect(result.completedWeight).toBe(1);
    expect(result.weightedPercentage).toBe(50);
    expect(result.lessons).toEqual([
      {
        lessonId: 'lesson-1',
        title: 'Intro',
        orderIndex: 1,
        weight: 1,
        isCompleted: true,
        completedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        lessonId: 'lesson-2',
        title: 'Setup',
        orderIndex: 2,
        weight: 1,
        isCompleted: false,
        completedAt: null,
      },
    ]);
  });

  it('rejects progress updates for unenrolled students', async () => {
    mockedPrisma.lesson.findFirst.mockResolvedValue({
      id: 'lesson-1',
      module: { courseId: 'course-1', course: { title: 'React Basics' } },
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue(null);

    await expect(progressService.markComplete('lesson-1', 'student-1', true)).rejects.toMatchObject(
      {
        statusCode: 403,
        message: 'Student is not enrolled in this course',
      },
    );
  });

  it('sets lesson state and does not complete when IN_PROGRESS', async () => {
    mockedPrisma.lesson.findFirst.mockResolvedValue({
      id: 'lesson-10',
      module: { courseId: 'course-10', course: { title: 'C10' } },
    });
    mockedPrisma.enrollment.findUnique.mockResolvedValue({
      id: 'enroll-10',
      status: ENROLLMENT_STATUS.ACTIVE,
      student: { id: 'student-10', email: 's10@e', name: 'S10' },
    });
    mockedPrisma.progress.findUnique.mockResolvedValue(null);
    mockedPrisma.progress.upsert.mockResolvedValue({ id: 'progress-10', isCompleted: false });
    mockedPrisma.lesson.count.mockResolvedValue(5);
    mockedPrisma.progress.count.mockResolvedValue(1);
    mockedPrisma.enrollment.update.mockResolvedValue({
      id: 'enroll-10',
      status: ENROLLMENT_STATUS.ACTIVE,
    });

    const result = await progressService.setLessonState('lesson-10', 'student-10', 'IN_PROGRESS');
    expect(result.isCompleted).toBe(false);
    expect(mockedPrisma.enrollment.update).toHaveBeenCalled();
  });

  describe('getCourseProgress - Course Completion Percentage Calculation', () => {
    it('calculates 100% completion when all lessons are completed', async () => {
      mockedPrisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
      mockedPrisma.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment-1',
        status: ENROLLMENT_STATUS.ACTIVE,
      });
      mockedPrisma.lesson.count.mockResolvedValue(3);
      mockedPrisma.lesson.findMany.mockResolvedValue([
        { id: 'lesson-1', title: 'Lesson 1', orderIndex: 1, weight: 1 },
        { id: 'lesson-2', title: 'Lesson 2', orderIndex: 2, weight: 1 },
        { id: 'lesson-3', title: 'Lesson 3', orderIndex: 3, weight: 1 },
      ]);
      mockedPrisma.progress.count.mockResolvedValue(3);
      mockedPrisma.progress.findMany.mockResolvedValue([
        {
          lessonId: 'lesson-1',
          isCompleted: true,
          completedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          lessonId: 'lesson-2',
          isCompleted: true,
          completedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
        {
          lessonId: 'lesson-3',
          isCompleted: true,
          completedAt: new Date('2026-01-03T00:00:00.000Z'),
        },
      ]);

      const result = await progressService.getCourseProgress('course-1', 'student-1');

      expect(result.percentage).toBe(100);
      expect(result.totalWeight).toBe(3);
      expect(result.completedWeight).toBe(3);
      expect(result.weightedPercentage).toBe(100);
    });

    it('calculates 0% completion when no lessons are completed', async () => {
      mockedPrisma.course.findFirst.mockResolvedValue({ id: 'course-2' });
      mockedPrisma.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment-2',
        status: ENROLLMENT_STATUS.ACTIVE,
      });
      mockedPrisma.lesson.count.mockResolvedValue(4);
      mockedPrisma.lesson.findMany.mockResolvedValue([
        { id: 'lesson-1', title: 'Lesson 1', orderIndex: 1, weight: 1 },
        { id: 'lesson-2', title: 'Lesson 2', orderIndex: 2, weight: 1 },
        { id: 'lesson-3', title: 'Lesson 3', orderIndex: 3, weight: 1 },
        { id: 'lesson-4', title: 'Lesson 4', orderIndex: 4, weight: 1 },
      ]);
      mockedPrisma.progress.count.mockResolvedValue(0);
      mockedPrisma.progress.findMany.mockResolvedValue([]);

      const result = await progressService.getCourseProgress('course-2', 'student-2');

      expect(result.percentage).toBe(0);
      expect(result.totalWeight).toBe(4);
      expect(result.completedWeight).toBe(0);
      expect(result.weightedPercentage).toBe(0);
    });

    it('calculates correct percentage with weighted lessons', async () => {
      mockedPrisma.course.findFirst.mockResolvedValue({ id: 'course-3' });
      mockedPrisma.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment-3',
        status: ENROLLMENT_STATUS.ACTIVE,
      });
      mockedPrisma.lesson.count.mockResolvedValue(3);
      mockedPrisma.lesson.findMany.mockResolvedValue([
        { id: 'lesson-1', title: 'Intro', orderIndex: 1, weight: 1 },
        { id: 'lesson-2', title: 'Advanced', orderIndex: 2, weight: 3 },
        { id: 'lesson-3', title: 'Project', orderIndex: 3, weight: 2 },
      ]);
      mockedPrisma.progress.count.mockResolvedValue(1);
      mockedPrisma.progress.findMany.mockResolvedValue([
        {
          lessonId: 'lesson-2',
          isCompleted: true,
          completedAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ]);

      const result = await progressService.getCourseProgress('course-3', 'student-3');

      expect(result.percentage).toBe(33); // 1 out of 3 lessons = ~33%
      expect(result.totalWeight).toBe(6); // 1 + 3 + 2
      expect(result.completedWeight).toBe(3); // only lesson-2 (weight 3)
      expect(result.weightedPercentage).toBe(50); // 3/6 = 50%
    });

    it('calculates correct percentage with mixed weights and partial completion', async () => {
      mockedPrisma.course.findFirst.mockResolvedValue({ id: 'course-4' });
      mockedPrisma.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment-4',
        status: ENROLLMENT_STATUS.ACTIVE,
      });
      mockedPrisma.lesson.count.mockResolvedValue(4);
      mockedPrisma.lesson.findMany.mockResolvedValue([
        { id: 'lesson-1', title: 'Part 1', orderIndex: 1, weight: 2 },
        { id: 'lesson-2', title: 'Part 2', orderIndex: 2, weight: 2 },
        { id: 'lesson-3', title: 'Part 3', orderIndex: 3, weight: 3 },
        { id: 'lesson-4', title: 'Part 4', orderIndex: 4, weight: 3 },
      ]);
      mockedPrisma.progress.count.mockResolvedValue(2);
      mockedPrisma.progress.findMany.mockResolvedValue([
        {
          lessonId: 'lesson-1',
          isCompleted: true,
          completedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        {
          lessonId: 'lesson-3',
          isCompleted: true,
          completedAt: new Date('2026-01-03T00:00:00.000Z'),
        },
      ]);

      const result = await progressService.getCourseProgress('course-4', 'student-4');

      expect(result.percentage).toBe(50); // 2 out of 4 lessons = 50%
      expect(result.totalWeight).toBe(10); // 2 + 2 + 3 + 3
      expect(result.completedWeight).toBe(5); // 2 (lesson-1) + 3 (lesson-3)
      expect(result.weightedPercentage).toBe(50); // 5/10 = 50%
    });

    it('handles fractional weighted percentages correctly with rounding', async () => {
      mockedPrisma.course.findFirst.mockResolvedValue({ id: 'course-5' });
      mockedPrisma.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment-5',
        status: ENROLLMENT_STATUS.ACTIVE,
      });
      mockedPrisma.lesson.count.mockResolvedValue(3);
      mockedPrisma.lesson.findMany.mockResolvedValue([
        { id: 'lesson-1', title: 'L1', orderIndex: 1, weight: 1 },
        { id: 'lesson-2', title: 'L2', orderIndex: 2, weight: 1 },
        { id: 'lesson-3', title: 'L3', orderIndex: 3, weight: 1 },
      ]);
      mockedPrisma.progress.count.mockResolvedValue(1);
      mockedPrisma.progress.findMany.mockResolvedValue([
        {
          lessonId: 'lesson-1',
          isCompleted: true,
          completedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

      const result = await progressService.getCourseProgress('course-5', 'student-5');

      expect(result.percentage).toBe(33); // 1/3 = 33.333... rounded
      expect(result.totalWeight).toBe(3);
      expect(result.completedWeight).toBe(1);
      expect(result.weightedPercentage).toBe(33); // 1/3 = 33.333... rounded
    });

    it('returns correct lesson array with weights included', async () => {
      mockedPrisma.course.findFirst.mockResolvedValue({ id: 'course-6' });
      mockedPrisma.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment-6',
        status: ENROLLMENT_STATUS.ACTIVE,
      });
      mockedPrisma.lesson.count.mockResolvedValue(2);
      mockedPrisma.lesson.findMany.mockResolvedValue([
        { id: 'lesson-1', title: 'Basics', orderIndex: 1, weight: 2 },
        { id: 'lesson-2', title: 'Advanced', orderIndex: 2, weight: 4 },
      ]);
      mockedPrisma.progress.count.mockResolvedValue(1);
      mockedPrisma.progress.findMany.mockResolvedValue([
        {
          lessonId: 'lesson-1',
          isCompleted: true,
          completedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

      const result = await progressService.getCourseProgress('course-6', 'student-6');

      expect(result.lessons).toHaveLength(2);
      expect(result.lessons[0]).toMatchObject({
        lessonId: 'lesson-1',
        title: 'Basics',
        weight: 2,
        isCompleted: true,
      });
      expect(result.lessons[1]).toMatchObject({
        lessonId: 'lesson-2',
        title: 'Advanced',
        weight: 4,
        isCompleted: false,
      });
    });

    it('preserves both unweighted and weighted metrics simultaneously', async () => {
      mockedPrisma.course.findFirst.mockResolvedValue({ id: 'course-7' });
      mockedPrisma.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment-7',
        status: ENROLLMENT_STATUS.ACTIVE,
      });
      mockedPrisma.lesson.count.mockResolvedValue(5);
      mockedPrisma.lesson.findMany.mockResolvedValue([
        { id: 'l1', title: 'L1', orderIndex: 1, weight: 1 },
        { id: 'l2', title: 'L2', orderIndex: 2, weight: 1 },
        { id: 'l3', title: 'L3', orderIndex: 3, weight: 5 },
        { id: 'l4', title: 'L4', orderIndex: 4, weight: 1 },
        { id: 'l5', title: 'L5', orderIndex: 5, weight: 1 },
      ]);
      mockedPrisma.progress.count.mockResolvedValue(2);
      mockedPrisma.progress.findMany.mockResolvedValue([
        { lessonId: 'l1', isCompleted: true, completedAt: new Date('2026-01-01T00:00:00.000Z') },
        { lessonId: 'l3', isCompleted: true, completedAt: new Date('2026-01-03T00:00:00.000Z') },
      ]);

      const result = await progressService.getCourseProgress('course-7', 'student-7');

      // Unweighted: 2/5 = 40%
      expect(result.percentage).toBe(40);
      // Weighted: 1 + 5 = 6 out of 1+1+5+1+1 = 9, so 6/9 = 67%
      expect(result.totalWeight).toBe(9);
      expect(result.completedWeight).toBe(6);
      expect(result.weightedPercentage).toBe(67);
    });

    it('returns correct lesson array with weights included', async () => {
      mockedPrisma.course.findFirst.mockResolvedValue({ id: 'course-6' });
      mockedPrisma.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment-6',
        status: ENROLLMENT_STATUS.ACTIVE,
      });
      mockedPrisma.lesson.count.mockResolvedValue(2);
      mockedPrisma.lesson.findMany.mockResolvedValue([
        { id: 'lesson-1', title: 'Basics', orderIndex: 1, weight: 2 },
        { id: 'lesson-2', title: 'Advanced', orderIndex: 2, weight: 4 },
      ]);
      mockedPrisma.progress.count.mockResolvedValue(1);
      mockedPrisma.progress.findMany.mockResolvedValue([
        {
          lessonId: 'lesson-1',
          isCompleted: true,
          completedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);

      const result = await progressService.getCourseProgress('course-6', 'student-6');

      expect(result.lessons).toHaveLength(2);
      expect(result.lessons[0]).toMatchObject({
        lessonId: 'lesson-1',
        title: 'Basics',
        weight: 2,
        isCompleted: true,
      });
      expect(result.lessons[1]).toMatchObject({
        lessonId: 'lesson-2',
        title: 'Advanced',
        weight: 4,
        isCompleted: false,
      });
    });
  });

  describe('getProgressOverview', () => {
    it('returns full overview with summary and all courses', async () => {
      // Mock enrollments
      mockedPrisma.enrollment.findMany.mockResolvedValue([
        {
          courseId: 'course-1',
          status: ENROLLMENT_STATUS.ACTIVE,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-15'),
          course: {
            id: 'course-1',
            title: 'Course 1',
            thumbnailUrl: 'http://example.com/thumb1.jpg',
            instructor: { name: 'Instructor A' },
          },
          student: { id: 'student-1' },
        },
        {
          courseId: 'course-2',
          status: ENROLLMENT_STATUS.COMPLETED,
          createdAt: new Date('2025-12-01'),
          updatedAt: new Date('2026-01-10'),
          course: {
            id: 'course-2',
            title: 'Course 2',
            thumbnailUrl: 'http://example.com/thumb2.jpg',
            instructor: { name: 'Instructor B' },
          },
          student: { id: 'student-1' },
        },
      ]);

      // Mock getCourseProgress calls
      const originalGetCourseProgress = progressService.getCourseProgress;
      progressService.getCourseProgress = vi
        .fn()
        .mockResolvedValueOnce({
          courseId: 'course-1',
          completedLessons: 2,
          totalLessons: 4,
          percentage: 50,
          weightedPercentage: 50,
          totalWeight: 10,
          completedWeight: 5,
          enrollmentStatus: ENROLLMENT_STATUS.ACTIVE,
        })
        .mockResolvedValueOnce({
          courseId: 'course-2',
          completedLessons: 3,
          totalLessons: 3,
          percentage: 100,
          weightedPercentage: 100,
          totalWeight: 5,
          completedWeight: 5,
          enrollmentStatus: ENROLLMENT_STATUS.COMPLETED,
        });

      mockedPrisma.progress.findFirst.mockResolvedValue({
        updatedAt: new Date('2026-01-15'),
      });

      const result = await progressService.getProgressOverview('student-1');

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('courses');
      expect(result.summary).toMatchObject({
        totalCourses: 2,
        activeCourses: 1,
        completedCourses: 1,
        droppedCourses: 0,
        overallProgress: expect.any(Number),
        lastActivityAt: expect.any(Date),
      });
      expect(result.courses).toHaveLength(2);
      expect(result.courses[0]).toMatchObject({
        courseId: 'course-1',
        courseTitle: 'Course 1',
        courseThumbnail: 'http://example.com/thumb1.jpg',
        instructorName: 'Instructor A',
        enrollmentStatus: ENROLLMENT_STATUS.ACTIVE,
      });

      progressService.getCourseProgress = originalGetCourseProgress;
    });

    it('calculates overall progress correctly for multiple courses', async () => {
      mockedPrisma.enrollment.findMany.mockResolvedValue([
        {
          courseId: 'course-1',
          status: ENROLLMENT_STATUS.ACTIVE,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-15'),
          course: {
            id: 'course-1',
            title: 'Course 1',
            thumbnailUrl: null,
            instructor: { name: 'Instructor A' },
          },
          student: { id: 'student-1' },
        },
      ]);

      const originalGetCourseProgress = progressService.getCourseProgress;
      progressService.getCourseProgress = vi.fn().mockResolvedValueOnce({
        courseId: 'course-1',
        completedLessons: 3,
        totalLessons: 5,
        percentage: 60,
        weightedPercentage: 75,
        totalWeight: 8,
        completedWeight: 6,
        enrollmentStatus: ENROLLMENT_STATUS.ACTIVE,
      });

      mockedPrisma.progress.findFirst.mockResolvedValue({
        updatedAt: new Date('2026-01-15'),
      });

      const result = await progressService.getProgressOverview('student-1');

      expect(result.summary.overallProgress).toBe(75);

      progressService.getCourseProgress = originalGetCourseProgress;
    });
  });

  describe('getProgressOverviewSummary', () => {
    it('returns summary stats only', async () => {
      mockedPrisma.enrollment.groupBy.mockResolvedValue([
        { status: ENROLLMENT_STATUS.ACTIVE, _count: 2 },
        { status: ENROLLMENT_STATUS.COMPLETED, _count: 1 },
      ]);

      mockedPrisma.enrollment.findMany.mockResolvedValue([
        { courseId: 'course-1' },
        { courseId: 'course-2' },
        { courseId: 'course-3' },
      ]);

      // Mock lesson and progress queries
      mockedPrisma.lesson.findMany
        .mockResolvedValueOnce([{ id: 'l1', weight: 1 }])
        .mockResolvedValueOnce([{ id: 'l2', weight: 1 }])
        .mockResolvedValueOnce([{ id: 'l3', weight: 1 }]);

      mockedPrisma.progress.findMany
        .mockResolvedValueOnce([{ lessonId: 'l1', isCompleted: true }])
        .mockResolvedValueOnce([{ lessonId: 'l2', isCompleted: false }])
        .mockResolvedValueOnce([{ lessonId: 'l3', isCompleted: true }]);

      mockedPrisma.progress.findFirst.mockResolvedValue({
        updatedAt: new Date('2026-01-15'),
      });

      const result = await progressService.getProgressOverviewSummary('student-1');

      expect(result).toHaveProperty('summary');
      expect(result.summary).toMatchObject({
        totalCourses: 3,
        activeCourses: 2,
        completedCourses: 1,
        droppedCourses: 0,
        overallProgress: expect.any(Number),
        lastActivityAt: expect.any(Date),
      });
    });

    it('handles no enrollments gracefully', async () => {
      mockedPrisma.enrollment.groupBy.mockResolvedValue([]);
      mockedPrisma.enrollment.findMany.mockResolvedValue([]);
      mockedPrisma.progress.findFirst.mockResolvedValue(null);

      const result = await progressService.getProgressOverviewSummary('student-1');

      expect(result.summary).toMatchObject({
        totalCourses: 0,
        activeCourses: 0,
        completedCourses: 0,
        droppedCourses: 0,
        overallProgress: 0,
        lastActivityAt: null,
      });
    });
  });

  describe('getActivityTimeline', () => {
    it('returns activities sorted by timestamp descending', async () => {
      mockedPrisma.progress.findMany.mockResolvedValue([
        {
          id: 'p1',
          lessonId: 'l1',
          completedAt: new Date('2026-01-15'),
          lesson: {
            title: 'Lesson 1',
            module: {
              courseId: 'course-1',
              course: { title: 'Course 1' },
            },
          },
        },
      ]);

      mockedPrisma.enrollment.findMany.mockResolvedValue([
        {
          id: 'e1',
          createdAt: new Date('2026-01-01'),
          status: ENROLLMENT_STATUS.ACTIVE,
          course: { title: 'Course 1' },
        },
      ]);

      const result = await progressService.getActivityTimeline('student-1', 10, 0);

      expect(result).toHaveProperty('activities');
      expect(result).toHaveProperty('hasMore');
      expect(result.activities).toBeInstanceOf(Array);
      expect(result.activities[0]).toMatchObject({
        type: 'LESSON_COMPLETED',
        courseTitle: 'Course 1',
        description: expect.stringContaining('Completed lesson'),
      });
    });

    it('respects limit and offset parameters', async () => {
      mockedPrisma.progress.findMany.mockResolvedValue([]);
      mockedPrisma.enrollment.findMany.mockResolvedValue(
        Array.from({ length: 25 }, (_, i) => ({
          id: `e${i}`,
          createdAt: new Date('2026-01-01'),
          status: ENROLLMENT_STATUS.ACTIVE,
          course: { title: `Course ${i}` },
        })),
      );

      const result = await progressService.getActivityTimeline('student-1', 10, 0);

      expect(result.activities.length).toBeLessThanOrEqual(10);
      expect(result.hasMore).toBe(true);
    });

    it('returns hasMore flag correctly', async () => {
      mockedPrisma.progress.findMany.mockResolvedValue([]);
      mockedPrisma.enrollment.findMany.mockResolvedValue([
        {
          id: 'e1',
          createdAt: new Date('2026-01-01'),
          status: ENROLLMENT_STATUS.ACTIVE,
          course: { title: 'Course 1' },
        },
      ]);

      const result = await progressService.getActivityTimeline('student-1', 10, 0);

      expect(result.hasMore).toBe(false);
    });
  });

  describe('Progress history tracking', () => {
    it('returns my progress history with pagination', async () => {
      mockedPrisma.progressHistory.count.mockResolvedValue(1);
      mockedPrisma.progressHistory.findMany.mockResolvedValue([
        {
          id: 'history-1',
          studentId: 'student-1',
          courseId: 'course-1',
          lessonId: 'lesson-1',
          fromState: 'IN_PROGRESS',
          toState: 'COMPLETED',
          actionType: 'MARK_COMPLETE',
          changedById: 'student-1',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          lesson: { id: 'lesson-1', title: 'Intro' },
          course: { id: 'course-1', title: 'Course 1' },
          student: { id: 'student-1', name: 'Student One', email: 'student@example.com' },
        },
      ]);

      const result = await progressService.getMyProgressHistory('student-1', {
        page: 1,
        pageSize: 10,
      });

      expect(result.pagination.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        id: 'history-1',
        courseTitle: 'Course 1',
        lessonTitle: 'Intro',
        actionType: 'MARK_COMPLETE',
      });
    });

    it('returns course history for an authorized instructor', async () => {
      mockedPrisma.course.findFirst.mockResolvedValue({
        id: 'course-1',
        title: 'Course 1',
        instructorId: 'instructor-1',
      });
      mockedPrisma.progressHistory.count.mockResolvedValue(0);
      mockedPrisma.progressHistory.findMany.mockResolvedValue([]);

      const result = await progressService.getCourseProgressHistory(
        'course-1',
        { sub: 'instructor-1', email: 'instructor@example.com', role: 'INSTRUCTOR' },
        { page: 1, pageSize: 10 },
      );

      expect(result.items).toEqual([]);
      expect(mockedPrisma.progressHistory.findMany).toHaveBeenCalled();
    });
  });

  describe('Instructor progress monitoring', () => {
    it('returns course-level summary and paginated student progress for an instructor-owned course', async () => {
      mockedPrisma.course.findFirst.mockResolvedValue({
        id: 'course-1',
        title: 'Course 1',
        instructorId: 'instructor-1',
      });
      mockedPrisma.lesson.findMany.mockResolvedValue([
        { id: 'lesson-1', title: 'Intro', orderIndex: 1, weight: 1 },
        { id: 'lesson-2', title: 'Practice', orderIndex: 2, weight: 2 },
      ]);
      mockedPrisma.enrollment.findMany.mockResolvedValue([
        {
          studentId: 'student-1',
          status: ENROLLMENT_STATUS.ACTIVE,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          student: { id: 'student-1', name: 'Student One', email: 'one@example.com' },
        },
        {
          studentId: 'student-2',
          status: ENROLLMENT_STATUS.COMPLETED,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
          student: { id: 'student-2', name: 'Student Two', email: 'two@example.com' },
        },
      ]);
      mockedPrisma.progress.findMany.mockResolvedValue([
        {
          studentId: 'student-1',
          lessonId: 'lesson-1',
          isCompleted: true,
          completedAt: new Date('2026-01-03T00:00:00.000Z'),
          updatedAt: new Date('2026-01-03T00:00:00.000Z'),
        },
        {
          studentId: 'student-2',
          lessonId: 'lesson-1',
          isCompleted: true,
          completedAt: new Date('2026-01-04T00:00:00.000Z'),
          updatedAt: new Date('2026-01-04T00:00:00.000Z'),
        },
        {
          studentId: 'student-2',
          lessonId: 'lesson-2',
          isCompleted: true,
          completedAt: new Date('2026-01-05T00:00:00.000Z'),
          updatedAt: new Date('2026-01-05T00:00:00.000Z'),
        },
      ]);

      const result = await progressService.getInstructorCourseProgress(
        'course-1',
        { sub: 'instructor-1', email: 'instructor@example.com', role: 'INSTRUCTOR' },
        { page: 1, pageSize: 10, sortBy: 'progress', sortOrder: 'desc' },
      );

      expect(result.course).toMatchObject({
        id: 'course-1',
        title: 'Course 1',
        totalLessons: 2,
        totalStudents: 2,
        activeStudents: 1,
        completedStudents: 1,
        droppedStudents: 0,
      });
      expect(result.students).toHaveLength(2);
      expect(result.students[0]).toMatchObject({
        studentId: 'student-2',
        percentage: 100,
        weightedPercentage: 100,
      });
      expect(result.students[1]).toMatchObject({
        studentId: 'student-1',
        percentage: 50,
        weightedPercentage: 50,
      });
    });

    it('rejects instructors who do not own the course', async () => {
      mockedPrisma.course.findFirst.mockResolvedValue({
        id: 'course-1',
        title: 'Course 1',
        instructorId: 'instructor-2',
      });

      await expect(
        progressService.getInstructorCourseProgress('course-1', {
          sub: 'instructor-1',
          email: 'instructor@example.com',
          role: 'INSTRUCTOR',
        }),
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'You do not have permission to view progress for this course',
      });
    });

    it('returns detailed lesson progress for a specific student', async () => {
      mockedPrisma.course.findFirst.mockResolvedValue({
        id: 'course-1',
        title: 'Course 1',
        instructorId: 'instructor-1',
      });
      mockedPrisma.enrollment.findUnique.mockResolvedValue({
        studentId: 'student-1',
        courseId: 'course-1',
        status: ENROLLMENT_STATUS.ACTIVE,
        student: { id: 'student-1', name: 'Student One', email: 'one@example.com' },
      });
      mockedPrisma.lesson.findMany.mockResolvedValue([
        { id: 'lesson-1', title: 'Intro', orderIndex: 1, weight: 1 },
        { id: 'lesson-2', title: 'Practice', orderIndex: 2, weight: 2 },
      ]);
      mockedPrisma.progress.findMany.mockResolvedValue([
        {
          lessonId: 'lesson-1',
          isCompleted: true,
          completedAt: new Date('2026-01-03T00:00:00.000Z'),
          updatedAt: new Date('2026-01-03T00:00:00.000Z'),
        },
      ]);

      const result = await progressService.getInstructorStudentCourseProgress(
        'course-1',
        'student-1',
        { sub: 'instructor-1', email: 'instructor@example.com', role: 'INSTRUCTOR' },
      );

      expect(result.student).toMatchObject({ id: 'student-1', name: 'Student One' });
      expect(result.summary).toMatchObject({
        enrollmentStatus: ENROLLMENT_STATUS.ACTIVE,
        completedLessons: 1,
        totalLessons: 2,
        percentage: 50,
      });
      expect(result.lessons[0]).toMatchObject({ lessonId: 'lesson-1', isCompleted: true });
      expect(result.lessons[1]).toMatchObject({ lessonId: 'lesson-2', isCompleted: false });
    });
  });

  describe('Admin progress monitoring', () => {
    it('returns platform-wide admin progress overview', async () => {
      mockedPrisma.course.findMany.mockResolvedValue([
        {
          id: 'course-1',
          title: 'Course 1',
          status: 'PUBLISHED',
          instructorId: 'instructor-1',
          instructor: { id: 'instructor-1', name: 'Instructor 1' },
        },
      ]);
      mockedPrisma.lesson.findMany.mockResolvedValue([
        {
          id: 'lesson-1',
          title: 'Lesson 1',
          orderIndex: 1,
          weight: 1,
          module: { courseId: 'course-1' },
        },
      ]);
      mockedPrisma.enrollment.findMany.mockResolvedValue([
        {
          courseId: 'course-1',
          studentId: 'student-1',
          status: ENROLLMENT_STATUS.COMPLETED,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          student: { id: 'student-1', name: 'Student 1', email: 'student1@example.com' },
        },
      ]);
      mockedPrisma.progress.findMany.mockResolvedValue([
        {
          studentId: 'student-1',
          lessonId: 'lesson-1',
          isCompleted: true,
          completedAt: new Date('2026-01-03T00:00:00.000Z'),
          updatedAt: new Date('2026-01-03T00:00:00.000Z'),
          lesson: { module: { courseId: 'course-1' } },
        },
      ]);

      const result = await progressService.getAdminProgressOverview();

      expect(result.summary).toMatchObject({
        totalCourses: 1,
        totalStudents: 1,
        completedStudents: 1,
        averageProgress: 100,
        averageWeightedProgress: 100,
        averageCompletionRate: 100,
      });
    });

    it('returns paginated admin course progress list', async () => {
      mockedPrisma.course.findMany.mockResolvedValue([
        {
          id: 'course-1',
          title: 'Course 1',
          status: 'PUBLISHED',
          instructorId: 'instructor-1',
          instructor: { id: 'instructor-1', name: 'Instructor 1' },
        },
        {
          id: 'course-2',
          title: 'Course 2',
          status: 'DRAFT',
          instructorId: 'instructor-2',
          instructor: { id: 'instructor-2', name: 'Instructor 2' },
        },
      ]);
      mockedPrisma.lesson.findMany.mockResolvedValue([
        {
          id: 'lesson-1',
          title: 'Lesson 1',
          orderIndex: 1,
          weight: 1,
          module: { courseId: 'course-1' },
        },
        {
          id: 'lesson-2',
          title: 'Lesson 2',
          orderIndex: 1,
          weight: 1,
          module: { courseId: 'course-2' },
        },
      ]);
      mockedPrisma.enrollment.findMany.mockResolvedValue([
        {
          courseId: 'course-1',
          studentId: 'student-1',
          status: ENROLLMENT_STATUS.ACTIVE,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          student: { id: 'student-1', name: 'Student 1', email: 'student1@example.com' },
        },
      ]);
      mockedPrisma.progress.findMany.mockResolvedValue([
        {
          studentId: 'student-1',
          lessonId: 'lesson-1',
          isCompleted: true,
          completedAt: new Date('2026-01-03T00:00:00.000Z'),
          updatedAt: new Date('2026-01-03T00:00:00.000Z'),
          lesson: { module: { courseId: 'course-1' } },
        },
      ]);

      const result = await progressService.getAdminCourseProgressList({
        page: 1,
        pageSize: 10,
        sortBy: 'progress',
        sortOrder: 'desc',
      });

      expect(result.courses).toHaveLength(2);
      expect(result.pagination).toMatchObject({ page: 1, pageSize: 10, total: 2 });
      expect(result.courses[0]).toHaveProperty('courseTitle');
    });
  });
});

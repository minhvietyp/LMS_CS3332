import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import type { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProgressPage } from '../../../../pages/admin/progress/AdminProgressPage';
import { renderWithQueryClient } from '../../../utils/renderWithQueryClient';
import { HEAVY_UI_TEST_TIMEOUT } from '../../../utils/testTimeouts';

const overviewRefetch = vi.fn();
const coursesRefetch = vi.fn();
const studentsRefetch = vi.fn();

const mockOverviewState = {
  data: {
    summary: {
      totalCourses: 4,
      totalStudents: 24,
      activeStudents: 12,
      completedStudents: 10,
      droppedStudents: 2,
      averageProgress: 68,
      averageWeightedProgress: 72,
      averageCompletionRate: 58,
      lastActivityAt: '2026-01-15T00:00:00.000Z',
    },
  },
  isLoading: false,
  error: null,
  refetch: overviewRefetch,
};

const mockCoursesState = {
  data: {
    courses: [
      {
        courseId: 'course-1',
        courseTitle: 'React Basics',
        instructorId: 'instructor-1',
        instructorName: 'Instructor A',
        status: 'PUBLISHED',
        totalLessons: 8,
        totalStudents: 12,
        activeStudents: 6,
        completedStudents: 5,
        droppedStudents: 1,
        averageProgress: 70,
        averageWeightedProgress: 74,
        completionRate: 42,
        lastActivityAt: '2026-01-12T00:00:00.000Z',
      },
    ],
    pagination: {
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    },
  },
  isLoading: false,
  error: null,
  refetch: coursesRefetch,
};

const mockStudentsState = {
  data: undefined as any,
  isLoading: false,
  error: null,
  refetch: studentsRefetch,
};

const mockDetailState = {
  data: undefined as any,
  isLoading: false,
  error: null,
};

const useAdminProgressOverviewMock = vi.fn();
const useAdminCourseProgressListMock = vi.fn();
const useInstructorCourseProgressMock = vi.fn();
const useInstructorStudentCourseProgressMock = vi.fn();

vi.mock('../../../../hooks/useProgressOverview', () => ({
  useAdminProgressOverview: (...args: unknown[]) => useAdminProgressOverviewMock(...args),
  useAdminCourseProgressList: (...args: unknown[]) => useAdminCourseProgressListMock(...args),
  useInstructorCourseProgress: (...args: unknown[]) => useInstructorCourseProgressMock(...args),
  useInstructorStudentCourseProgress: (...args: unknown[]) => useInstructorStudentCourseProgressMock(...args),
}));

describe('AdminProgressPage', () => {
  let activeQueryClient: QueryClient | null = null;

  afterEach(() => {
    cleanup();
    activeQueryClient?.clear();
    activeQueryClient = null;
    vi.clearAllMocks();
    vi.useRealTimers();
    document
      .querySelectorAll('.ant-drawer-root, .ant-modal-root, .ant-message, .ant-notification')
      .forEach((node) => node.remove());
  });

  beforeEach(() => {
    overviewRefetch.mockClear();
    coursesRefetch.mockClear();
    studentsRefetch.mockClear();

    mockOverviewState.isLoading = false;
    mockOverviewState.error = null;

    mockCoursesState.isLoading = false;
    mockCoursesState.error = null;

    mockStudentsState.data = undefined;
    mockStudentsState.isLoading = false;
    mockStudentsState.error = null;

    mockDetailState.data = undefined;
    mockDetailState.isLoading = false;
    mockDetailState.error = null;

    useAdminProgressOverviewMock.mockImplementation(() => mockOverviewState);
    useAdminCourseProgressListMock.mockImplementation(() => mockCoursesState);
    useInstructorCourseProgressMock.mockImplementation((courseId?: string) => {
      if (courseId === 'course-1') {
        return {
          data: {
            course: {
              id: 'course-1',
              title: 'React Basics',
              totalLessons: 8,
              totalStudents: 2,
              activeStudents: 1,
              completedStudents: 1,
              droppedStudents: 0,
              averageProgress: 75,
              averageWeightedProgress: 80,
            },
            students: [
              {
                studentId: 'student-1',
                studentName: 'Student One',
                studentEmail: 'one@example.com',
                enrollmentStatus: 'ACTIVE',
                enrolledAt: '2026-01-01T00:00:00.000Z',
                completedLessons: 4,
                totalLessons: 8,
                percentage: 50,
                weightedPercentage: 63,
                totalWeight: 8,
                completedWeight: 5,
                lastProgressAt: '2026-01-10T00:00:00.000Z',
              },
            ],
            pagination: {
              page: 1,
              pageSize: 10,
              total: 1,
              totalPages: 1,
            },
          },
          isLoading: false,
          error: null,
          refetch: studentsRefetch,
        };
      }

      return mockStudentsState;
    });
    useInstructorStudentCourseProgressMock.mockImplementation((_courseId?: string, studentId?: string) => {
      if (studentId === 'student-1') {
        return {
          data: {
            course: {
              id: 'course-1',
              title: 'React Basics',
            },
            student: {
              id: 'student-1',
              name: 'Student One',
              email: 'one@example.com',
            },
            summary: {
              enrollmentStatus: 'ACTIVE',
              completedLessons: 4,
              totalLessons: 8,
              percentage: 50,
              weightedPercentage: 63,
              lastProgressAt: '2026-01-10T00:00:00.000Z',
            },
            lessons: [
              {
                lessonId: 'lesson-1',
                title: 'Introduction',
                orderIndex: 1,
                weight: 1,
                isCompleted: true,
                completedAt: '2026-01-03T00:00:00.000Z',
              },
              {
                lessonId: 'lesson-2',
                title: 'Hooks',
                orderIndex: 2,
                weight: 2,
                isCompleted: false,
                completedAt: null,
              },
            ],
          },
          isLoading: false,
          error: null,
        };
      }

      return mockDetailState;
    });
  });

  it('renders admin overview summary and course table', async () => {
    activeQueryClient = renderWithQueryClient(<AdminProgressPage />).queryClient;

    expect(await screen.findByText('Admin progress monitoring')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getAllByText('Students').length).toBeGreaterThan(0);
    expect(screen.getAllByText('React Basics').length).toBeGreaterThan(0);
    expect(screen.getByText('Instructor A')).toBeInTheDocument();

    await waitFor(() => {
      expect(useAdminCourseProgressListMock).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          pageSize: 10,
          sortBy: 'progress',
          sortOrder: 'desc',
        }),
      );
    });
  }, 15000);

  it('shows selected course students after opening course progress', async () => {
    activeQueryClient = renderWithQueryClient(<AdminProgressPage />).queryClient;

    const courseButtons = await screen.findAllByRole('button', { name: 'View students' });
    fireEvent.click(courseButtons[0]);

    expect(await screen.findByText('Student One')).toBeInTheDocument();
    expect(screen.getByText('one@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Instructor A').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(useInstructorCourseProgressMock).toHaveBeenLastCalledWith(
        'course-1',
        expect.objectContaining({
          page: 1,
          pageSize: 10,
          sortBy: 'progress',
          sortOrder: 'desc',
        }),
      );
    }, { timeout: 10000 });
  }, 15000);

  it('opens student detail drawer from the admin student table', async () => {
    activeQueryClient = renderWithQueryClient(<AdminProgressPage />).queryClient;

    const courseButtons = await screen.findAllByRole('button', { name: 'View students' });
    fireEvent.click(courseButtons[0]);

    const detailButtons = await screen.findAllByRole('button', { name: 'View detail' });
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(useInstructorStudentCourseProgressMock).toHaveBeenLastCalledWith('course-1', 'student-1');
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Hooks')).toBeInTheDocument();
      expect(screen.getByText(/Weighted progress: 63%/i)).toBeInTheDocument();
    }, { timeout: HEAVY_UI_TEST_TIMEOUT });
  }, HEAVY_UI_TEST_TIMEOUT);
});

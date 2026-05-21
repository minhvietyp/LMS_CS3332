import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../components/context/AuthContext';
import { InstructorProgressPage } from './InstructorProgressPage';

const coursesRefetch = vi.fn();
const progressRefetch = vi.fn();

const mockCoursesState = {
  data: [
    {
      id: 'course-1',
      title: 'React Basics',
      status: 'PUBLISHED',
    },
  ],
  isLoading: false,
  error: null,
  refetch: coursesRefetch,
};

const mockProgressState = {
  data: {
    course: {
      id: 'course-1',
      title: 'React Basics',
      totalLessons: 8,
      totalStudents: 2,
      activeStudents: 1,
      completedStudents: 1,
      droppedStudents: 0,
      averageProgress: 70,
      averageWeightedProgress: 75,
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
        lastProgressAt: '2026-01-05T00:00:00.000Z',
      },
      {
        studentId: 'student-2',
        studentName: 'Student Two',
        studentEmail: 'two@example.com',
        enrollmentStatus: 'COMPLETED',
        enrolledAt: '2026-01-02T00:00:00.000Z',
        completedLessons: 8,
        totalLessons: 8,
        percentage: 100,
        weightedPercentage: 88,
        totalWeight: 8,
        completedWeight: 7,
        lastProgressAt: '2026-01-10T00:00:00.000Z',
      },
    ],
    pagination: {
      page: 1,
      pageSize: 10,
      total: 2,
      totalPages: 1,
    },
  },
  isLoading: false,
  error: null,
  refetch: progressRefetch,
};

const mockDetailState = {
  isLoading: false,
  error: null,
  data: undefined,
};

const useInstructorCourseProgressMock = vi.fn();
const useInstructorStudentCourseProgressMock = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => mockCoursesState,
}));

vi.mock('../hooks/useProgressOverview', () => ({
  useInstructorCourseProgress: (...args: unknown[]) => useInstructorCourseProgressMock(...args),
  useInstructorStudentCourseProgress: (...args: unknown[]) => useInstructorStudentCourseProgressMock(...args),
}));

describe('InstructorProgressPage', () => {
  const buildToken = () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
    return `header.${payload}.signature`;
  };

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/instructor/progress']}>
        <AuthProvider>
          <InstructorProgressPage />
        </AuthProvider>
      </MemoryRouter>,
    );

  beforeEach(() => {
    localStorage.setItem(
      'lms.auth',
      JSON.stringify({
        user: {
          id: 'instructor-1',
          name: 'Instructor User',
          email: 'instructor@example.com',
          role: 'INSTRUCTOR',
          avatarUrl: null,
        },
        token: buildToken(),
        refreshToken: 'refresh-token',
      }),
    );

    coursesRefetch.mockClear();
    progressRefetch.mockClear();

    mockCoursesState.data = [
      {
        id: 'course-1',
        title: 'React Basics',
        status: 'PUBLISHED',
      },
    ];
    mockCoursesState.isLoading = false;
    mockCoursesState.error = null;

    mockProgressState.isLoading = false;
    mockProgressState.error = null;

    mockDetailState.isLoading = false;
    mockDetailState.error = null;
    mockDetailState.data = undefined;

    useInstructorCourseProgressMock.mockImplementation(() => mockProgressState);
    useInstructorStudentCourseProgressMock.mockImplementation((_courseId?: string, studentId?: string) => {
      if (studentId === 'student-1') {
        return {
          isLoading: false,
          error: null,
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
              lastProgressAt: '2026-01-05T00:00:00.000Z',
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
        };
      }

      return mockDetailState;
    });
  });

  it('renders instructor course progress summary and student table', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Instructor progress monitoring').length).toBeGreaterThan(0);
    }, { timeout: 10000 });
    await waitFor(() => {
      expect(screen.getAllByText('React Basics').length).toBeGreaterThan(0);
      expect(screen.getByText('Students')).toBeInTheDocument();
      expect(screen.getByText('Average Progress')).toBeInTheDocument();
      expect(screen.getByText('Student One')).toBeInTheDocument();
      expect(screen.getByText('one@example.com')).toBeInTheDocument();
    }, { timeout: 10000 });

    await waitFor(() => {
      expect(useInstructorCourseProgressMock).toHaveBeenCalledWith(
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

  it('renders empty state when the instructor has no courses', () => {
    mockCoursesState.data = [];

    renderPage();

    expect(screen.getByText('No instructor-owned courses available for progress monitoring.')).toBeInTheDocument();
  });

  it.skip('renders student detail actions for each progress row', async () => {
    renderPage();

    const detailButtons = await screen.findAllByRole('button', { name: 'View detail' }, { timeout: 10000 });
    expect(detailButtons.length).toBeGreaterThanOrEqual(2);
  }, 12000);
});

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../context/AuthContext';
import { StudentCalendarPage } from '../../../../pages/client/progress/StudentCalendarPage';

const CALENDAR_UI_TEST_TIMEOUT = 20000;

const getOverview = vi.fn();
const getMyProgressHistory = vi.fn();
const getMyCourseProgress = vi.fn();
const listStudentCourseAssignmentsRequest = vi.fn();
const listStudentCourseQuizzesRequest = vi.fn();
const listMyQuizAttemptsRequest = vi.fn();

vi.mock('../../../../services/api/progressService', () => ({
  progressService: {
    getOverview: (...args: unknown[]) => getOverview(...args),
    getMyProgressHistory: (...args: unknown[]) => getMyProgressHistory(...args),
    getMyCourseProgress: (...args: unknown[]) => getMyCourseProgress(...args),
  },
}));

vi.mock('../../../../services/api/assignmentApi', () => ({
  listStudentCourseAssignmentsRequest: (...args: unknown[]) => listStudentCourseAssignmentsRequest(...args),
}));

vi.mock('../../../../services/api/quizApi', () => ({
  listMyQuizAttemptsRequest: (...args: unknown[]) => listMyQuizAttemptsRequest(...args),
  listStudentCourseQuizzesRequest: (...args: unknown[]) => listStudentCourseQuizzesRequest(...args),
}));

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function renderPage() {
  localStorage.clear();
  localStorage.setItem(
    'lms.auth',
    JSON.stringify({
      user: { id: 'student-1', name: 'Student', email: 'student@example.com', role: 'STUDENT' },
      token: buildToken(),
      refreshToken: 'refresh-token',
    }),
  );

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <MemoryRouter initialEntries={['/calendar']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StudentCalendarPage />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('StudentCalendarPage', () => {
  beforeEach(() => {
    getOverview.mockReset();
    getMyProgressHistory.mockReset();
    getMyCourseProgress.mockReset();
    listStudentCourseAssignmentsRequest.mockReset();
    listStudentCourseQuizzesRequest.mockReset();
    listMyQuizAttemptsRequest.mockReset();

    getOverview.mockResolvedValue({
      summary: {
        totalCourses: 1,
        activeCourses: 1,
        completedCourses: 0,
        droppedCourses: 0,
        overallProgress: 50,
        lastActivityAt: null,
      },
      courses: [
        {
          courseId: 'course-1',
          courseTitle: 'React Foundations',
          courseThumbnail: null,
          instructorName: 'Alex Tran',
          enrollmentStatus: 'ACTIVE',
          enrolledAt: '2026-01-01T00:00:00.000Z',
          lessonsCompleted: 3,
          totalLessons: 6,
          percentage: 50,
          weightedPercentage: 50,
          totalWeight: 6,
          completedWeight: 3,
        },
      ],
    });

    getMyProgressHistory.mockResolvedValue({
      items: [
        {
          id: 'history-1',
          studentId: 'student-1',
          courseId: 'course-1',
          courseTitle: 'React Foundations',
          lessonId: 'lesson-1',
          lessonTitle: 'Intro to React',
          fromState: 'NOT_STARTED',
          toState: 'COMPLETED',
          actionType: 'MARK_COMPLETE',
          createdAt: '2026-01-12T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });

    getMyCourseProgress.mockResolvedValue({
      courseId: 'course-1',
      courseTitle: 'React Foundations',
      weightedPercentage: 50,
      lastProgressAt: '2026-01-14T10:00:00.000Z',
      lessons: [
        {
          lessonId: 'lesson-2',
          title: 'Hooks Overview',
          isCompleted: false,
        },
      ],
    });

    listStudentCourseAssignmentsRequest.mockResolvedValue([
      {
        id: 'assignment-1',
        courseId: 'course-1',
        title: 'Build a landing page',
        dueDate: '2026-01-15T00:00:00.000Z',
        allowLateSubmission: true,
        submissions: [],
      },
    ]);

    listStudentCourseQuizzesRequest.mockResolvedValue([
      {
        id: 'quiz-1',
        courseId: 'course-1',
        title: 'React Quiz',
        description: 'Basics',
        passingScore: 70,
        maxAttempts: 3,
        isPublished: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-14T00:00:00.000Z',
        questionCount: 5,
        attemptsUsed: 1,
        attemptsRemaining: 2,
      },
    ]);

    listMyQuizAttemptsRequest.mockResolvedValue([]);
  });

  it('renders the deadline planner with real assignment and quiz data', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Calendar' }, { timeout: CALENDAR_UI_TEST_TIMEOUT })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Today' }, { timeout: CALENDAR_UI_TEST_TIMEOUT })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'This Week' }, { timeout: CALENDAR_UI_TEST_TIMEOUT })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Upcoming' }, { timeout: CALENDAR_UI_TEST_TIMEOUT })).toBeInTheDocument();
    expect((await screen.findAllByText('Build a landing page')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('React Quiz')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('No Due Date')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Open assignment')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Open quiz')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('React Foundations')).length).toBeGreaterThan(0);
  }, CALENDAR_UI_TEST_TIMEOUT);
});

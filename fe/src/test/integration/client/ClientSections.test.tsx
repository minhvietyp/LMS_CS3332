import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../context/AuthContext';
import { DashboardPage } from '../../../pages/shared/dashboard/DashboardPage';
import { StudentProgressPage } from '../../../pages/client/progress/StudentProgressPage';
import { InstructorCoursesPage } from '../../../pages/client/instructor/courses/InstructorCoursesPage';
import { InstructorLessonsPage } from '../../../pages/client/instructor/lessons/InstructorLessonsPage';
import { ClientCoursesPage } from '../../../pages/client/courses/ClientCoursesPage';
import { ClientNotificationsPage } from '../../../pages/client/notifications/ClientNotificationsPage';

vi.mock('../../../services/api/authApi', async () => {
  const actual = await vi.importActual<typeof import('../../../services/api/authApi')>('../../../services/api/authApi');

  return {
    ...actual,
    logoutRequest: vi.fn(),
  };
});

const listCoursesRequestMock = vi.fn();
const listNotificationsRequestMock = vi.fn();
const markNotificationAsReadRequestMock = vi.fn();
const markAllNotificationsAsReadRequestMock = vi.fn();
const useProgressOverviewMock = vi.fn();
const useInstructorCourseProgressMock = vi.fn();
const useActivityTimelineMock = vi.fn();
const useClientContinueLearningMock = vi.fn();
const getCourseByIdRequestMock = vi.fn();
const publishCourseRequestMock = vi.fn();
const archiveCourseRequestMock = vi.fn();
const deleteCourseRequestMock = vi.fn();
const restoreCourseRequestMock = vi.fn();
const listCourseModulesRequestMock = vi.fn();

vi.mock('../../../services/api/courseApi', () => ({
  listCoursesRequest: (...args: unknown[]) => listCoursesRequestMock(...args),
  getCourseByIdRequest: (...args: unknown[]) => getCourseByIdRequestMock(...args),
  publishCourseRequest: (...args: unknown[]) => publishCourseRequestMock(...args),
  archiveCourseRequest: (...args: unknown[]) => archiveCourseRequestMock(...args),
  deleteCourseRequest: (...args: unknown[]) => deleteCourseRequestMock(...args),
  restoreCourseRequest: (...args: unknown[]) => restoreCourseRequestMock(...args),
}));

vi.mock('../../../services/api/lessonApi', () => ({
  listCourseModulesRequest: (...args: unknown[]) => listCourseModulesRequestMock(...args),
  listLessonMaterialsRequest: vi.fn().mockResolvedValue([]),
  createModuleRequest: vi.fn(),
  updateModuleRequest: vi.fn(),
  deleteModuleRequest: vi.fn(),
  createLessonRequest: vi.fn(),
  updateLessonRequest: vi.fn(),
  deleteLessonRequest: vi.fn(),
  createLessonMaterialRequest: vi.fn(),
  uploadLessonMaterialRequest: vi.fn(),
  deleteLessonMaterialRequest: vi.fn(),
}));

vi.mock('../../../services/api/assignmentApi', () => ({
  listCourseAssignmentsRequest: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../services/api/quizApi', () => ({
  listCourseQuizzesRequest: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../services/api/progressService', () => ({
  progressService: {
    getOverview: vi.fn().mockResolvedValue({
      summary: {
        totalCourses: 0,
        activeCourses: 0,
        completedCourses: 0,
        droppedCourses: 0,
        overallProgress: 0,
        lastActivityAt: null,
      },
      courses: [],
    }),
    getOverviewSummary: vi.fn().mockResolvedValue({
      totalCourses: 0,
      activeCourses: 0,
      completedCourses: 0,
      droppedCourses: 0,
      overallProgress: 0,
      lastActivityAt: null,
    }),
  },
}));

vi.mock('../../../services/api/notificationApi', () => ({
  listNotificationsRequest: (...args: unknown[]) => listNotificationsRequestMock(...args),
  markNotificationAsReadRequest: (...args: unknown[]) => markNotificationAsReadRequestMock(...args),
  markAllNotificationsAsReadRequest: (...args: unknown[]) => markAllNotificationsAsReadRequestMock(...args),
}));

vi.mock('../../../hooks/useProgressOverview', () => ({
  useProgressOverview: (...args: unknown[]) => useProgressOverviewMock(...args),
  useInstructorCourseProgress: (...args: unknown[]) => useInstructorCourseProgressMock(...args),
  useActivityTimeline: (...args: unknown[]) => useActivityTimelineMock(...args),
}));

vi.mock('../../../hooks/useClientContinueLearning', () => ({
  useClientContinueLearning: (...args: unknown[]) => useClientContinueLearningMock(...args),
}));

vi.mock('../../../pages/admin/courses/components', () => ({
  CourseManagement: () => <div>Mock instructor courses management</div>,
}));

vi.mock('../../../pages/admin/lessons/components', () => ({
  LessonManagement: () => <div>Mock instructor lessons management</div>,
}));

vi.mock('../../../components/client-layout', async () => {
  const actual = await vi.importActual<typeof import('../../../components/client-layout')>('../../../components/client-layout');

  return {
    ...actual,
    ClientDashboardHero: () => <div>Mock client dashboard hero</div>,
  };
});

vi.mock('../../../pages/shared/dashboard/components/StudentDashboard', () => ({
  StudentDashboard: () => <div>Mock student dashboard</div>,
}));

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function renderWithRole(
  role: 'STUDENT' | 'INSTRUCTOR',
  element: React.ReactElement,
  initialEntry = role === 'STUDENT' ? '/student/dashboard' : '/instructor/dashboard',
) {
  localStorage.setItem(
    'lms.auth',
    JSON.stringify({
      user: {
        id: `${role.toLowerCase()}-1`,
        name: `${role} User`,
        email: `${role.toLowerCase()}@example.com`,
        role,
        avatarUrl: null,
      },
      token: buildToken(),
      refreshToken: 'refresh-token',
    }),
  );

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{element}</AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('Client student and instructor sections', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    listCoursesRequestMock.mockReset();
    listNotificationsRequestMock.mockReset();
    markNotificationAsReadRequestMock.mockReset();
    markAllNotificationsAsReadRequestMock.mockReset();
    useProgressOverviewMock.mockReset();
    useInstructorCourseProgressMock.mockReset();
    useActivityTimelineMock.mockReset();
    useClientContinueLearningMock.mockReset();
    getCourseByIdRequestMock.mockReset();
    publishCourseRequestMock.mockReset();
    archiveCourseRequestMock.mockReset();
    deleteCourseRequestMock.mockReset();
    restoreCourseRequestMock.mockReset();
    listCourseModulesRequestMock.mockReset();

    listNotificationsRequestMock.mockResolvedValue([
      {
        id: 'notification-1',
        userId: 'student-1',
        type: 'COURSE',
        message: 'Course schedule updated for React Foundations.',
        referenceId: 'course-1',
        courseId: '11111111-1111-1111-1111-111111111111',
        isRead: false,
        readAt: null,
        createdAt: '2026-01-10T00:00:00.000Z',
      },
      {
        id: 'notification-2',
        userId: 'student-1',
        type: 'ASSIGNMENT',
        message: 'Assignment feedback is available.',
        referenceId: 'assignment-1',
        courseId: '11111111-1111-1111-1111-111111111111',
        isRead: true,
        readAt: '2026-01-11T00:00:00.000Z',
        createdAt: '2026-01-11T00:00:00.000Z',
      },
    ]);

    listCoursesRequestMock.mockResolvedValue({
      data: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          title: 'React Foundations',
          description: 'Build a reliable frontend learning path.',
          status: 'PUBLISHED',
          instructorId: 'instructor-1',
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-02T00:00:00.000Z',
        },
      ],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
    getCourseByIdRequestMock.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'React Foundations',
      description: 'Build a reliable frontend learning path.',
      status: 'PUBLISHED',
      instructorId: 'instructor-1',
      modules: [],
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    });
    listCourseModulesRequestMock.mockResolvedValue([]);

    useProgressOverviewMock.mockReturnValue({
      data: {
        summary: {
          totalCourses: 0,
          activeCourses: 0,
          completedCourses: 0,
          droppedCourses: 0,
          overallProgress: 0,
          lastActivityAt: null,
        },
        courses: [],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    useActivityTimelineMock.mockReturnValue({
      data: { activities: [] },
      isLoading: false,
      error: null,
    });
    useInstructorCourseProgressMock.mockReturnValue({
      data: {
        course: {
          id: '11111111-1111-1111-1111-111111111111',
          title: 'React Foundations',
          totalLessons: 0,
          totalStudents: 0,
          activeStudents: 0,
          completedStudents: 0,
          droppedStudents: 0,
          averageProgress: 0,
          averageWeightedProgress: 0,
        },
        students: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useClientContinueLearningMock.mockReturnValue({
      streak: 0,
      courseId: null,
      courseTitle: null,
      currentLesson: null,
      nextLesson: null,
      percentage: 0,
      totalLessons: 0,
      completedLessons: 0,
      lastActivityAt: null,
      isLoading: false,
    });
  });

  it('renders the student dashboard inside the shared client layout', () => {
    renderWithRole('STUDENT', <DashboardPage />);

    const menu = screen.getByRole('menu', { name: 'Client navigation' });

    expect(screen.getAllByText('LMS Client').length).toBeGreaterThan(0);
    expect(screen.getByText('Mock student dashboard')).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Dashboard/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Progress/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Courses/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Community/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Notifications/i })).toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: /Student Progress/i })).not.toBeInTheDocument();
  }, 10000);

  it('renders the student progress page inside the shared client layout', () => {
    renderWithRole('STUDENT', <StudentProgressPage />, '/student/progress');

    expect(screen.getAllByText('LMS Client').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Progress' })).toBeInTheDocument();
    expect(screen.getByText('Overall progress')).toBeInTheDocument();
    expect(screen.getByText('Active courses')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View courses' })).toBeInTheDocument();
  });

  it('renders the instructor dashboard with instructor-only client navigation', () => {
    renderWithRole('INSTRUCTOR', <DashboardPage />);

    const menu = screen.getByRole('menu', { name: 'Client navigation' });

    expect(screen.getAllByText('LMS Client').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Instructor Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Instructor workspace')).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Student Progress/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /My Courses/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Lessons/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Notifications/i })).toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: /My Progress/i })).not.toBeInTheDocument();
  }, 10000);

  it('renders the student course catalog with filters, progress, and wishlist actions', async () => {
    listCoursesRequestMock.mockResolvedValue({
      data: [
        {
          id: 'course-1',
          title: 'React Foundations',
          description: 'Build a reliable frontend learning path.',
          status: 'PUBLISHED',
          instructorId: 'instructor-1',
          instructor: { id: 'instructor-1', name: 'Alex Tran' },
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-02T00:00:00.000Z',
        },
      ],
    });

    renderWithRole('STUDENT', <ClientCoursesPage />, '/courses');

    await waitFor(() => expect(listCoursesRequestMock).toHaveBeenCalled());

    expect(screen.getByRole('heading', { name: 'Courses' })).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('Search courses, instructors, or topics')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('React Foundations')).toBeInTheDocument();
    });

    expect(screen.getAllByRole('button', { name: 'View course' }).length).toBeGreaterThan(0);
  }, 60000);

  it('renders the shared notifications page with summary cards and notification items', async () => {
    renderWithRole('STUDENT', <ClientNotificationsPage />, '/notifications');

    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(await screen.findByText('Course updates')).toBeInTheDocument();
    expect(await screen.findByText('Notification Feed')).toBeInTheDocument();
    expect((await screen.findAllByText('Course schedule updated for React Foundations.')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Assignment feedback is available.')).toBeInTheDocument();
    expect(screen.getAllByText(/Unread|Read/).length).toBeGreaterThan(0);
  });

  it('renders instructor course management inside the client layout instead of the admin shell', () => {
    renderWithRole('INSTRUCTOR', <InstructorCoursesPage />, '/instructor/courses');

    expect(screen.getAllByText('LMS Client').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'My Courses' })).toBeInTheDocument();
    expect(screen.getByText('Teaching catalog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by course title')).toBeInTheDocument();
    expect(screen.queryByText('LMS Admin')).not.toBeInTheDocument();
  });

  it('renders instructor lesson management inside the client layout instead of the admin shell', async () => {
    renderWithRole('INSTRUCTOR', <InstructorLessonsPage />, '/instructor/lessons');

    expect(screen.getAllByText('LMS Client').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Lessons & Modules' })).toBeInTheDocument();
    expect(await screen.findByText('Selected course')).toBeInTheDocument();
    expect((await screen.findAllByText('React Foundations')).length).toBeGreaterThan(0);
    expect(screen.queryByText('LMS Admin')).not.toBeInTheDocument();
  });
});

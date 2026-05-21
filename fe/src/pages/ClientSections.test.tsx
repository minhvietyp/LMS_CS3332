import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../components/context/AuthContext';
import { DashboardPage } from './DashboardPage';
import { StudentProgressPage } from './StudentProgressPage';
import { InstructorCoursesPage } from './InstructorCoursesPage';
import { InstructorLessonsPage } from './InstructorLessonsPage';
import { ClientCoursesPage } from './ClientCoursesPage';
import { ClientNotificationsPage } from './ClientNotificationsPage';

vi.mock('../services/authApi', async () => {
  const actual = await vi.importActual<typeof import('../services/authApi')>('../services/authApi');

  return {
    ...actual,
    logoutRequest: vi.fn(),
  };
});

const listCoursesRequestMock = vi.fn();

vi.mock('../services/courseApi', () => ({
  listCoursesRequest: (...args: unknown[]) => listCoursesRequestMock(...args),
}));

vi.mock('../components/client/progress/ProgressOverview', () => ({
  ProgressOverview: () => <div>Mock progress overview</div>,
}));

vi.mock('../components/client/progress/ProgressHistoryList', () => ({
  ProgressHistoryList: () => <div>Mock progress history</div>,
}));

vi.mock('../components/admin/courses', () => ({
  CourseManagement: () => <div>Mock instructor courses management</div>,
}));

vi.mock('../components/admin/lessons', () => ({
  LessonManagement: () => <div>Mock instructor lessons management</div>,
}));

vi.mock('../components/client/layout', async () => {
  const actual = await vi.importActual<typeof import('../components/client/layout')>('../components/client/layout');

  return {
    ...actual,
    ClientDashboardHero: () => <div>Mock client dashboard hero</div>,
  };
});

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
  });

  it('renders the student dashboard inside the shared client layout', () => {
    renderWithRole('STUDENT', <DashboardPage />);

    const menu = screen.getByRole('menu', { name: 'Client navigation' });

    expect(screen.getAllByText('LMS Client').length).toBeGreaterThan(0);
    expect(screen.getByText('Mock client dashboard hero')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open my progress' })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Dashboard/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /My Progress/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Enrolled Courses/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Notifications/i })).toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: /Student Progress/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Learning Workflow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open notifications' })).toBeInTheDocument();
  });

  it('renders the student progress page inside the shared client layout', () => {
    renderWithRole('STUDENT', <StudentProgressPage />, '/student/progress');

    expect(screen.getAllByText('LMS Client').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'My Progress' })).toBeInTheDocument();
    expect(screen.getByText('Mock progress overview')).toBeInTheDocument();
    expect(screen.getByText('Mock progress history')).toBeInTheDocument();
  });

  it('renders the instructor dashboard with instructor-only client navigation', () => {
    renderWithRole('INSTRUCTOR', <DashboardPage />);

    const menu = screen.getByRole('menu', { name: 'Client navigation' });

    expect(screen.getAllByText('LMS Client').length).toBeGreaterThan(0);
    expect(screen.getByText('Mock client dashboard hero')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open progress dashboard' })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Student Progress/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /My Courses/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Lessons/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Notifications/i })).toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: /My Progress/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Instructor Workflow' })).toBeInTheDocument();
    expect(screen.getByText('Pending reviews')).toBeInTheDocument();
  });

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

    expect(await screen.findByRole('heading', { name: 'Enrolled Courses' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Refine courses' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search courses')).toBeInTheDocument();
    expect(await screen.findByText('React Foundations')).toBeInTheDocument();
    expect(await screen.findByText('12 lessons')).toBeInTheDocument();
    expect(await screen.findByText('120 students')).toBeInTheDocument();
    expect(screen.getByText('Your progress')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wishlist' })).toBeInTheDocument();
  });

  it('renders the shared notifications page with summary cards and notification items', () => {
    renderWithRole('STUDENT', <ClientNotificationsPage />, '/notifications');

    expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Unread alerts')).toBeInTheDocument();
    expect(screen.getByText('Learning reminders')).toBeInTheDocument();
    expect(screen.getByText('Progress synced')).toBeInTheDocument();
    expect(screen.getByText('Assignment reminder')).toBeInTheDocument();
    expect(screen.getAllByText('Unread').length).toBeGreaterThan(0);
  });

  it('renders instructor course management inside the client layout instead of the admin shell', () => {
    renderWithRole('INSTRUCTOR', <InstructorCoursesPage />, '/instructor/courses');

    expect(screen.getAllByText('LMS Client').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'My Courses' })).toBeInTheDocument();
    expect(screen.getByText('Active courses')).toBeInTheDocument();
    expect(screen.getByText('Draft courses')).toBeInTheDocument();
    expect(screen.getByText('Mock instructor courses management')).toBeInTheDocument();
    expect(screen.queryByText('LMS Admin')).not.toBeInTheDocument();
  });

  it('renders instructor lesson management inside the client layout instead of the admin shell', () => {
    renderWithRole('INSTRUCTOR', <InstructorLessonsPage />, '/instructor/lessons');

    expect(screen.getAllByText('LMS Client').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Lesson Builder' })).toBeInTheDocument();
    expect(screen.getByText('Modules in progress')).toBeInTheDocument();
    expect(screen.getByText('Ready to publish')).toBeInTheDocument();
    expect(screen.getByText('Mock instructor lessons management')).toBeInTheDocument();
    expect(screen.queryByText('LMS Admin')).not.toBeInTheDocument();
  });
});

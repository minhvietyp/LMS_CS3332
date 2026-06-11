import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../context/AuthContext';
import { ClientLayout } from '../../../components/client-layout/layout/ClientLayout';
import { getVisibleClientMenu } from '../../../components/client-layout/layout/ClientRoleMenu/clientMenu.config';

const listNotificationsRequestMock = vi.fn();
const markAllNotificationsAsReadRequestMock = vi.fn();
const listCoursesRequestMock = vi.fn();
const useClientContinueLearningMock = vi.fn();

vi.mock('../../../services/api/authApi', async () => {
  const actual = await vi.importActual<typeof import('../../../services/api/authApi')>('../../../services/api/authApi');

  return {
    ...actual,
    logoutRequest: vi.fn(),
  };
});

vi.mock('../../../services/api/notificationApi', () => ({
  listNotificationsRequest: (...args: unknown[]) => listNotificationsRequestMock(...args),
  markAllNotificationsAsReadRequest: (...args: unknown[]) => markAllNotificationsAsReadRequestMock(...args),
}));

vi.mock('../../../services/api/courseApi', () => ({
  listCoursesRequest: (...args: unknown[]) => listCoursesRequestMock(...args),
}));

vi.mock('../../../hooks/useClientContinueLearning', () => ({
  useClientContinueLearning: (...args: unknown[]) => useClientContinueLearningMock(...args),
}));

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function renderWithRole(role: 'STUDENT' | 'INSTRUCTOR') {
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
    <MemoryRouter initialEntries={[role === 'STUDENT' ? '/progress' : '/instructor/progress']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ClientLayout>
            <div>Client page content</div>
          </ClientLayout>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ClientLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    listNotificationsRequestMock.mockReset();
    listCoursesRequestMock.mockReset();
    useClientContinueLearningMock.mockReset();
    listNotificationsRequestMock.mockResolvedValue([]);
    listCoursesRequestMock.mockResolvedValue({
      data: [
        {
          id: 'course-1',
          title: 'React Foundations',
          description: 'Course description',
          status: 'PUBLISHED',
          instructorId: 'instructor-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
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

  it('renders student navigation and page content', () => {
    renderWithRole('STUDENT');

    const menu = screen.getByRole('menu', { name: 'Client navigation' });
    expect(screen.getByText('EduFlow LMS')).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Dashboard/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Progress/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Notifications/i })).toBeInTheDocument();
    expect(screen.getByText('Client page content')).toBeInTheDocument();
  }, 10000);

  it('filters instructor-only items away from student menu data', () => {
    const items = getVisibleClientMenu('STUDENT');
    const labels = items.flatMap((section) => section.items.map((item) => item.label));

    expect(labels.includes('Progress')).toBe(true);
    expect(labels.includes('Student Progress')).toBe(false);
  });

  it('shows instructor progress menu item for instructors', () => {
    const items = getVisibleClientMenu('INSTRUCTOR');
    const labels = items.flatMap((section) => section.items.map((item) => item.label));

    expect(labels.includes('Student Progress')).toBe(true);
    expect(labels.includes('Progress')).toBe(false);
  });
});

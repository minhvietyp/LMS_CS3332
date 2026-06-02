import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../context/AuthContext';
import { ClientLayout } from '../../components/client-layout';

const listNotificationsRequestMock = vi.fn();
const listCoursesRequestMock = vi.fn();
const useClientContinueLearningMock = vi.fn();

vi.mock('../../services/api/authApi', async () => {
  const actual = await vi.importActual<typeof import('../../services/api/authApi')>('../../services/api/authApi');
  return {
    ...actual,
    logoutRequest: vi.fn(),
  };
});

vi.mock('../../services/api/notificationApi', () => ({
  listNotificationsRequest: (...args: unknown[]) => listNotificationsRequestMock(...args),
  markAllNotificationsAsReadRequest: vi.fn(),
}));

vi.mock('../../services/api/courseApi', () => ({
  listCoursesRequest: (...args: unknown[]) => listCoursesRequestMock(...args),
}));

vi.mock('../../hooks/useClientContinueLearning', () => ({
  useClientContinueLearning: (...args: unknown[]) => useClientContinueLearningMock(...args),
}));

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function renderLayout() {
  localStorage.clear();
  localStorage.setItem(
    'lms.auth',
    JSON.stringify({
      user: { id: 'student-1', name: 'Student', email: 'student@example.com', role: 'STUDENT' },
      token: buildToken(),
      refreshToken: 'refresh-token',
    }),
  );

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={['/progress']}>
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

describe('Client command palette', () => {
  beforeEach(() => {
    listNotificationsRequestMock.mockReset();
    listCoursesRequestMock.mockReset();
    useClientContinueLearningMock.mockReset();

    listNotificationsRequestMock.mockResolvedValue([]);
    listCoursesRequestMock.mockResolvedValue({ data: [] });
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

  afterEach(() => {
    localStorage.clear();
  });

  it('opens from the keyboard shortcut and closes on Escape', async () => {
    renderLayout();

    fireEvent.keyDown(window, { ctrlKey: true, key: 'k' });

    const dialog = await screen.findByRole('dialog', { name: 'Command palette' });
    expect(dialog).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search command palette' }), { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
    });
  }, 10000);
});

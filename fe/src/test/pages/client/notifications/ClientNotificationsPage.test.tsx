import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../context/AuthContext';
import { ClientNotificationsPage } from '../../../../pages/client/notifications/ClientNotificationsPage';

const listNotificationsRequest = vi.fn();
const markNotificationAsReadRequest = vi.fn();
const listCoursesRequest = vi.fn();

vi.mock('../../../../services/api/notificationApi', () => ({
  listNotificationsRequest: (...args: unknown[]) => listNotificationsRequest(...args),
  markNotificationAsReadRequest: (...args: unknown[]) => markNotificationAsReadRequest(...args),
}));

vi.mock('../../../../services/api/courseApi', () => ({
  listCoursesRequest: (...args: unknown[]) => listCoursesRequest(...args),
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
    <MemoryRouter initialEntries={['/notifications']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ClientNotificationsPage />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ClientNotificationsPage', () => {
  beforeEach(() => {
    listNotificationsRequest.mockReset();
    markNotificationAsReadRequest.mockReset();
    listCoursesRequest.mockReset();

    listNotificationsRequest.mockResolvedValue([
      {
        id: 'notification-1',
        userId: 'student-1',
        type: 'COURSE',
        message: 'Course schedule updated for React Foundations.',
        referenceId: 'enrollment-1',
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
        referenceId: 'submission-1',
        courseId: '11111111-1111-1111-1111-111111111111',
        isRead: true,
        readAt: '2026-01-11T00:00:00.000Z',
        createdAt: '2026-01-11T00:00:00.000Z',
      },
    ]);

    markNotificationAsReadRequest.mockResolvedValue(undefined);
    listCoursesRequest.mockResolvedValue({
      data: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          title: 'React Foundations',
          description: 'Course description',
          status: 'PUBLISHED',
          instructorId: 'instructor-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    });
  });

  it('renders notifications from the API and marks one as read', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Notifications Center' })).toBeInTheDocument();
    expect(await screen.findByText('Priority Notifications')).toBeInTheDocument();
    expect(await screen.findByText('Notification Feed')).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: /All/i })).toBeInTheDocument();
    expect((await screen.findAllByText('Course schedule updated for React Foundations.', {}, { timeout: 20000 })).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Assignment feedback is available.', {}, { timeout: 20000 })).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Unread|Read/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mark Read' })[0]);

    await waitFor(() => {
      expect(markNotificationAsReadRequest.mock.calls[0]?.[0]).toBe('notification-1');
    });
  }, 30000);
});

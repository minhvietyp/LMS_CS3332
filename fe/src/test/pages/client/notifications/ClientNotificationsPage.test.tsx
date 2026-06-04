import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../context/AuthContext';
import { ClientNotificationsPage } from '../../../../pages/client/notifications/ClientNotificationsPage';

const listNotificationsRequest = vi.fn();
const markNotificationAsReadRequest = vi.fn();
const markAllNotificationsAsReadRequest = vi.fn();

vi.mock('../../../../services/api/notificationApi', () => ({
  listNotificationsRequest: (...args: unknown[]) => listNotificationsRequest(...args),
  markNotificationAsReadRequest: (...args: unknown[]) => markNotificationAsReadRequest(...args),
  markAllNotificationsAsReadRequest: (...args: unknown[]) => markAllNotificationsAsReadRequest(...args),
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
    markAllNotificationsAsReadRequest.mockReset();

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
    markAllNotificationsAsReadRequest.mockResolvedValue(1);
  });

  it('renders notifications from the API and marks one as read', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    expect(await screen.findByText('Review unread updates, course activity, assignments, grades, and system messages.')).toBeInTheDocument();
    expect(await screen.findByText('Course updates')).toBeInTheDocument();
    expect(await screen.findByText('Assignment/quiz updates')).toBeInTheDocument();
    expect(await screen.findByText('Notification Feed')).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: /All/i })).toBeInTheDocument();
    expect((await screen.findAllByText('Course schedule updated for React Foundations.', {}, { timeout: 20000 })).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Assignment feedback is available.', {}, { timeout: 20000 })).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Unread|Read/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole('button', { name: /Mark as read/i })[0]);

    await waitFor(() => {
      expect(markNotificationAsReadRequest.mock.calls[0]?.[0]).toBe('notification-1');
    });
  }, 30000);

  it('marks every unread notification as read', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Mark all read/i }));

    await waitFor(() => {
      expect(markAllNotificationsAsReadRequest).toHaveBeenCalledTimes(1);
    });
  }, 30000);
});

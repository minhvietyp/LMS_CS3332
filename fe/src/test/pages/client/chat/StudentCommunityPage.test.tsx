import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../context/AuthContext';
import { StudentCommunityPage } from '../../../../pages/client/chat/StudentCommunityPage';

const listMyChatRoomsRequest = vi.fn();
const listNotificationsRequest = vi.fn();
const markAllNotificationsAsReadRequest = vi.fn();

vi.mock('../../../../services/api/chatApi', () => ({
  listMyChatRoomsRequest: (...args: unknown[]) => listMyChatRoomsRequest(...args),
}));

vi.mock('../../../../services/api/notificationApi', () => ({
  listNotificationsRequest: (...args: unknown[]) => listNotificationsRequest(...args),
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
    <MemoryRouter initialEntries={['/student/community']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StudentCommunityPage />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('StudentCommunityPage', () => {
  beforeEach(() => {
    listMyChatRoomsRequest.mockReset();
    listNotificationsRequest.mockReset();

    listMyChatRoomsRequest.mockResolvedValue([
      {
        id: 'room-1',
        type: 'COURSE',
        courseId: 'course-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        course: { id: 'course-1', title: 'React Foundations' },
        messages: [
          {
            id: 'message-1',
            roomId: 'room-1',
            senderId: 'instructor-1',
            content: 'Discussion prompt for week 2.',
            isRead: false,
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
        ],
      },
    ]);

    listNotificationsRequest.mockResolvedValue([
      {
        id: 'notification-1',
        userId: 'student-1',
        type: 'COURSE',
        message: 'Week 2 materials are now available.',
        referenceId: 'course-1',
        courseId: 'course-1',
        isRead: false,
        readAt: null,
        createdAt: '2026-01-03T00:00:00.000Z',
      },
    ]);
  });

  it('renders course discussions and announcements for students', async () => {
    renderPage();

    expect((await screen.findAllByRole('heading', { name: 'Learning Community' })).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('React Foundations')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Discussion prompt for week 2.')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Week 2 materials are now available.')).length).toBeGreaterThan(0);
    expect((await screen.findAllByRole('button', { name: 'Ask Question' })).length).toBeGreaterThan(0);
  }, 10000);
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../context/AuthContext';
import { CourseAnnouncementsPage } from '../../../../pages/client/notifications/CourseAnnouncementsPage';

const getCourseByIdRequest = vi.fn();
const listNotificationsRequest = vi.fn();
const markNotificationAsReadRequest = vi.fn();

vi.mock('../../../../services/api/courseApi', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/api/courseApi')>(
    '../../../../services/api/courseApi',
  );

  return {
    ...actual,
    getCourseByIdRequest: (...args: unknown[]) => getCourseByIdRequest(...args),
  };
});

vi.mock('../../../../services/api/notificationApi', () => ({
  listNotificationsRequest: (...args: unknown[]) => listNotificationsRequest(...args),
  markNotificationAsReadRequest: (...args: unknown[]) => markNotificationAsReadRequest(...args),
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
    <MemoryRouter initialEntries={['/courses/11111111-1111-1111-1111-111111111111/announcements']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/courses/:courseId/announcements" element={<CourseAnnouncementsPage />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('CourseAnnouncementsPage', () => {
  beforeEach(() => {
    getCourseByIdRequest.mockReset();
    listNotificationsRequest.mockReset();
    markNotificationAsReadRequest.mockReset();

    getCourseByIdRequest.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      title: 'React Foundations',
      description: 'Intro course',
      status: 'PUBLISHED',
      instructorId: 'instructor-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      modules: [],
    });

    listNotificationsRequest.mockResolvedValue([
      {
        id: 'notification-1',
        userId: 'student-1',
        type: 'COURSE',
        message: 'Week 2 materials are now available.',
        referenceId: 'course-1',
        courseId: '11111111-1111-1111-1111-111111111111',
        isRead: false,
        readAt: null,
        createdAt: '2026-01-12T00:00:00.000Z',
      },
      {
        id: 'notification-2',
        userId: 'student-1',
        type: 'COURSE',
        message: 'Another course update',
        referenceId: 'course-2',
        courseId: '22222222-2222-2222-2222-222222222222',
        isRead: false,
        readAt: null,
        createdAt: '2026-01-13T00:00:00.000Z',
      },
    ]);

    markNotificationAsReadRequest.mockResolvedValue(undefined);
  });

  it('renders course-scoped announcements and marks one as read', async () => {
    renderPage();

    expect((await screen.findAllByRole('heading', { name: 'Instructor Announcements' })).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Week 2 materials are now available.')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Another course update')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Read Announcement' }));

    await waitFor(() => {
      expect(markNotificationAsReadRequest.mock.calls[0]?.[0]).toBe('notification-1');
    });
  }, 10000);
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../context/AuthContext';
import { StudentCommunityPage } from '../../../../pages/client/chat/StudentCommunityPage';

const listMyChatRoomsRequest = vi.fn();
const getChatRoomMessagesRequest = vi.fn();
const sendChatMessageRequest = vi.fn();
const listNotificationsRequest = vi.fn();
const markAllNotificationsAsReadRequest = vi.fn();

vi.mock('../../../../services/api/chatApi', () => ({
  listMyChatRoomsRequest: (...args: unknown[]) => listMyChatRoomsRequest(...args),
  getChatRoomMessagesRequest: (...args: unknown[]) => getChatRoomMessagesRequest(...args),
  sendChatMessageRequest: (...args: unknown[]) => sendChatMessageRequest(...args),
}));

vi.mock('../../../../services/api/notificationApi', () => ({
  listNotificationsRequest: (...args: unknown[]) => listNotificationsRequest(...args),
  markAllNotificationsAsReadRequest: (...args: unknown[]) => markAllNotificationsAsReadRequest(...args),
}));

vi.mock('../../../../services/sockets/chatSocket', () => ({
  connectChatSocket: vi.fn(),
  joinChatRoom: vi.fn(),
  subscribeToRoomMessages: vi.fn(() => vi.fn()),
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
    getChatRoomMessagesRequest.mockReset();
    sendChatMessageRequest.mockReset();
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

    getChatRoomMessagesRequest.mockResolvedValue([
      {
        id: 'message-1',
        roomId: 'room-1',
        senderId: 'instructor-1',
        content: 'Discussion prompt for week 2.',
        isRead: false,
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        sender: { id: 'instructor-1', name: 'Instructor Lane' },
      },
    ]);

    sendChatMessageRequest.mockResolvedValue({
      id: 'message-2',
      roomId: 'room-1',
      senderId: 'student-1',
      content: 'I have a question about week 2.',
      isRead: false,
      createdAt: '2026-01-02T01:00:00.000Z',
      updatedAt: '2026-01-02T01:00:00.000Z',
    });

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

  it('renders conversations and sends a message for students', async () => {
    renderPage();

    expect((await screen.findAllByRole('heading', { name: 'Community' })).length).toBeGreaterThan(0);
    expect((await screen.findAllByRole('heading', { name: 'Conversations' })).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('React Foundations')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Discussion prompt for week 2.')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Instructor Lane')).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText('Write a message...'), {
      target: { value: 'I have a question about week 2.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(sendChatMessageRequest).toHaveBeenCalledWith('room-1', 'I have a question about week 2.');
    });
  }, 10000);
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../context/AuthContext';
import { CourseDiscussionPage } from '../../../../pages/client/chat/CourseDiscussionPage';

const getCourseByIdRequest = vi.fn();
const listMyChatRoomsRequest = vi.fn();
const getChatRoomMessagesRequest = vi.fn();
const sendChatMessageRequest = vi.fn();

vi.mock('../../../../services/api/courseApi', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/api/courseApi')>(
    '../../../../services/api/courseApi',
  );

  return {
    ...actual,
    getCourseByIdRequest: (...args: unknown[]) => getCourseByIdRequest(...args),
  };
});

vi.mock('../../../../services/api/chatApi', () => ({
  listMyChatRoomsRequest: (...args: unknown[]) => listMyChatRoomsRequest(...args),
  getChatRoomMessagesRequest: (...args: unknown[]) => getChatRoomMessagesRequest(...args),
  sendChatMessageRequest: (...args: unknown[]) => sendChatMessageRequest(...args),
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
    <MemoryRouter initialEntries={['/courses/course-1/discussion']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/courses/:courseId/discussion" element={<CourseDiscussionPage />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('CourseDiscussionPage', () => {
  beforeEach(() => {
    getCourseByIdRequest.mockReset();
    listMyChatRoomsRequest.mockReset();
    getChatRoomMessagesRequest.mockReset();
    sendChatMessageRequest.mockReset();

    getCourseByIdRequest.mockResolvedValue({
      id: 'course-1',
      title: 'React Foundations',
      description: 'Intro course',
      status: 'PUBLISHED',
      instructorId: 'instructor-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      modules: [],
    });

    listMyChatRoomsRequest.mockResolvedValue([
      {
        id: 'room-1',
        type: 'COURSE',
        courseId: 'course-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        course: { id: 'course-1', title: 'React Foundations' },
        messages: [],
      },
    ]);

    getChatRoomMessagesRequest.mockResolvedValue([
      {
        id: 'message-1',
        roomId: 'room-1',
        senderId: 'instructor-1',
        content: 'Discussion is open for this week.',
        isRead: false,
        createdAt: '2026-01-03T08:00:00.000Z',
        updatedAt: '2026-01-03T08:00:00.000Z',
        sender: { id: 'instructor-1', name: 'Instructor Lane' },
      },
    ]);

    sendChatMessageRequest.mockResolvedValue({
      id: 'message-2',
      roomId: 'room-1',
      senderId: 'student-1',
      content: 'Thanks, I have posted my question.',
      isRead: false,
      createdAt: '2026-01-03T10:00:00.000Z',
      updatedAt: '2026-01-03T10:00:00.000Z',
    });
  });

  it('renders the course room and posts a discussion message', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'React Foundations' })).toBeInTheDocument();
    expect(await screen.findByText('Discussion is open for this week.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Write your reply to the thread.'), {
      target: { value: 'Thanks, I have posted my question.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post Reply' }));

    await waitFor(() => {
      expect(sendChatMessageRequest).toHaveBeenCalledWith('room-1', 'Thanks, I have posted my question.');
    });
  }, 15000);
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../context/AuthContext';
import { DirectChatPage } from '../../../../pages/client/chat/DirectChatPage';

const listMyChatRoomsRequest = vi.fn();
const getChatRoomMessagesRequest = vi.fn();
const createDirectRoomRequest = vi.fn();
const sendChatMessageRequest = vi.fn();
const listPublicInstructorsRequest = vi.fn();

vi.mock('../../../../services/api/chatApi', () => ({
  listMyChatRoomsRequest: (...args: unknown[]) => listMyChatRoomsRequest(...args),
  getChatRoomMessagesRequest: (...args: unknown[]) => getChatRoomMessagesRequest(...args),
  createDirectRoomRequest: (...args: unknown[]) => createDirectRoomRequest(...args),
  sendChatMessageRequest: (...args: unknown[]) => sendChatMessageRequest(...args),
}));

vi.mock('../../../../services/api/authApi', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/api/authApi')>(
    '../../../../services/api/authApi',
  );

  return {
    ...actual,
    listPublicInstructorsRequest: (...args: unknown[]) => listPublicInstructorsRequest(...args),
  };
});

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
    <MemoryRouter initialEntries={['/chat']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <DirectChatPage />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('DirectChatPage', () => {
  beforeEach(() => {
    listMyChatRoomsRequest.mockReset();
    getChatRoomMessagesRequest.mockReset();
    createDirectRoomRequest.mockReset();
    sendChatMessageRequest.mockReset();
    listPublicInstructorsRequest.mockReset();

    listMyChatRoomsRequest.mockResolvedValue([
      {
        id: 'room-1',
        type: 'DIRECT',
        courseId: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        members: [
          { id: 'member-1', roomId: 'room-1', userId: 'student-1', joinedAt: '2026-01-01T00:00:00.000Z', user: { id: 'student-1', name: 'Student' } },
          { id: 'member-2', roomId: 'room-1', userId: 'instructor-1', joinedAt: '2026-01-01T00:00:00.000Z', user: { id: 'instructor-1', name: 'Instructor Lane' } },
        ],
        messages: [
          {
            id: 'message-1',
            roomId: 'room-1',
            senderId: 'instructor-1',
            content: 'Please review lesson 2 before tomorrow.',
            isRead: false,
            createdAt: '2026-01-02T09:00:00.000Z',
            updatedAt: '2026-01-02T09:00:00.000Z',
          },
        ],
      },
    ]);

    getChatRoomMessagesRequest.mockResolvedValue([
      {
        id: 'message-1',
        roomId: 'room-1',
        senderId: 'instructor-1',
        content: 'Please review lesson 2 before tomorrow.',
        isRead: false,
        createdAt: '2026-01-02T09:00:00.000Z',
        updatedAt: '2026-01-02T09:00:00.000Z',
        sender: { id: 'instructor-1', name: 'Instructor Lane' },
      },
    ]);

    listPublicInstructorsRequest.mockResolvedValue([
      { id: 'instructor-1', name: 'Instructor Lane', email: 'instructor@example.com', role: 'INSTRUCTOR' },
    ]);

    createDirectRoomRequest.mockResolvedValue({
      id: 'room-1',
      type: 'DIRECT',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    sendChatMessageRequest.mockResolvedValue({
      id: 'message-2',
      roomId: 'room-1',
      senderId: 'student-1',
      content: 'I will review it this afternoon.',
      isRead: false,
      createdAt: '2026-01-02T10:00:00.000Z',
      updatedAt: '2026-01-02T10:00:00.000Z',
    });
  });

  it('renders direct rooms and sends a message', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Direct Chat' })).toBeInTheDocument();
    expect((await screen.findAllByText('Instructor Lane')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Please review lesson 2 before tomorrow.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Write your message'), {
      target: { value: 'I will review it this afternoon.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(sendChatMessageRequest).toHaveBeenCalledWith('room-1', 'I will review it this afternoon.');
    });
  }, 15000);
});

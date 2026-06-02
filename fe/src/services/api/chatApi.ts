import axios, { AxiosError } from 'axios';
import { apiClient } from './authApi';

export type ChatRoomType = 'DIRECT' | 'COURSE';

export interface ChatRoomCourseSummary {
  id: string;
  title: string;
}

export interface ChatMessageSender {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface ChatMessageItem {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: ChatMessageSender;
}

export interface ChatRoomMemberUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  role?: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
}

export interface ChatRoomMember {
  id: string;
  roomId: string;
  userId: string;
  joinedAt: string;
  user?: ChatRoomMemberUser;
}

export interface ChatRoomItem {
  id: string;
  type: ChatRoomType;
  courseId?: string | null;
  name?: string | null;
  createdAt: string;
  updatedAt: string;
  course?: ChatRoomCourseSummary | null;
  members?: ChatRoomMember[];
  messages?: ChatMessageItem[];
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message ?? fallback;
  }

  return fallback;
}

export async function listMyChatRoomsRequest(): Promise<ChatRoomItem[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<ChatRoomItem[]>>('/chat/rooms');
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load chat rooms.'));
  }
}

export async function getChatRoomMessagesRequest(roomId: string): Promise<ChatMessageItem[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<ChatMessageItem[]>>(`/chat/rooms/${roomId}/messages`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load messages.'));
  }
}

export async function createDirectRoomRequest(userId: string): Promise<ChatRoomItem> {
  try {
    const response = await apiClient.post<ApiEnvelope<ChatRoomItem>>('/chat/direct-rooms', { userId });
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to start a direct conversation.'));
  }
}

export async function sendChatMessageRequest(roomId: string, content: string): Promise<ChatMessageItem> {
  try {
    const response = await apiClient.post<ApiEnvelope<ChatMessageItem>>(`/chat/rooms/${roomId}/messages`, {
      content,
    });
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to send the message.'));
  }
}

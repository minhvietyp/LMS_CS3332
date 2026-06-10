import axios, { AxiosError } from 'axios';
import { apiClient } from './authApi';

export type NotificationType = 'COURSE' | 'QUIZ' | 'ASSIGNMENT' | 'CHAT' | 'SYSTEM';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  referenceId?: string | null;
  courseId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
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

export async function listNotificationsRequest(): Promise<NotificationItem[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<NotificationItem[]>>('/notifications');
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load notifications.'), { cause: error });
  }
}

export async function markNotificationAsReadRequest(notificationId: string): Promise<void> {
  try {
    await apiClient.patch<ApiEnvelope<null>>(`/notifications/${notificationId}/read`);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update notification.'), { cause: error });
  }
}

export async function markAllNotificationsAsReadRequest(): Promise<number> {
  try {
    const response = await apiClient.patch<ApiEnvelope<{ updatedCount: number }>>('/notifications/read-all');
    return response.data.data.updatedCount;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to mark all notifications as read.'), { cause: error });
  }
}

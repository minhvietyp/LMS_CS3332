import axios from 'axios';
import type {
  ProgressOverviewData,
  ProgressSummary,
  ActivityTimeline,
  InstructorCourseProgressData,
  InstructorStudentCourseProgressDetail,
  EnrollmentStatus,
  AdminProgressOverviewData,
  AdminCourseProgressListData,
  ProgressHistoryListData,
} from '../types/progress';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const rawAuth = localStorage.getItem('lms.auth');

  if (!rawAuth) {
    return config;
  }

  try {
    const storedAuth = JSON.parse(rawAuth) as { token?: string };
    if (storedAuth.token) {
      config.headers.Authorization = `Bearer ${storedAuth.token}`;
    }
  } catch {
    localStorage.removeItem('lms.auth');
  }

  return config;
});

export const progressService = {
  /**
   * Get full progress overview with summary and all courses
   */
  getOverview: async (): Promise<ProgressOverviewData> => {
    const { data } = await apiClient.get('/progress/overview');
    return data.data;
  },

  /**
   * Get progress summary only (lightweight)
   */
  getOverviewSummary: async (): Promise<{ summary: ProgressSummary }> => {
    const { data } = await apiClient.get('/progress/overview/summary');
    return data.data;
  },

  /**
   * Get activity timeline
   */
  getActivityTimeline: async (limit?: number, offset?: number): Promise<ActivityTimeline> => {
    const { data } = await apiClient.get('/progress/overview/timeline', {
      params: { limit, offset },
    });
    return data.data;
  },

  getInstructorCourseProgress: async (
    courseId: string,
    params?: {
      page?: number;
      pageSize?: number;
      status?: EnrollmentStatus;
      search?: string;
      sortBy?: 'name' | 'progress' | 'lastActivity' | 'enrolledAt';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<InstructorCourseProgressData> => {
    const { data } = await apiClient.get(`/progress/courses/${courseId}/students-progress`, {
      params,
    });
    return data.data;
  },

  getInstructorStudentCourseProgress: async (
    courseId: string,
    studentId: string,
  ): Promise<InstructorStudentCourseProgressDetail> => {
    const { data } = await apiClient.get(`/progress/courses/${courseId}/students/${studentId}`);
    return data.data;
  },

  getAdminProgressOverview: async (): Promise<AdminProgressOverviewData> => {
    const { data } = await apiClient.get('/progress/admin/overview');
    return data.data;
  },

  getAdminCourseProgressList: async (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    instructorId?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    sortBy?: 'title' | 'progress' | 'students' | 'completionRate';
    sortOrder?: 'asc' | 'desc';
  }): Promise<AdminCourseProgressListData> => {
    const { data } = await apiClient.get('/progress/admin/courses', { params });
    return data.data;
  },

  getMyProgressHistory: async (params?: {
    page?: number;
    pageSize?: number;
    courseId?: string;
    lessonId?: string;
    actionType?: string;
  }): Promise<ProgressHistoryListData> => {
    const { data } = await apiClient.get('/progress/history/me', { params });
    return data.data;
  },
};

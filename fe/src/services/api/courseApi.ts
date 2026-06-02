import axios, { AxiosError } from 'axios';
import { apiClient } from './authApi';

export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface CourseInstructorSummary {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface PublicCourseInstructorSummary extends CourseInstructorSummary {
  occupation?: string | null;
  bio?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
}

export interface CourseListItem {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  status: CourseStatus;
  instructorId: string;
  instructor?: CourseInstructorSummary;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface CourseLessonItem {
  id: string;
  title: string;
  orderIndex: number;
  videoUrl?: string | null;
  isPublished: boolean;
  deletedAt?: string | null;
}

export interface CourseModuleItem {
  id: string;
  title: string;
  orderIndex: number;
  lessons: CourseLessonItem[];
}

export interface CourseDetail extends CourseListItem {
  deletedBy?: string | null;
  modules: CourseModuleItem[];
}

export interface CourseResourceItem {
  id: string;
  title: string;
  type: 'pdf' | 'slide' | 'link' | 'reading' | string;
  url: string;
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string;
  createdAt: string;
}

export interface PublicCourseListItem extends CourseListItem {
  instructor?: PublicCourseInstructorSummary;
  moduleCount?: number;
  lessonCount?: number;
  enrollmentCount?: number;
}

export interface PublicCourseDetail extends PublicCourseListItem {
  modules: CourseModuleItem[];
}

export interface CoursePayload {
  title: string;
  description?: string;
}

export interface CourseUpdatePayload extends Partial<CoursePayload> {}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PaginatedApiEnvelope<T> extends ApiEnvelope<T> {
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message ?? fallback;
  }

  return fallback;
}

export async function listCoursesRequest(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: CourseStatus;
  instructorId?: string;
  includeDeleted?: boolean;
  deletedOnly?: boolean;
}): Promise<{ data: CourseListItem[]; meta?: PaginatedApiEnvelope<CourseListItem[]>['meta'] }> {
  try {
    const response = await apiClient.get<PaginatedApiEnvelope<CourseListItem[]>>('/courses', { params });
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load courses.'));
  }
}

export async function getCourseByIdRequest(courseId: string): Promise<CourseDetail> {
  try {
    const response = await apiClient.get<ApiEnvelope<CourseDetail>>(`/courses/${courseId}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load course details.'));
  }
}

export async function listPublishedCourseModulesRequest(courseId: string): Promise<CourseModuleItem[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<CourseModuleItem[]>>(`/courses/${courseId}/modules`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load published course modules.'));
  }
}

export async function listCourseResourcesRequest(courseId: string): Promise<{ materials: CourseResourceItem[] }> {
  try {
    const response = await apiClient.get<ApiEnvelope<{ materials: CourseResourceItem[] }>>(`/courses/${courseId}/resources`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load course resources.'));
  }
}

export async function createCourseRequest(payload: CoursePayload): Promise<CourseListItem> {
  try {
    const response = await apiClient.post<ApiEnvelope<CourseListItem>>('/courses', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to create course.'));
  }
}

export async function updateCourseRequest(courseId: string, payload: CourseUpdatePayload): Promise<CourseListItem> {
  try {
    const response = await apiClient.patch<ApiEnvelope<CourseListItem>>(`/courses/${courseId}`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update course.'));
  }
}

export async function updateCourseThumbnailRequest(courseId: string, file: File): Promise<CourseListItem> {
  try {
    const formData = new FormData();
    formData.append('thumbnail', file);

    const response = await apiClient.patch<ApiEnvelope<CourseListItem>>(`/courses/${courseId}/thumbnail`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to upload course thumbnail.'));
  }
}

export async function publishCourseRequest(courseId: string): Promise<CourseListItem> {
  try {
    const response = await apiClient.post<ApiEnvelope<CourseListItem>>(`/courses/${courseId}/publish`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to publish course.'));
  }
}

export async function archiveCourseRequest(courseId: string): Promise<CourseListItem> {
  try {
    const response = await apiClient.post<ApiEnvelope<CourseListItem>>(`/courses/${courseId}/archive`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to archive course.'));
  }
}

export async function deleteCourseRequest(courseId: string): Promise<void> {
  try {
    await apiClient.delete(`/courses/${courseId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete course.'));
  }
}

export async function restoreCourseRequest(courseId: string): Promise<CourseListItem> {
  try {
    const response = await apiClient.post<ApiEnvelope<CourseListItem>>(`/courses/${courseId}/restore`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to restore course.'));
  }
}

export async function listPublicCoursesRequest(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ data: PublicCourseListItem[]; meta?: PaginatedApiEnvelope<PublicCourseListItem[]>['meta'] }> {
  try {
    const response = await apiClient.get<PaginatedApiEnvelope<PublicCourseListItem[]>>('/courses/public', { params });
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load public courses.'));
  }
}

export async function getPublicCourseByIdRequest(courseId: string): Promise<PublicCourseDetail> {
  try {
    const response = await apiClient.get<ApiEnvelope<PublicCourseDetail>>(`/courses/public/${courseId}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load public course details.'));
  }
}

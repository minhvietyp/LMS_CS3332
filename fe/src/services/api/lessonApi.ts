import axios, { AxiosError } from 'axios';
import { apiClient } from './authApi';

export interface LessonListItem {
  id: string;
  moduleId: string;
  title: string;
  videoUrl?: string | null;
  orderIndex: number;
  isPublished: boolean;
  materials?: LessonMaterialItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonMaterialItem {
  id: string;
  lessonId: string;
  title: string;
  type: 'pdf' | 'slide' | 'link' | 'reading';
  url: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ModuleWithLessons {
  id: string;
  courseId: string;
  title: string;
  orderIndex: number;
  lessons: LessonListItem[];
}

export interface ModulePayload {
  title: string;
  orderIndex?: number;
}

export interface LessonPayload {
  title: string;
  videoUrl?: string;
  orderIndex?: number;
}

export interface LessonUpdatePayload {
  title?: string;
  videoUrl?: string | null;
  orderIndex?: number;
  moduleId?: string;
  isPublished?: boolean;
}

export interface MaterialPayload {
  title: string;
  type: 'pdf' | 'slide' | 'link' | 'reading';
  url: string;
}

export interface UploadMaterialPayload {
  title: string;
  type: 'pdf' | 'slide' | 'link' | 'reading';
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return axiosError.response?.data?.message ?? fallback;
  }

  return fallback;
}

export async function listCourseModulesRequest(courseId: string): Promise<ModuleWithLessons[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<ModuleWithLessons[]>>(`/lessons/courses/${courseId}/modules`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load modules.'));
  }
}

export async function createModuleRequest(courseId: string, payload: ModulePayload): Promise<ModuleWithLessons> {
  try {
    const response = await apiClient.post<ApiEnvelope<ModuleWithLessons>>(`/lessons/courses/${courseId}/modules`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to create module.'));
  }
}

export async function updateModuleRequest(moduleId: string, payload: Partial<ModulePayload>): Promise<ModuleWithLessons> {
  try {
    const response = await apiClient.patch<ApiEnvelope<ModuleWithLessons>>(`/lessons/modules/${moduleId}`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update module.'));
  }
}

export async function deleteModuleRequest(moduleId: string): Promise<void> {
  try {
    await apiClient.delete(`/lessons/modules/${moduleId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete module.'));
  }
}

export async function createLessonRequest(moduleId: string, payload: LessonPayload): Promise<LessonListItem> {
  try {
    const response = await apiClient.post<ApiEnvelope<LessonListItem>>(`/lessons/modules/${moduleId}/lessons`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to create lesson.'));
  }
}

export async function updateLessonRequest(lessonId: string, payload: LessonUpdatePayload): Promise<LessonListItem> {
  try {
    const response = await apiClient.patch<ApiEnvelope<LessonListItem>>(`/lessons/lessons/${lessonId}`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update lesson.'));
  }
}

export async function deleteLessonRequest(lessonId: string): Promise<void> {
  try {
    await apiClient.delete(`/lessons/lessons/${lessonId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete lesson.'));
  }
}

export async function listLessonMaterialsRequest(lessonId: string): Promise<LessonMaterialItem[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<LessonMaterialItem[]>>(`/lessons/lessons/${lessonId}/materials`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load lesson materials.'));
  }
}

export async function createLessonMaterialRequest(lessonId: string, payload: MaterialPayload): Promise<LessonMaterialItem> {
  try {
    const response = await apiClient.post<ApiEnvelope<LessonMaterialItem>>(`/lessons/lessons/${lessonId}/materials`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to create lesson material.'));
  }
}

export async function uploadLessonMaterialRequest(
  lessonId: string,
  file: File,
  payload: UploadMaterialPayload,
): Promise<LessonMaterialItem> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', payload.title);
    formData.append('type', payload.type);

    const response = await apiClient.post<ApiEnvelope<LessonMaterialItem>>(
      `/lessons/lessons/${lessonId}/materials/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to upload lesson material.'));
  }
}

export async function deleteLessonMaterialRequest(materialId: string): Promise<void> {
  try {
    await apiClient.delete(`/lessons/materials/${materialId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete lesson material.'));
  }
}

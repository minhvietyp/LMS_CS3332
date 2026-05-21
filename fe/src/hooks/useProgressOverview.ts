import { useQuery } from '@tanstack/react-query';
import { progressService } from '../services/progressService';
import type {
  ProgressOverviewData,
  EnrollmentStatus,
  InstructorCourseProgressData,
  InstructorStudentCourseProgressDetail,
  AdminProgressOverviewData,
  AdminCourseProgressListData,
  ProgressHistoryListData,
} from '../types/progress';

export function useProgressOverview() {
  return useQuery<ProgressOverviewData>({
    queryKey: ['progress', 'overview'],
    queryFn: progressService.getOverview,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export function useProgressOverviewSummary() {
  return useQuery({
    queryKey: ['progress', 'overview', 'summary'],
    queryFn: progressService.getOverviewSummary,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export function useActivityTimeline(limit?: number, offset?: number) {
  return useQuery({
    queryKey: ['progress', 'timeline', limit, offset],
    queryFn: () => progressService.getActivityTimeline(limit, offset),
    staleTime: 3 * 60 * 1000, // 3 minutes
    retry: 2,
  });
}

export function useInstructorCourseProgress(
  courseId: string | undefined,
  params: {
    page: number;
    pageSize: number;
    status?: EnrollmentStatus;
    search?: string;
    sortBy?: 'name' | 'progress' | 'lastActivity' | 'enrolledAt';
    sortOrder?: 'asc' | 'desc';
  },
) {
  return useQuery<InstructorCourseProgressData>({
    queryKey: ['progress', 'instructor-course', courseId, params],
    queryFn: () => progressService.getInstructorCourseProgress(courseId!, params),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useInstructorStudentCourseProgress(courseId?: string, studentId?: string) {
  return useQuery<InstructorStudentCourseProgressDetail>({
    queryKey: ['progress', 'instructor-student', courseId, studentId],
    queryFn: () => progressService.getInstructorStudentCourseProgress(courseId!, studentId!),
    enabled: Boolean(courseId && studentId),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useAdminProgressOverview() {
  return useQuery<AdminProgressOverviewData>({
    queryKey: ['progress', 'admin-overview'],
    queryFn: progressService.getAdminProgressOverview,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useAdminCourseProgressList(params: {
  page: number;
  pageSize: number;
  search?: string;
  instructorId?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sortBy?: 'title' | 'progress' | 'students' | 'completionRate';
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery<AdminCourseProgressListData>({
    queryKey: ['progress', 'admin-courses', params],
    queryFn: () => progressService.getAdminCourseProgressList(params),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useMyProgressHistory(params: {
  page: number;
  pageSize: number;
  courseId?: string;
  lessonId?: string;
  actionType?: string;
}) {
  return useQuery<ProgressHistoryListData>({
    queryKey: ['progress', 'history', 'me', params],
    queryFn: () => progressService.getMyProgressHistory(params),
    staleTime: 60 * 1000,
    retry: 1,
  });
}

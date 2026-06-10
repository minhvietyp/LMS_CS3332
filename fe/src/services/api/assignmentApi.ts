import axios, { AxiosError } from 'axios';
import { apiClient } from './authApi';

export interface AssignmentListItem {
  id: string;
  courseId?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  allowLateSubmission: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignmentPayload {
  courseId: string;
  title: string;
  description?: string;
  dueDate?: string | null;
  allowLateSubmission: boolean;
}

export interface AssignmentSubmissionRecord {
  id: string;
  assignmentId: string;
  studentId: string;
  textContent?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  status: 'ON_TIME' | 'LATE' | 'GRADED' | 'RETURNED';
  isLate: boolean;
  submittedAt: string;
  grade?: number | null;
  feedback?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignmentSubmissionStudent {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface AssignmentSubmissionListItem extends AssignmentSubmissionRecord {
  student?: AssignmentSubmissionStudent;
}

export interface StudentAssignmentListItem extends AssignmentListItem {
  submissions: AssignmentSubmissionRecord[];
}

export type StudentAssignmentDetail = StudentAssignmentListItem;

export interface AssignmentSubmissionPayload {
  textContent?: string;
  fileUrl?: string;
  fileName?: string;
}

export interface AssignmentSubmissionUploadResult {
  fileUrl: string;
  fileName: string;
  publicId: string;
}

export interface AssignmentGradePayload {
  grade: number;
  feedback?: string;
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

export async function listCourseAssignmentsRequest(courseId: string): Promise<AssignmentListItem[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<AssignmentListItem[]>>(`/assignments/courses/${courseId}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load assignments.'), { cause: error });
  }
}

export async function createAssignmentRequest(payload: AssignmentPayload): Promise<AssignmentListItem> {
  try {
    const response = await apiClient.post<ApiEnvelope<AssignmentListItem>>('/assignments', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to create assignment.'), { cause: error });
  }
}

export async function updateAssignmentRequest(
  assignmentId: string,
  payload: Partial<AssignmentPayload>,
): Promise<AssignmentListItem> {
  try {
    const response = await apiClient.patch<ApiEnvelope<AssignmentListItem>>(`/assignments/${assignmentId}`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update assignment.'), { cause: error });
  }
}

export async function deleteAssignmentRequest(assignmentId: string): Promise<void> {
  try {
    await apiClient.delete(`/assignments/${assignmentId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete assignment.'), { cause: error });
  }
}

export async function listStudentCourseAssignmentsRequest(courseId: string): Promise<StudentAssignmentListItem[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<StudentAssignmentListItem[]>>(`/assignments/courses/${courseId}/student`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load assignments.'), { cause: error });
  }
}

export async function getStudentAssignmentDetailRequest(assignmentId: string): Promise<StudentAssignmentDetail> {
  try {
    const response = await apiClient.get<ApiEnvelope<StudentAssignmentDetail>>(`/assignments/${assignmentId}/student`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load assignment details.'), { cause: error });
  }
}

export async function submitStudentAssignmentRequest(
  assignmentId: string,
  payload: AssignmentSubmissionPayload,
): Promise<AssignmentSubmissionRecord> {
  try {
    const response = await apiClient.post<ApiEnvelope<AssignmentSubmissionRecord>>(`/assignments/${assignmentId}/submit`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to submit assignment.'), { cause: error });
  }
}

export async function uploadAssignmentSubmissionFileRequest(
  assignmentId: string,
  file: File,
): Promise<AssignmentSubmissionUploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<ApiEnvelope<AssignmentSubmissionUploadResult>>(
      `/assignments/${assignmentId}/upload-file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to upload assignment file.'), { cause: error });
  }
}

export async function listMyAssignmentSubmissionsRequest(courseId: string): Promise<AssignmentSubmissionRecord[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<AssignmentSubmissionRecord[]>>(`/assignments/courses/${courseId}/my-submissions`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load submissions.'), { cause: error });
  }
}

export async function listAssignmentSubmissionsRequest(assignmentId: string): Promise<AssignmentSubmissionListItem[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<AssignmentSubmissionListItem[]>>(`/assignments/${assignmentId}/submissions`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load assignment submissions.'), { cause: error });
  }
}

export async function gradeAssignmentSubmissionRequest(
  submissionId: string,
  payload: AssignmentGradePayload,
): Promise<AssignmentSubmissionListItem> {
  try {
    const response = await apiClient.patch<ApiEnvelope<AssignmentSubmissionListItem>>(
      `/assignments/submissions/${submissionId}/grade`,
      payload,
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to grade submission.'), { cause: error });
  }
}

export async function returnAssignmentSubmissionRequest(submissionId: string): Promise<AssignmentSubmissionListItem> {
  try {
    const response = await apiClient.patch<ApiEnvelope<AssignmentSubmissionListItem>>(
      `/assignments/submissions/${submissionId}/return`,
    );
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to return submission.'), { cause: error });
  }
}

import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface CreateAssignmentData {
  courseId: string;
  title: string;
  description?: string;
  dueDate: string;
  allowLateSubmission?: boolean;
}

interface UpdateAssignmentData {
  title?: string;
  description?: string;
  dueDate?: string;
  allowLateSubmission?: boolean;
}

interface SubmitAssignmentData {
  textContent?: string;
  fileUrl?: string;
  fileName?: string;
}

interface GradeSubmissionData {
  grade: number;
  feedback?: string;
}

export interface AssignmentSummary {
  id: string;
  courseId?: string;
  title: string;
  description?: string | null;
  dueDate?: string;
  allowLateSubmission?: boolean;
}

export interface AssignmentSubmissionSummary {
  id: string;
  assignmentId?: string;
  studentId?: string;
  textContent?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  grade?: number | null;
  feedback?: string | null;
  status?: string;
}

type SubmissionFilters = Record<string, string | number | boolean | undefined>;

type ApiEnvelope<T> = {
  data: T;
  message?: string;
};

export class AssignmentAPIClient {
  private apiUrl = `${API_BASE_URL}/assignments`;

  // ─── Assignment Management ───────────────────────────────────────────────

  async createAssignment(data: CreateAssignmentData): Promise<AssignmentSummary> {
    const response = await axios.post<ApiEnvelope<AssignmentSummary>>(this.apiUrl, data);
    return response.data.data;
  }

  async getAssignment(id: string): Promise<AssignmentSummary> {
    const response = await axios.get<ApiEnvelope<AssignmentSummary>>(`${this.apiUrl}/${id}`);
    return response.data.data;
  }

  async listByCourse(courseId: string): Promise<AssignmentSummary[]> {
    const response = await axios.get<ApiEnvelope<AssignmentSummary[]>>(`${this.apiUrl}/courses/${courseId}`);
    return response.data.data;
  }

  async updateAssignment(id: string, data: UpdateAssignmentData): Promise<AssignmentSummary> {
    const response = await axios.patch<ApiEnvelope<AssignmentSummary>>(`${this.apiUrl}/${id}`, data);
    return response.data.data;
  }

  async deleteAssignment(id: string) {
    await axios.delete(`${this.apiUrl}/${id}`);
  }

  async getAssignmentStatistics(id: string): Promise<unknown> {
    const response = await axios.get<ApiEnvelope<unknown>>(`${this.apiUrl}/${id}/statistics`);
    return response.data.data;
  }

  // ─── Submission Management ───────────────────────────────────────────────

  async submitAssignment(assignmentId: string, data: SubmitAssignmentData): Promise<AssignmentSubmissionSummary> {
    const response = await axios.post<ApiEnvelope<AssignmentSubmissionSummary>>(
      `${this.apiUrl}/${assignmentId}/submit`,
      data
    );
    return response.data.data;
  }

  async getSubmission(submissionId: string): Promise<AssignmentSubmissionSummary> {
    const response = await axios.get<ApiEnvelope<AssignmentSubmissionSummary>>(`${this.apiUrl}/submissions/${submissionId}`);
    return response.data.data;
  }

  async listSubmissionsByAssignment(assignmentId: string, filters?: SubmissionFilters): Promise<AssignmentSubmissionSummary[]> {
    const response = await axios.get<ApiEnvelope<AssignmentSubmissionSummary[]>>(
      `${this.apiUrl}/${assignmentId}/submissions`,
      { params: filters }
    );
    return response.data.data;
  }

  async listStudentSubmissions(courseId: string): Promise<AssignmentSubmissionSummary[]> {
    const response = await axios.get<ApiEnvelope<AssignmentSubmissionSummary[]>>(
      `${this.apiUrl}/courses/${courseId}/my-submissions`
    );
    return response.data.data;
  }

  async gradeSubmission(submissionId: string, data: GradeSubmissionData): Promise<AssignmentSubmissionSummary> {
    const response = await axios.patch<ApiEnvelope<AssignmentSubmissionSummary>>(
      `${this.apiUrl}/submissions/${submissionId}/grade`,
      data
    );
    return response.data.data;
  }

  async getSubmissionStatistics(assignmentId: string): Promise<unknown> {
    const response = await axios.get<ApiEnvelope<unknown>>(
      `${this.apiUrl}/${assignmentId}/submissions/statistics`
    );
    return response.data.data;
  }

  async handleError(error: AxiosError<ApiEnvelope<unknown>>): Promise<never> {
    if (error.response?.status === 404) {
      throw new Error('Not found', { cause: error });
    }
    if (error.response?.status === 403) {
      throw new Error('Access denied', { cause: error });
    }
    if (error.response?.status === 400) {
      throw new Error(error.response.data.message || 'Invalid request', { cause: error });
    }
    throw new Error('An error occurred', { cause: error });
  }
}

export const assignmentAPIClient = new AssignmentAPIClient();

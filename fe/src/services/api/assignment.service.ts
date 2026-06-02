// @ts-nocheck
import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

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

export class AssignmentAPIClient {
  private apiUrl = `${API_BASE_URL}/assignments`;

  // ─── Assignment Management ───────────────────────────────────────────────

  async createAssignment(data: CreateAssignmentData) {
    const response = await axios.post(this.apiUrl, data);
    return response.data.data;
  }

  async getAssignment(id: string) {
    const response = await axios.get(`${this.apiUrl}/${id}`);
    return response.data.data;
  }

  async listByCourse(courseId: string) {
    const response = await axios.get(`${this.apiUrl}/courses/${courseId}`);
    return response.data.data;
  }

  async updateAssignment(id: string, data: UpdateAssignmentData) {
    const response = await axios.patch(`${this.apiUrl}/${id}`, data);
    return response.data.data;
  }

  async deleteAssignment(id: string) {
    await axios.delete(`${this.apiUrl}/${id}`);
  }

  async getAssignmentStatistics(id: string) {
    const response = await axios.get(`${this.apiUrl}/${id}/statistics`);
    return response.data.data;
  }

  // ─── Submission Management ───────────────────────────────────────────────

  async submitAssignment(assignmentId: string, data: SubmitAssignmentData) {
    const response = await axios.post(
      `${this.apiUrl}/${assignmentId}/submit`,
      data
    );
    return response.data.data;
  }

  async getSubmission(submissionId: string) {
    const response = await axios.get(`${this.apiUrl}/submissions/${submissionId}`);
    return response.data.data;
  }

  async listSubmissionsByAssignment(assignmentId: string, filters?: any) {
    const response = await axios.get(
      `${this.apiUrl}/${assignmentId}/submissions`,
      { params: filters }
    );
    return response.data.data;
  }

  async listStudentSubmissions(courseId: string) {
    const response = await axios.get(
      `${this.apiUrl}/courses/${courseId}/my-submissions`
    );
    return response.data.data;
  }

  async gradeSubmission(submissionId: string, data: GradeSubmissionData) {
    const response = await axios.patch(
      `${this.apiUrl}/submissions/${submissionId}/grade`,
      data
    );
    return response.data.data;
  }

  async getSubmissionStatistics(assignmentId: string) {
    const response = await axios.get(
      `${this.apiUrl}/${assignmentId}/submissions/statistics`
    );
    return response.data.data;
  }

  async handleError(error: AxiosError) {
    if (error.response?.status === 404) {
      throw new Error('Not found');
    }
    if (error.response?.status === 403) {
      throw new Error('Access denied');
    }
    if (error.response?.status === 400) {
      const data = error.response?.data as any;
      throw new Error(data?.message || 'Invalid request');
    }
    throw new Error('An error occurred');
  }
}

export const assignmentAPIClient = new AssignmentAPIClient();

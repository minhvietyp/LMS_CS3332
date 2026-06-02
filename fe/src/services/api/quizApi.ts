import axios, { AxiosError } from 'axios';
import { apiClient } from './authApi';

export type QuizQuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE';

export interface QuizAnswerOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  text: string;
  type: QuizQuestionType;
  orderIndex: number;
  answerOptions: QuizAnswerOption[];
}

export interface QuizListItem {
  id: string;
  courseId?: string | null;
  title: string;
  description?: string | null;
  passingScore: number;
  maxAttempts: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  questions: QuizQuestion[];
  attempts?: Array<{
    id: string;
    score?: number | null;
    isPassed?: boolean | null;
    submittedAt?: string | null;
  }>;
  _count?: {
    attempts: number;
  };
}

export interface StudentQuizCourseItem {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  passingScore: number;
  maxAttempts: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
  attemptsUsed: number;
  attemptsRemaining: number;
}

export interface StudentQuizDetail {
  id: string;
  courseId: string;
  title: string;
  description?: string | null;
  passingScore: number;
  maxAttempts: number;
  isPublished: boolean;
  attemptsUsed: number;
  attemptsRemaining: number;
  questions: Array<{
    id: string;
    text: string;
    type: QuizQuestionType;
    orderIndex: number;
    answerOptions: Array<{
      id: string;
      text: string;
    }>;
  }>;
}

export interface StudentQuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  attemptNumber: number;
  status?: 'STARTED' | 'PASSED' | 'FAILED';
  score?: number | null;
  isPassed?: boolean | null;
  submittedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudentQuizResult {
  attemptId: string;
  attemptNumber: number;
  score: number;
  isPassed: boolean;
  submittedAt: string;
  correctCount: number;
  totalQuestions: number;
  quiz: {
    id: string;
    title: string;
    passingScore: number;
  };
  answers: Array<{
    questionId: string;
    questionText: string;
    selectedOptionId: string | null;
    selectedOptionText: string | null;
    correctOptionId: string | null;
    correctOptionText: string | null;
    isCorrect: boolean;
  }>;
}

export interface QuizPayload {
  courseId: string;
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts: number;
}

export interface QuizQuestionPayload {
  text: string;
  type: QuizQuestionType;
  orderIndex?: number;
  options: Array<{
    text: string;
    isCorrect: boolean;
  }>;
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

export async function listCourseQuizzesRequest(courseId: string): Promise<QuizListItem[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<QuizListItem[]>>(`/quizzes/courses/${courseId}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load quizzes.'));
  }
}

export async function createQuizRequest(payload: QuizPayload): Promise<QuizListItem> {
  try {
    const response = await apiClient.post<ApiEnvelope<QuizListItem>>('/quizzes', payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to create quiz.'));
  }
}

export async function updateQuizRequest(quizId: string, payload: Partial<QuizPayload>): Promise<QuizListItem> {
  try {
    const response = await apiClient.patch<ApiEnvelope<QuizListItem>>(`/quizzes/${quizId}`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update quiz.'));
  }
}

export async function publishQuizRequest(quizId: string): Promise<QuizListItem> {
  try {
    const response = await apiClient.post<ApiEnvelope<QuizListItem>>(`/quizzes/${quizId}/publish`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to publish quiz.'));
  }
}

export async function unpublishQuizRequest(quizId: string): Promise<QuizListItem> {
  try {
    const response = await apiClient.post<ApiEnvelope<QuizListItem>>(`/quizzes/${quizId}/unpublish`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to unpublish quiz.'));
  }
}

export async function deleteQuizRequest(quizId: string): Promise<void> {
  try {
    await apiClient.delete(`/quizzes/${quizId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete quiz.'));
  }
}

export async function createQuizQuestionRequest(quizId: string, payload: QuizQuestionPayload): Promise<QuizQuestion> {
  try {
    const response = await apiClient.post<ApiEnvelope<QuizQuestion>>(`/quizzes/${quizId}/questions`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to create question.'));
  }
}

export async function updateQuizQuestionRequest(
  questionId: string,
  payload: Partial<QuizQuestionPayload>,
): Promise<QuizQuestion> {
  try {
    const response = await apiClient.patch<ApiEnvelope<QuizQuestion>>(`/quizzes/questions/${questionId}`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to update question.'));
  }
}

export async function deleteQuizQuestionRequest(questionId: string): Promise<void> {
  try {
    await apiClient.delete(`/quizzes/questions/${questionId}`);
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to delete question.'));
  }
}

export async function listStudentCourseQuizzesRequest(courseId: string): Promise<StudentQuizCourseItem[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<StudentQuizCourseItem[]>>(`/quizzes/courses/${courseId}/student`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load course quizzes.'));
  }
}

export async function getStudentQuizDetailRequest(quizId: string): Promise<StudentQuizDetail> {
  try {
    const response = await apiClient.get<ApiEnvelope<StudentQuizDetail>>(`/quizzes/${quizId}/student`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load quiz detail.'));
  }
}

export async function startQuizAttemptRequest(quizId: string): Promise<StudentQuizAttempt> {
  try {
    const response = await apiClient.post<ApiEnvelope<StudentQuizAttempt>>(`/quizzes/${quizId}/attempts/start`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to start quiz attempt.'));
  }
}

export async function listMyQuizAttemptsRequest(quizId: string): Promise<StudentQuizAttempt[]> {
  try {
    const response = await apiClient.get<ApiEnvelope<StudentQuizAttempt[]>>(`/quizzes/${quizId}/attempts/me`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load quiz attempts.'));
  }
}

export async function submitQuizAttemptRequest(
  quizId: string,
  payload: {
    attemptId: string;
    answers: Array<{
      questionId: string;
      selectedOptionId: string;
    }>;
  },
): Promise<StudentQuizAttempt> {
  try {
    const response = await apiClient.post<ApiEnvelope<StudentQuizAttempt>>(`/quizzes/${quizId}/submit`, payload);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to submit quiz attempt.'));
  }
}

export async function getQuizAttemptResultRequest(quizId: string, attemptId: string): Promise<StudentQuizResult> {
  try {
    const response = await apiClient.get<ApiEnvelope<StudentQuizResult>>(`/quizzes/${quizId}/results/${attemptId}`);
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Failed to load quiz result.'));
  }
}

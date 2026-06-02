import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../context/AuthContext';
import { ClientAssignmentSubmissionPage } from '../../../../pages/client/assignments/ClientAssignmentSubmissionPage';
import { ClientCourseAssignmentsPage } from '../../../../pages/client/assignments/ClientCourseAssignmentsPage';
import { HEAVY_UI_TEST_TIMEOUT } from '../../../utils/testTimeouts';

const getCourseByIdRequest = vi.fn();
const listCoursesRequest = vi.fn();
const listCourseResourcesRequest = vi.fn();
const listStudentCourseAssignmentsRequest = vi.fn();
const getStudentAssignmentDetailRequest = vi.fn();
const submitStudentAssignmentRequest = vi.fn();
const uploadAssignmentSubmissionFileRequest = vi.fn();

vi.mock('../../../../services/api/authApi', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/api/authApi')>('../../../../services/api/authApi');

  return {
    ...actual,
    logoutRequest: vi.fn(),
  };
});

vi.mock('../../../../services/api/assignmentApi', () => ({
  listStudentCourseAssignmentsRequest: (...args: unknown[]) => listStudentCourseAssignmentsRequest(...args),
  getStudentAssignmentDetailRequest: (...args: unknown[]) => getStudentAssignmentDetailRequest(...args),
  submitStudentAssignmentRequest: (...args: unknown[]) => submitStudentAssignmentRequest(...args),
  uploadAssignmentSubmissionFileRequest: (...args: unknown[]) => uploadAssignmentSubmissionFileRequest(...args),
  listMyAssignmentSubmissionsRequest: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../../services/api/courseApi', () => ({
  getCourseByIdRequest: (...args: unknown[]) => getCourseByIdRequest(...args),
  listCoursesRequest: (...args: unknown[]) => listCoursesRequest(...args),
  listCourseResourcesRequest: (...args: unknown[]) => listCourseResourcesRequest(...args),
}));

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function renderWithProviders(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/courses/:courseId/assignments" element={<ClientCourseAssignmentsPage />} />
            <Route path="/courses/:courseId/assignments/:assignmentId" element={<ClientAssignmentSubmissionPage />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('Client assignment pages', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'lms.auth',
      JSON.stringify({
        user: {
          id: 'student-1',
          name: 'Student User',
          email: 'student@example.com',
          role: 'STUDENT',
          avatarUrl: null,
        },
        token: buildToken(),
        refreshToken: 'refresh-token',
      }),
    );

    listStudentCourseAssignmentsRequest.mockReset();
    getStudentAssignmentDetailRequest.mockReset();
    submitStudentAssignmentRequest.mockReset();
    uploadAssignmentSubmissionFileRequest.mockReset();
    getCourseByIdRequest.mockReset();
    listCoursesRequest.mockReset();
    listCourseResourcesRequest.mockReset();

    getCourseByIdRequest.mockResolvedValue({
      id: 'course-1',
      title: 'Advanced Computer Science',
      description: 'Course description',
      status: 'PUBLISHED',
      instructorId: 'instructor-1',
      modules: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    listCoursesRequest.mockResolvedValue({
      data: [
        {
          id: 'course-1',
          title: 'Advanced Computer Science',
          status: 'PUBLISHED',
        },
      ],
    });

    listCourseResourcesRequest.mockResolvedValue({
      materials: [],
    });
  });

  it('renders course assignments with submission status', async () => {
    listStudentCourseAssignmentsRequest.mockResolvedValue([
      {
        id: 'assignment-1',
        courseId: 'course-1',
        title: 'Build a Landing Page',
        description: 'Create the first page layout.',
        dueDate: '2026-01-10T08:00:00.000Z',
        allowLateSubmission: true,
        submissions: [],
      },
      {
        id: 'assignment-2',
        courseId: 'course-1',
        title: 'Reflection',
        description: 'Summarize the lesson.',
        dueDate: null,
        allowLateSubmission: false,
        submissions: [
          {
            id: 'submission-1',
            assignmentId: 'assignment-2',
            studentId: 'student-1',
            textContent: 'Done',
            fileUrl: null,
            fileName: null,
            status: 'RETURNED',
            isLate: false,
            submittedAt: '2026-01-09T07:00:00.000Z',
            grade: 96,
            feedback: 'Strong summary',
          },
        ],
      },
    ]);

    renderWithProviders('/courses/course-1/assignments');

    const pendingTitle = await screen.findByText('Build a Landing Page', {}, { timeout: HEAVY_UI_TEST_TIMEOUT * 2 });
    const pendingCard = pendingTitle.closest('article');
    expect(pendingCard).not.toBeNull();
    expect(within(pendingCard!).getByText('Awaiting submission')).toBeInTheDocument();
    expect(within(pendingCard!).getByRole('button', { name: 'Open assignment' })).toBeInTheDocument();

    const returnedTitle = await screen.findByText('Reflection', {}, { timeout: HEAVY_UI_TEST_TIMEOUT * 2 });
    const returnedCard = returnedTitle.closest('article');
    expect(returnedCard).not.toBeNull();
    expect(within(returnedCard!).getByText('Returned')).toBeInTheDocument();
  }, 30000);

  it('submits a text-only assignment response', async () => {
    const assignmentDetail = {
      id: 'assignment-1',
      courseId: 'course-1',
      title: 'Build a Landing Page',
      description: 'Create the first page layout.',
      dueDate: '2026-01-10T08:00:00.000Z',
      allowLateSubmission: true,
      submissions: [],
    };

    getStudentAssignmentDetailRequest.mockResolvedValue(assignmentDetail);
    submitStudentAssignmentRequest.mockResolvedValue({
      id: 'submission-1',
      assignmentId: 'assignment-1',
      studentId: 'student-1',
      textContent: 'My written response',
      fileUrl: null,
      fileName: null,
      status: 'ON_TIME',
      isLate: false,
      submittedAt: '2026-01-09T07:00:00.000Z',
    });

    renderWithProviders('/courses/course-1/assignments/assignment-1');

    expect(await screen.findByPlaceholderText('Write your answer, reflection, or project notes here.')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Write your answer, reflection, or project notes here.'), {
      target: { value: 'My written response' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit assignment' }));

    await waitFor(() => {
      expect(submitStudentAssignmentRequest).toHaveBeenCalledWith('assignment-1', {
        textContent: 'My written response',
        fileUrl: undefined,
        fileName: undefined,
      });
    });
  }, HEAVY_UI_TEST_TIMEOUT);

  it('submits a file-only assignment response', async () => {
    getStudentAssignmentDetailRequest.mockResolvedValue({
      id: 'assignment-1',
      courseId: 'course-1',
      title: 'Build a Landing Page',
      description: 'Create the first page layout.',
      dueDate: '2026-01-10T08:00:00.000Z',
      allowLateSubmission: true,
      submissions: [],
    });
    submitStudentAssignmentRequest.mockResolvedValue({
      id: 'submission-1',
      assignmentId: 'assignment-1',
      studentId: 'student-1',
      textContent: null,
      fileUrl: 'https://files.local/report.pdf',
      fileName: 'report.pdf',
      status: 'ON_TIME',
      isLate: false,
      submittedAt: '2026-01-09T07:00:00.000Z',
    });
    uploadAssignmentSubmissionFileRequest.mockResolvedValue({
      fileUrl: 'https://cdn.example.com/report.pdf',
      fileName: 'report.pdf',
      publicId: 'lms/assignment-submissions/report-1',
    });

    renderWithProviders('/courses/course-1/assignments/assignment-1');

    expect(await screen.findByText('Choose one file to attach')).toBeInTheDocument();
    const fileInput = document.getElementById('assignment-file') as HTMLInputElement;
    const file = new File(['report'], 'report.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(uploadAssignmentSubmissionFileRequest).toHaveBeenCalledWith('assignment-1', file);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit assignment' }));

    await waitFor(() => {
      expect(submitStudentAssignmentRequest).toHaveBeenCalledWith('assignment-1', {
        textContent: undefined,
        fileUrl: 'https://cdn.example.com/report.pdf',
        fileName: 'report.pdf',
      });
    });
  }, HEAVY_UI_TEST_TIMEOUT);

  it('shows an upload error and blocks submit when the Cloudinary upload fails', async () => {
    getStudentAssignmentDetailRequest.mockResolvedValue({
      id: 'assignment-1',
      courseId: 'course-1',
      title: 'Build a Landing Page',
      description: 'Create the first page layout.',
      dueDate: '2026-01-10T08:00:00.000Z',
      allowLateSubmission: true,
      submissions: [],
    });
    uploadAssignmentSubmissionFileRequest.mockRejectedValue(new Error('Failed to upload assignment file.'));

    renderWithProviders('/courses/course-1/assignments/assignment-1');

    expect(await screen.findByText('Choose one file to attach')).toBeInTheDocument();
    const fileInput = document.getElementById('assignment-file') as HTMLInputElement;
    const file = new File(['report'], 'report.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    expect(await screen.findByText('Failed to upload assignment file.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit assignment' })).toBeDisabled();
  });

  it('renders graded and returned details in the assignment workspace', async () => {
    getStudentAssignmentDetailRequest.mockResolvedValue({
      id: 'assignment-1',
      courseId: 'course-1',
      title: 'Build a Landing Page',
      description: 'Create the first page layout.',
      dueDate: '2026-01-10T08:00:00.000Z',
      allowLateSubmission: true,
      submissions: [
        {
          id: 'submission-1',
          assignmentId: 'assignment-1',
          studentId: 'student-1',
          textContent: 'My final answer',
          fileUrl: null,
          fileName: null,
          status: 'RETURNED',
          isLate: false,
          submittedAt: '2026-01-09T07:00:00.000Z',
          grade: 91,
          feedback: 'Polish the spacing in the hero section.',
        },
      ],
    });

    renderWithProviders('/courses/course-1/assignments/assignment-1');

    expect(await screen.findByText('Grade: 91%')).toBeInTheDocument();
    expect(screen.getByText('Feedback returned')).toBeInTheDocument();
    expect(screen.getByText('Grade: 91%')).toBeInTheDocument();
    expect(screen.getByText('Feedback: Polish the spacing in the hero section.')).toBeInTheDocument();
  });

  it('renders a graded late submission with attachment details', async () => {
    getStudentAssignmentDetailRequest.mockResolvedValue({
      id: 'assignment-1',
      courseId: 'course-1',
      title: 'Build a Landing Page',
      description: 'Create the first page layout.',
      dueDate: '2026-01-10T08:00:00.000Z',
      allowLateSubmission: true,
      submissions: [
        {
          id: 'submission-2',
          assignmentId: 'assignment-1',
          studentId: 'student-1',
          textContent: 'Updated submission after review.',
          fileUrl: 'https://cdn.example.com/revision.pdf',
          fileName: 'revision.pdf',
          status: 'GRADED',
          isLate: true,
          submittedAt: '2026-01-11T07:00:00.000Z',
          grade: 78,
          feedback: 'Good recovery, but polish the footer.',
        },
      ],
    });

    renderWithProviders('/courses/course-1/assignments/assignment-1');

    expect(await screen.findByText('Submission graded')).toBeInTheDocument();
    expect(screen.getByText('Submission result')).toBeInTheDocument();
    expect(screen.getAllByText('Graded 78%').length).toBeGreaterThan(0);
    expect(screen.getByText('Submitted late')).toBeInTheDocument();
    expect(screen.getByText('Updated submission after review.')).toBeInTheDocument();
    expect(screen.getByText('revision.pdf')).toBeInTheDocument();
  });
});

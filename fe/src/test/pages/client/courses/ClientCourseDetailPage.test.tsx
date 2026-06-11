import { cleanup, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithQueryClient } from '../../../utils/renderWithQueryClient';
import { ClientCourseDetailPage } from '../../../../pages/client/courses/ClientCourseDetailPage';

const getCourseByIdRequest = vi.fn();
const listCourseResourcesRequest = vi.fn();
const listPublishedCourseModulesRequest = vi.fn();
const listStudentCourseAssignmentsRequest = vi.fn();
const listStudentCourseQuizzesRequest = vi.fn();
const getMyCourseProgress = vi.fn();

vi.mock('../../../../components/client-layout', () => ({
  ClientLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ClientPageContainer: ({ title, subtitle, actions, children }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actions}
      {children}
    </div>
  ),
}));

vi.mock('../../../../context/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'student-1',
      name: 'Student User',
      email: 'student@example.com',
      role: 'STUDENT',
      avatarUrl: null,
    },
  }),
}));

vi.mock('../../../../services/api/courseApi', () => ({
  getCourseByIdRequest: (...args: unknown[]) => getCourseByIdRequest(...args),
  listCourseResourcesRequest: (...args: unknown[]) => listCourseResourcesRequest(...args),
  listPublishedCourseModulesRequest: (...args: unknown[]) => listPublishedCourseModulesRequest(...args),
}));

vi.mock('../../../../services/api/assignmentApi', () => ({
  listStudentCourseAssignmentsRequest: (...args: unknown[]) => listStudentCourseAssignmentsRequest(...args),
}));

vi.mock('../../../../services/api/quizApi', () => ({
  listStudentCourseQuizzesRequest: (...args: unknown[]) => listStudentCourseQuizzesRequest(...args),
}));

vi.mock('../../../../services/api/progressService', () => ({
  progressService: {
    getMyCourseProgress: (...args: unknown[]) => getMyCourseProgress(...args),
  },
}));

function renderPage(initialEntry = '/courses/course-1') {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/courses/:courseId" element={<ClientCourseDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ClientCourseDetailPage state system', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    getCourseByIdRequest.mockReset();
    listCourseResourcesRequest.mockReset();
    listPublishedCourseModulesRequest.mockReset();
    listStudentCourseAssignmentsRequest.mockReset();
    listStudentCourseQuizzesRequest.mockReset();
    getMyCourseProgress.mockReset();

    listPublishedCourseModulesRequest.mockResolvedValue([]);
    listStudentCourseAssignmentsRequest.mockResolvedValue([]);
    listStudentCourseQuizzesRequest.mockResolvedValue([]);
    listCourseResourcesRequest.mockResolvedValue({ materials: [] });
    getMyCourseProgress.mockResolvedValue({
      percentage: 0,
      completedLessons: 0,
      totalLessons: 0,
      lessons: [],
    });
  });

  it('renders the structured loading skeleton while the course loads', async () => {
    getCourseByIdRequest.mockReturnValue(new Promise(() => undefined));
    listPublishedCourseModulesRequest.mockReturnValue(new Promise(() => undefined));
    listStudentCourseAssignmentsRequest.mockReturnValue(new Promise(() => undefined));
    listStudentCourseQuizzesRequest.mockReturnValue(new Promise(() => undefined));
    listCourseResourcesRequest.mockReturnValue(new Promise(() => undefined));
    getMyCourseProgress.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByLabelText('Loading course detail')).toBeInTheDocument();
  });

  it('renders the page-level error state without exposing raw backend errors', async () => {
    getCourseByIdRequest.mockRejectedValue(new Error('database exploded'));

    renderPage();

    expect(await screen.findByText('Unable to load course', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Course details could not be loaded right now.')).toBeInTheDocument();
    expect(screen.queryByText('database exploded')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to courses' })).toBeInTheDocument();
  });

  it('renders graceful partial-data states when instructor, curriculum, assessments, resources, and progress are missing', async () => {
    getCourseByIdRequest.mockResolvedValue({
      id: 'course-1',
      title: 'React Basics',
      description: 'Learn component thinking.',
      status: 'PUBLISHED',
      instructorId: 'instructor-1',
      instructor: null,
      modules: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    listPublishedCourseModulesRequest.mockResolvedValue([]);
    listStudentCourseAssignmentsRequest.mockResolvedValue([]);
    listStudentCourseQuizzesRequest.mockResolvedValue([]);
    listCourseResourcesRequest.mockResolvedValue({ materials: [] });
    getMyCourseProgress.mockRejectedValue(new Error('progress unavailable'));

    renderPage();

    expect((await screen.findAllByText('React Basics')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Instructor unavailable')).toBeInTheDocument();
    expect(screen.getByText('No modules available yet.')).toBeInTheDocument();
    expect(screen.getByText('No assignments for this course yet.')).toBeInTheDocument();
    expect(screen.getByText('No quizzes for this course yet.')).toBeInTheDocument();
    expect(screen.getByText('Progress appears here when student progress data is available.')).toBeInTheDocument();
  });
});

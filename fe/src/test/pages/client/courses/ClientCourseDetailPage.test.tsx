import { cleanup, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithQueryClient } from '../../../utils/renderWithQueryClient';
import { ClientCourseDetailPage } from '../../../../pages/client/courses/ClientCourseDetailPage';

const listCoursesRequest = vi.fn();
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

vi.mock('../../../../context/AuthContext', () => ({
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
  listCoursesRequest: (...args: unknown[]) => listCoursesRequest(...args),
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
    listCoursesRequest.mockReset();
    listCourseResourcesRequest.mockReset();
    listPublishedCourseModulesRequest.mockReset();
    listStudentCourseAssignmentsRequest.mockReset();
    listStudentCourseQuizzesRequest.mockReset();
    getMyCourseProgress.mockReset();
  });

  it('renders the structured loading skeleton while the course loads', async () => {
    listCoursesRequest.mockReturnValue(new Promise(() => undefined));
    listPublishedCourseModulesRequest.mockReturnValue(new Promise(() => undefined));
    listStudentCourseAssignmentsRequest.mockReturnValue(new Promise(() => undefined));
    listStudentCourseQuizzesRequest.mockReturnValue(new Promise(() => undefined));
    listCourseResourcesRequest.mockReturnValue(new Promise(() => undefined));
    getMyCourseProgress.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByLabelText('Loading course detail')).toBeInTheDocument();
  });

  it('renders the page-level error state without exposing raw backend errors', async () => {
    listCoursesRequest.mockRejectedValue(new Error('database exploded'));

    renderPage();

    expect(await screen.findByText('Course unavailable')).toBeInTheDocument();
    expect(screen.getByText("We couldn't load this course right now.")).toBeInTheDocument();
    expect(screen.queryByText('database exploded')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Back to Catalog' })).toHaveLength(2);
  });

  it('renders graceful partial-data states when instructor, curriculum, assessments, resources, and progress are missing', async () => {
    listCoursesRequest.mockResolvedValue({
      data: [
        {
          id: 'course-1',
          title: 'React Basics',
          description: 'Learn component thinking.',
          status: 'PUBLISHED',
          instructorId: 'instructor-1',
          instructor: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    });
    listPublishedCourseModulesRequest.mockResolvedValue([]);
    listStudentCourseAssignmentsRequest.mockResolvedValue([]);
    listStudentCourseQuizzesRequest.mockResolvedValue([]);
    listCourseResourcesRequest.mockResolvedValue({ materials: [] });
    getMyCourseProgress.mockRejectedValue(new Error('progress unavailable'));

    renderPage();

    expect(await screen.findByText('React Basics')).toBeInTheDocument();
    expect(await screen.findByText('Instructor information unavailable')).toBeInTheDocument();
    expect(screen.getByText('Curriculum coming soon.')).toBeInTheDocument();
    expect(screen.getByText('No assessments available.')).toBeInTheDocument();
    expect(screen.getAllByText('Course resources are available through your learning tools.').length).toBeGreaterThan(0);
    expect(await screen.findByText('Progress unavailable')).toBeInTheDocument();
  });
});

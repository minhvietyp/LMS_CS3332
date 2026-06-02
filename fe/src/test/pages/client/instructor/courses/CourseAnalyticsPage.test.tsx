import { cleanup, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { renderWithQueryClient } from '../../../../utils/renderWithQueryClient';
import { CourseAnalyticsPage } from '../../../../../pages/client/instructor/courses/CourseAnalyticsPage';
import { listCourseAssignmentsRequest } from '../../../../../services/api/assignmentApi';
import { getCourseByIdRequest } from '../../../../../services/api/courseApi';
import { progressService } from '../../../../../services/api/progressService';
import { listCourseQuizzesRequest } from '../../../../../services/api/quizApi';

vi.mock('../../../../../components/client-layout', () => ({
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

vi.mock('../../../../../services/api/courseApi', () => ({
  getCourseByIdRequest: vi.fn(),
}));

vi.mock('../../../../../services/api/assignmentApi', () => ({
  listCourseAssignmentsRequest: vi.fn(),
}));

vi.mock('../../../../../services/api/quizApi', () => ({
  listCourseQuizzesRequest: vi.fn(),
}));

vi.mock('../../../../../services/api/progressService', async () => {
  const actual = await vi.importActual<typeof import('../../../../../services/api/progressService')>('../../../../../services/api/progressService');
  return {
    ...actual,
    progressService: {
      ...actual.progressService,
      getInstructorCourseProgress: vi.fn(),
    },
  };
});

const getCourseByIdRequestMock = vi.mocked(getCourseByIdRequest);
const listCourseAssignmentsRequestMock = vi.mocked(listCourseAssignmentsRequest);
const listCourseQuizzesRequestMock = vi.mocked(listCourseQuizzesRequest);
const getInstructorCourseProgressMock = vi.mocked(progressService.getInstructorCourseProgress);

describe('CourseAnalyticsPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    getCourseByIdRequestMock.mockReset();
    listCourseAssignmentsRequestMock.mockReset();
    listCourseQuizzesRequestMock.mockReset();
    getInstructorCourseProgressMock.mockReset();
  });

  it('renders course analytics summary and assessment mix', async () => {
    getCourseByIdRequestMock.mockResolvedValue({
      id: 'course-1',
      title: 'React Basics',
      modules: [
        { id: 'module-1', lessons: [{ id: 'lesson-1' }, { id: 'lesson-2' }] },
      ],
    } as any);
    getInstructorCourseProgressMock.mockResolvedValue({
      course: {
        totalStudents: 12,
        averageWeightedProgress: 74,
      },
      students: [],
    } as any);
    listCourseAssignmentsRequestMock.mockResolvedValue([
      { id: 'assignment-1', title: 'Landing Page', allowLateSubmission: true } as any,
    ]);
    listCourseQuizzesRequestMock.mockResolvedValue([
      { id: 'quiz-1', title: 'Module 1 Quiz', passingScore: 70, _count: { attempts: 6 }, attempts: [], questions: [] } as any,
    ]);

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/courses/course-1/analytics']}>
        <Routes>
          <Route path="/courses/:courseId/analytics" element={<CourseAnalyticsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Course Analytics')).toBeInTheDocument();

    await waitFor(() => {
      expect(getInstructorCourseProgressMock).toHaveBeenCalledWith(
        'course-1',
        expect.objectContaining({ sortBy: 'progress' }),
      );
    });

    expect(await screen.findByText('Landing Page')).toBeInTheDocument();
    expect(screen.getByText('Module 1 Quiz')).toBeInTheDocument();
  });
});

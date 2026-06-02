import { cleanup, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQueryClient } from '../../../utils/renderWithQueryClient';
import { AssignmentReportPage } from '../../../../pages/shared/reports/AssignmentReportPage';
import {
  listAssignmentSubmissionsRequest,
  listCourseAssignmentsRequest,
} from '../../../../services/api/assignmentApi';
import { listCoursesRequest } from '../../../../services/api/courseApi';

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

vi.mock('../../../../services/api/courseApi', () => ({
  listCoursesRequest: vi.fn(),
}));

vi.mock('../../../../services/api/assignmentApi', () => ({
  listCourseAssignmentsRequest: vi.fn(),
  listAssignmentSubmissionsRequest: vi.fn(),
}));

const listCoursesRequestMock = vi.mocked(listCoursesRequest);
const listCourseAssignmentsRequestMock = vi.mocked(listCourseAssignmentsRequest);
const listAssignmentSubmissionsRequestMock = vi.mocked(listAssignmentSubmissionsRequest);

describe('AssignmentReportPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    listCoursesRequestMock.mockReset();
    listCourseAssignmentsRequestMock.mockReset();
    listAssignmentSubmissionsRequestMock.mockReset();
  });

  it('renders assignment report summaries and submissions', async () => {
    listCoursesRequestMock.mockResolvedValue({
      data: [{ id: 'course-1', title: 'React Basics' } as any],
    });
    listCourseAssignmentsRequestMock.mockResolvedValue([
      { id: 'assignment-1', title: 'Landing Page', allowLateSubmission: true } as any,
    ]);
    listAssignmentSubmissionsRequestMock.mockResolvedValue([
      {
        id: 'submission-1',
        status: 'GRADED',
        grade: 92,
        textContent: 'My answer',
        student: { name: 'Student One', email: 'one@example.com' },
      } as any,
    ]);

    renderWithQueryClient(
      <MemoryRouter>
        <AssignmentReportPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Assignment Reports')).toBeInTheDocument();

    await waitFor(() => {
      expect(listCourseAssignmentsRequestMock).toHaveBeenCalledWith('course-1');
      expect(listAssignmentSubmissionsRequestMock).toHaveBeenCalledWith('assignment-1');
    });

    expect(await screen.findByText('Student One')).toBeInTheDocument();
    expect(screen.getByText('GRADED')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  }, 10000);
});

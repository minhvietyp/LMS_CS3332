import { cleanup, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQueryClient } from '../../../utils/renderWithQueryClient';
import { InstructorActivityReportPage } from '../../../../pages/shared/reports/InstructorActivityReportPage';
import { listCoursesRequest } from '../../../../services/api/courseApi';
import { progressService } from '../../../../services/api/progressService';

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

vi.mock('../../../../services/api/progressService', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/api/progressService')>('../../../../services/api/progressService');
  return {
    ...actual,
    progressService: {
      ...actual.progressService,
      getInstructorCourseProgress: vi.fn(),
    },
  };
});

const listCoursesRequestMock = vi.mocked(listCoursesRequest);
const getInstructorCourseProgressMock = vi.mocked(progressService.getInstructorCourseProgress);
type ListCoursesResult = Awaited<ReturnType<typeof listCoursesRequest>>;
type InstructorCourseProgressResult = Awaited<ReturnType<typeof progressService.getInstructorCourseProgress>>;

describe('InstructorActivityReportPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    listCoursesRequestMock.mockReset();
    getInstructorCourseProgressMock.mockReset();
  });

  it('renders instructor activity metrics and student rows', async () => {
    listCoursesRequestMock.mockResolvedValue({
      data: [{ id: 'course-1', title: 'React Basics' }],
    } as ListCoursesResult);
    getInstructorCourseProgressMock.mockResolvedValue({
      course: {
        totalStudents: 10,
        activeStudents: 6,
        completedStudents: 3,
        averageWeightedProgress: 74,
      },
      students: [
        {
          studentId: 'student-1',
          studentName: 'Student One',
          studentEmail: 'one@example.com',
          enrollmentStatus: 'ACTIVE',
          weightedPercentage: 63,
          lastProgressAt: '2026-01-10T00:00:00.000Z',
        },
      ],
    } as InstructorCourseProgressResult);

    renderWithQueryClient(
      <MemoryRouter>
        <InstructorActivityReportPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Instructor Activity Report')).toBeInTheDocument();

    await waitFor(() => {
      expect(getInstructorCourseProgressMock).toHaveBeenCalledWith(
        'course-1',
        expect.objectContaining({ sortBy: 'lastActivity' }),
      );
    });

    expect(await screen.findByText('Student One')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  }, 10000);
});

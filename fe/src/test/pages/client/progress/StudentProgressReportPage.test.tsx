import { cleanup, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQueryClient } from '../../../utils/renderWithQueryClient';
import { StudentProgressReportPage } from '../../../../pages/client/progress/StudentProgressReportPage';
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

vi.mock('../../../../services/api/progressService', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/api/progressService')>('../../../../services/api/progressService');
  return {
    ...actual,
    progressService: {
      ...actual.progressService,
      getOverview: vi.fn(),
      getMyProgressHistory: vi.fn(),
    },
  };
});

const getOverviewMock = vi.mocked(progressService.getOverview);
const getMyProgressHistoryMock = vi.mocked(progressService.getMyProgressHistory);

describe('StudentProgressReportPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    getOverviewMock.mockReset();
    getMyProgressHistoryMock.mockReset();
  });

  it('renders student progress summary and history rows', async () => {
    getOverviewMock.mockResolvedValue({
      summary: {
        totalCourses: 4,
        completedCourses: 1,
        activeCourses: 3,
        droppedCourses: 0,
        overallProgress: 68,
        lastActivityAt: '2026-01-10T00:00:00.000Z',
      },
      courses: [],
    });
    getMyProgressHistoryMock.mockResolvedValue({
      items: [
        {
          id: 'history-1',
          courseTitle: 'React Basics',
          lessonTitle: 'Hooks',
          actionType: 'LESSON_COMPLETED',
          createdAt: '2026-01-10T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    } as any);

    renderWithQueryClient(
      <MemoryRouter>
        <StudentProgressReportPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Student Progress Report')).toBeInTheDocument();

    await waitFor(() => {
      expect(getOverviewMock).toHaveBeenCalled();
      expect(getMyProgressHistoryMock).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
    });

    expect(await screen.findByText('React Basics')).toBeInTheDocument();
    expect(screen.getByText('LESSON_COMPLETED')).toBeInTheDocument();
  });
});

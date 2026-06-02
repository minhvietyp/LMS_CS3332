import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAnalyticsPage } from '../../../../pages/admin/analytics/AdminAnalyticsPage';

const useAdminProgressOverviewMock = vi.fn();
const useAdminCourseProgressListMock = vi.fn();

vi.mock('../../../../components/admin-layout/layout/AdminPageContainer', () => ({
  AdminPageContainer: ({ title, subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

vi.mock('../../../../hooks/useProgressOverview', () => ({
  useAdminProgressOverview: (...args: unknown[]) => useAdminProgressOverviewMock(...args),
  useAdminCourseProgressList: (...args: unknown[]) => useAdminCourseProgressListMock(...args),
}));

describe('AdminAnalyticsPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useAdminProgressOverviewMock.mockReset();
    useAdminCourseProgressListMock.mockReset();
    useAdminProgressOverviewMock.mockReturnValue({
      data: {
        summary: {
          totalCourses: 8,
          totalStudents: 120,
          averageWeightedProgress: 72,
          averageCompletionRate: 58,
        },
      },
      isLoading: false,
    });
    useAdminCourseProgressListMock.mockReturnValue({
      data: {
        courses: [
          {
            courseId: 'course-1',
            courseTitle: 'React Basics',
            instructorName: 'Instructor A',
            totalStudents: 24,
            averageWeightedProgress: 75,
          },
        ],
      },
      isLoading: false,
    });
  });

  it('renders admin analytics summary and top course table', async () => {
    render(<AdminAnalyticsPage />);

    expect(await screen.findByText('Admin Analytics')).toBeInTheDocument();
    expect(screen.getByText('React Basics')).toBeInTheDocument();
    expect(screen.getByText('Instructor A')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
  }, 10000);
});

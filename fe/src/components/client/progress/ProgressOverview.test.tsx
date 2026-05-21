import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressOverview } from './ProgressOverview';

const refetch = vi.fn();

const mockOverviewState = {
  data: {
    summary: {
      totalCourses: 2,
      activeCourses: 1,
      completedCourses: 1,
      droppedCourses: 0,
      overallProgress: 75,
      lastActivityAt: '2026-01-15T00:00:00.000Z',
    },
    courses: [
      {
        courseId: 'course-1',
        courseTitle: 'React Basics',
        courseThumbnail: null,
        instructorName: 'Instructor A',
        enrollmentStatus: 'ACTIVE',
        enrolledAt: '2026-01-01T00:00:00.000Z',
        lessonsCompleted: 2,
        totalLessons: 4,
        percentage: 50,
        weightedPercentage: 75,
        totalWeight: 8,
        completedWeight: 6,
      },
    ],
  },
  isLoading: false,
  error: null,
  refetch,
};

vi.mock('../../../hooks/useProgressOverview', () => ({
  useProgressOverview: () => mockOverviewState,
}));

describe('ProgressOverview', () => {
  beforeEach(() => {
    mockOverviewState.data = {
      summary: {
        totalCourses: 2,
        activeCourses: 1,
        completedCourses: 1,
        droppedCourses: 0,
        overallProgress: 75,
        lastActivityAt: '2026-01-15T00:00:00.000Z',
      },
      courses: [
        {
          courseId: 'course-1',
          courseTitle: 'React Basics',
          courseThumbnail: null,
          instructorName: 'Instructor A',
          enrollmentStatus: 'ACTIVE',
          enrolledAt: '2026-01-01T00:00:00.000Z',
          lessonsCompleted: 2,
          totalLessons: 4,
          percentage: 50,
          weightedPercentage: 75,
          totalWeight: 8,
          completedWeight: 6,
        },
      ],
    };
    mockOverviewState.isLoading = false;
    mockOverviewState.error = null;
    mockOverviewState.refetch = refetch;
  });

  afterEach(() => {
    refetch.mockClear();
  });

  it('renders student progress overview summary and course card', async () => {
    render(<ProgressOverview />);

    expect(await screen.findByText('Total Courses')).toBeInTheDocument();
    expect(screen.getByText('My Courses')).toBeInTheDocument();
    expect(await screen.findByText('React Basics')).toBeInTheDocument();
    expect(screen.getByText('2 of 4 lessons completed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  }, 15000);

  it('renders loading state', () => {
    mockOverviewState.data = undefined as any;
    mockOverviewState.isLoading = true;

    render(<ProgressOverview />);

    expect(screen.getByText('Loading your progress...')).toBeInTheDocument();
  });
});

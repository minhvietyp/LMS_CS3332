import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressHistoryList } from './ProgressHistoryList';

const mockHistoryState = {
  data: {
    items: [
      {
        id: 'history-1',
        studentId: 'student-1',
        courseId: 'course-1',
        courseTitle: 'React Basics',
        lessonId: 'lesson-1',
        lessonTitle: 'Introduction',
        fromState: 'IN_PROGRESS',
        toState: 'COMPLETED',
        actionType: 'MARK_COMPLETE',
        createdAt: '2026-01-05T00:00:00.000Z',
      },
    ],
    pagination: {
      page: 1,
      pageSize: 8,
      total: 1,
      totalPages: 1,
    },
  },
  isLoading: false,
  error: null,
};

vi.mock('../../../hooks/useProgressOverview', () => ({
  useMyProgressHistory: () => mockHistoryState,
}));

describe('ProgressHistoryList', () => {
  beforeEach(() => {
    mockHistoryState.isLoading = false;
    mockHistoryState.error = null;
  });

  it('renders progress history items', () => {
    render(<ProgressHistoryList />);

    expect(screen.getByText('React Basics')).toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('MARK COMPLETE')).toBeInTheDocument();
    expect(screen.getByText(/IN_PROGRESS -> COMPLETED/i)).toBeInTheDocument();
  });
});

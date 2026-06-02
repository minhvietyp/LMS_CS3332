import { cleanup, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { renderWithQueryClient } from '../../../utils/renderWithQueryClient';
import { HEAVY_UI_TEST_TIMEOUT } from '../../../utils/testTimeouts';
import { QuizReportPage } from '../../../../pages/shared/reports/QuizReportPage';
import { listCoursesRequest } from '../../../../services/api/courseApi';
import { listCourseQuizzesRequest } from '../../../../services/api/quizApi';

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

vi.mock('../../../../services/api/quizApi', () => ({
  listCourseQuizzesRequest: vi.fn(),
}));

const listCoursesRequestMock = vi.mocked(listCoursesRequest);
const listCourseQuizzesRequestMock = vi.mocked(listCourseQuizzesRequest);

describe('QuizReportPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    listCoursesRequestMock.mockReset();
    listCourseQuizzesRequestMock.mockReset();
  });

  it('renders quiz report summaries and quiz table', async () => {
    listCoursesRequestMock.mockResolvedValue({
      data: [{ id: 'course-1', title: 'React Basics' } as any],
    });
    listCourseQuizzesRequestMock.mockResolvedValue([
      {
        id: 'quiz-1',
        title: 'Module 1 Quiz',
        questions: [{ id: 'q-1' }, { id: 'q-2' }],
        passingScore: 70,
        isPublished: true,
        _count: { attempts: 6 },
      } as any,
    ]);

    renderWithQueryClient(
      <MemoryRouter>
        <QuizReportPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Quiz Reports')).toBeInTheDocument();
    expect(await screen.findByText('Module 1 Quiz', undefined, { timeout: HEAVY_UI_TEST_TIMEOUT })).toBeInTheDocument();

    await waitFor(() => {
      expect(listCourseQuizzesRequestMock).toHaveBeenCalledWith('course-1');
    }, { timeout: HEAVY_UI_TEST_TIMEOUT });

    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  }, HEAVY_UI_TEST_TIMEOUT);
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../context/AuthContext';
import { ClientLessonViewerPage } from '../../../../pages/client/learning/ClientLessonViewerPage';
import type { ReactNode } from 'react';

const getCourseByIdRequest = vi.fn();
const listCoursesRequest = vi.fn();
const listPublishedCourseModulesRequest = vi.fn();
const listCourseResourcesRequest = vi.fn();
const getMyCourseProgress = vi.fn();
const setLessonState = vi.fn();
const markLessonComplete = vi.fn();

vi.mock('../../../../services/api/courseApi', () => ({
  getCourseByIdRequest: (...args: unknown[]) => getCourseByIdRequest(...args),
  listCoursesRequest: (...args: unknown[]) => listCoursesRequest(...args),
  listPublishedCourseModulesRequest: (...args: unknown[]) => listPublishedCourseModulesRequest(...args),
  listCourseResourcesRequest: (...args: unknown[]) => listCourseResourcesRequest(...args),
}));

vi.mock('../../../../services/api/progressService', () => ({
  progressService: {
    getMyCourseProgress: (...args: unknown[]) => getMyCourseProgress(...args),
    setLessonState: (...args: unknown[]) => setLessonState(...args),
    markLessonComplete: (...args: unknown[]) => markLessonComplete(...args),
  },
}));

vi.mock('../../../../components/client-layout', () => ({
  ClientLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ClientPageContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function renderPage(initialEntry = '/courses/course-1/learn/lesson-1') {
  localStorage.clear();
  localStorage.setItem(
    'lms.auth',
    JSON.stringify({
      user: {
        id: 'student-1',
        name: 'Student User',
        email: 'student@example.com',
        role: 'STUDENT',
      },
      token: buildToken(),
      refreshToken: 'refresh-token',
    }),
  );

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/courses/:courseId/learn/:lessonId" element={<ClientLessonViewerPage />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ClientLessonViewerPage', () => {
  beforeEach(() => {
    getCourseByIdRequest.mockReset();
    listCoursesRequest.mockReset();
    listPublishedCourseModulesRequest.mockReset();
    listCourseResourcesRequest.mockReset();
    getMyCourseProgress.mockReset();
    setLessonState.mockReset();
    markLessonComplete.mockReset();

    getCourseByIdRequest.mockResolvedValue({
      id: 'course-1',
      title: 'React Foundations',
      description: 'Learn the fundamentals.',
      status: 'PUBLISHED',
      instructorId: 'instructor-1',
      modules: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    listCoursesRequest.mockResolvedValue({
      data: [
        {
          id: 'course-1',
          title: 'React Foundations',
          status: 'PUBLISHED',
        },
      ],
    });

    listPublishedCourseModulesRequest.mockResolvedValue([
      {
        id: 'module-1',
        courseId: 'course-1',
        title: 'Getting Started',
        orderIndex: 0,
        lessons: [
          {
            id: 'lesson-1',
            moduleId: 'module-1',
            title: 'Intro to React',
            orderIndex: 0,
            isPublished: true,
            videoUrl: 'https://videos.example.com/react-intro.mp4',
          },
          {
            id: 'lesson-2',
            moduleId: 'module-1',
            title: 'Components',
            orderIndex: 1,
            isPublished: true,
            videoUrl: null,
            materials: [],
          },
        ],
      },
    ]);
    listCourseResourcesRequest.mockResolvedValue({
      materials: [
        {
          id: 'material-1',
          lessonId: 'lesson-1',
          lessonTitle: 'Intro to React',
          moduleId: 'module-1',
          moduleTitle: 'Getting Started',
          title: 'Lesson notes',
          type: 'pdf',
          url: 'https://docs.example.com/react-intro.pdf',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });

    getMyCourseProgress.mockResolvedValue({
      courseId: 'course-1',
      studentId: 'student-1',
      totalLessons: 2,
      completedLessons: 0,
      percentage: 0,
      totalWeight: 2,
      completedWeight: 0,
      weightedPercentage: 0,
      enrollmentStatus: 'ACTIVE',
      lastProgressAt: null,
      lessons: [],
    });

    setLessonState.mockResolvedValue({ id: 'progress-1' });
    markLessonComplete.mockResolvedValue({ id: 'progress-1', isCompleted: true });
  });

  it('renders the lesson workspace and marks first view as in progress', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Intro to React' })).toBeInTheDocument();
    expect(screen.getByText('Course progress')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Components' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lesson notes' })).toBeInTheDocument();

    await waitFor(() => {
      expect(setLessonState).toHaveBeenCalledWith('lesson-1', 'IN_PROGRESS');
    });
  });

  it('marks the lesson complete and allows navigation to the next lesson', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: 'Mark complete' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark complete' }));

    await waitFor(() => {
      expect(markLessonComplete).toHaveBeenCalledWith('lesson-1', true);
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Next lesson' })[0]);
    expect(await screen.findByRole('heading', { name: 'Components' })).toBeInTheDocument();
  });
});

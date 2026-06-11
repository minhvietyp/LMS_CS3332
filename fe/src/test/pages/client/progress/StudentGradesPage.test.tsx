import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../context/AuthContext';
import { StudentGradesPage } from '../../../../pages/client/progress/StudentGradesPage';

const getOverview = vi.fn();
const listStudentCourseAssignmentsRequest = vi.fn();
const listStudentCourseQuizzesRequest = vi.fn();
const listMyQuizAttemptsRequest = vi.fn();

vi.mock('../../../../services/api/progressService', () => ({
  progressService: {
    getOverview: (...args: unknown[]) => getOverview(...args),
  },
}));

vi.mock('../../../../services/api/assignmentApi', () => ({
  listStudentCourseAssignmentsRequest: (...args: unknown[]) => listStudentCourseAssignmentsRequest(...args),
}));

vi.mock('../../../../services/api/quizApi', () => ({
  listStudentCourseQuizzesRequest: (...args: unknown[]) => listStudentCourseQuizzesRequest(...args),
  listMyQuizAttemptsRequest: (...args: unknown[]) => listMyQuizAttemptsRequest(...args),
}));

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function renderPage() {
  localStorage.clear();
  localStorage.setItem(
    'lms.auth',
    JSON.stringify({
      user: { id: 'student-1', name: 'Student', email: 'student@example.com', role: 'STUDENT' },
      token: buildToken(),
      refreshToken: 'refresh-token',
    }),
  );

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <MemoryRouter initialEntries={['/student/grades']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StudentGradesPage />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('StudentGradesPage', () => {
  beforeEach(() => {
    getOverview.mockReset();
    listStudentCourseAssignmentsRequest.mockReset();
    listStudentCourseQuizzesRequest.mockReset();
    listMyQuizAttemptsRequest.mockReset();

    getOverview.mockResolvedValue({
      summary: {
        totalCourses: 1,
        activeCourses: 1,
        completedCourses: 0,
        droppedCourses: 0,
        overallProgress: 50,
        lastActivityAt: null,
      },
      courses: [
        {
          courseId: 'course-1',
          courseTitle: 'React Foundations',
          courseThumbnail: null,
          instructorName: 'Alex Tran',
          enrollmentStatus: 'ACTIVE',
          enrolledAt: '2026-01-01T00:00:00.000Z',
          lessonsCompleted: 3,
          totalLessons: 6,
          percentage: 50,
          weightedPercentage: 50,
          totalWeight: 6,
          completedWeight: 3,
        },
      ],
    });

    listStudentCourseAssignmentsRequest.mockResolvedValue([
      {
        id: 'assignment-1',
        courseId: 'course-1',
        title: 'Landing page project',
        description: 'Build the public home page.',
        dueDate: '2026-12-10T00:00:00.000Z',
        allowLateSubmission: true,
        submissions: [
          {
            id: 'submission-1',
            assignmentId: 'assignment-1',
            studentId: 'student-1',
            fileName: 'landing-page.pdf',
            fileUrl: 'https://cdn.example.com/landing-page.pdf',
            textContent: null,
            status: 'GRADED',
            isLate: false,
            submittedAt: '2026-01-10T00:00:00.000Z',
            grade: 92,
            feedback: 'Strong work',
          },
        ],
      },
    ]);

    listStudentCourseQuizzesRequest.mockResolvedValue([
      {
        id: 'quiz-1',
        courseId: 'course-1',
        title: 'React Quiz',
        description: 'Basics',
        passingScore: 70,
        maxAttempts: 3,
        isPublished: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        questionCount: 5,
        attemptsUsed: 1,
        attemptsRemaining: 2,
      },
    ]);

    listMyQuizAttemptsRequest.mockResolvedValue([
      {
        id: 'attempt-1',
        quizId: 'quiz-1',
        studentId: 'student-1',
        attemptNumber: 1,
        status: 'PASSED',
        score: 88,
        isPassed: true,
        submittedAt: '2026-01-11T00:00:00.000Z',
      },
    ]);
  });

  it('renders assignment and quiz grades from enrolled courses', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Grades' })).toBeInTheDocument();
    expect(await screen.findByText('Landing page project')).toBeInTheDocument();
    expect(await screen.findByText('React Quiz')).toBeInTheDocument();
    expect(await screen.findByText('92%')).toBeInTheDocument();
    expect(await screen.findByText('88%')).toBeInTheDocument();
  }, 10000);
});

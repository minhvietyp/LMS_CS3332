import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../components/context/AuthContext';
import { ClientCourseQuizzesPage } from './ClientCourseQuizzesPage';
import { ClientQuizAttemptPage } from './ClientQuizAttemptPage';
import { ClientQuizResultPage } from './ClientQuizResultPage';

const listStudentCourseQuizzesRequest = vi.fn();
const getStudentQuizDetailRequest = vi.fn();
const listMyQuizAttemptsRequest = vi.fn();
const startQuizAttemptRequest = vi.fn();
const submitQuizAttemptRequest = vi.fn();
const getQuizAttemptResultRequest = vi.fn();

vi.mock('../services/authApi', async () => {
  const actual = await vi.importActual<typeof import('../services/authApi')>('../services/authApi');

  return {
    ...actual,
    logoutRequest: vi.fn(),
  };
});

vi.mock('../services/quizApi', () => ({
  listStudentCourseQuizzesRequest: (...args: unknown[]) => listStudentCourseQuizzesRequest(...args),
  getStudentQuizDetailRequest: (...args: unknown[]) => getStudentQuizDetailRequest(...args),
  listMyQuizAttemptsRequest: (...args: unknown[]) => listMyQuizAttemptsRequest(...args),
  startQuizAttemptRequest: (...args: unknown[]) => startQuizAttemptRequest(...args),
  submitQuizAttemptRequest: (...args: unknown[]) => submitQuizAttemptRequest(...args),
  getQuizAttemptResultRequest: (...args: unknown[]) => getQuizAttemptResultRequest(...args),
}));

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function renderWithProviders(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            <Route path="/courses/:courseId/quizzes" element={<ClientCourseQuizzesPage />} />
            <Route path="/courses/:courseId/quizzes/:quizId" element={<ClientQuizAttemptPage />} />
            <Route path="/courses/:courseId/quizzes/:quizId/results/:attemptId" element={<ClientQuizResultPage />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('Client quiz pages', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'lms.auth',
      JSON.stringify({
        user: {
          id: 'student-1',
          name: 'Student User',
          email: 'student@example.com',
          role: 'STUDENT',
          avatarUrl: null,
        },
        token: buildToken(),
        refreshToken: 'refresh-token',
      }),
    );

    listStudentCourseQuizzesRequest.mockReset();
    getStudentQuizDetailRequest.mockReset();
    listMyQuizAttemptsRequest.mockReset();
    startQuizAttemptRequest.mockReset();
    submitQuizAttemptRequest.mockReset();
    getQuizAttemptResultRequest.mockReset();
  });

  it('renders published course quizzes with attempt availability', async () => {
    listStudentCourseQuizzesRequest.mockResolvedValue([
      {
        id: 'quiz-1',
        courseId: 'course-1',
        title: 'React Checkpoint',
        description: 'Confirm your understanding of the basics.',
        passingScore: 70,
        maxAttempts: 3,
        isPublished: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        questionCount: 5,
        attemptsUsed: 1,
        attemptsRemaining: 2,
      },
      {
        id: 'quiz-2',
        courseId: 'course-1',
        title: 'Advanced Review',
        description: 'All attempts were used.',
        passingScore: 80,
        maxAttempts: 2,
        isPublished: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        questionCount: 8,
        attemptsUsed: 2,
        attemptsRemaining: 0,
      },
    ]);

    renderWithProviders('/courses/course-1/quizzes');

    expect(await screen.findByText('React Checkpoint')).toBeInTheDocument();
    expect(screen.getByText('Confirm your understanding of the basics.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open quiz' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'No attempts left' })).toBeDisabled();
  });

  it('starts and submits a quiz attempt, then navigates to the result page', async () => {
    getStudentQuizDetailRequest.mockResolvedValue({
      id: 'quiz-1',
      courseId: 'course-1',
      title: 'React Checkpoint',
      description: 'Quiz description',
      passingScore: 70,
      maxAttempts: 3,
      isPublished: true,
      attemptsUsed: 0,
      attemptsRemaining: 3,
      questions: [
        {
          id: 'question-1',
          text: 'What is React?',
          type: 'MULTIPLE_CHOICE',
          orderIndex: 1,
          answerOptions: [
            { id: 'option-1', text: 'A library' },
            { id: 'option-2', text: 'A database' },
          ],
        },
      ],
    });
    listMyQuizAttemptsRequest.mockResolvedValue([]);
    startQuizAttemptRequest.mockResolvedValue({
      id: 'attempt-1',
      quizId: 'quiz-1',
      studentId: 'student-1',
      attemptNumber: 1,
    });
    submitQuizAttemptRequest.mockResolvedValue({
      id: 'attempt-1',
      quizId: 'quiz-1',
      studentId: 'student-1',
      attemptNumber: 1,
      score: 100,
      isPassed: true,
      submittedAt: '2026-01-03T00:00:00.000Z',
    });
    getQuizAttemptResultRequest.mockResolvedValue({
      attemptId: 'attempt-1',
      attemptNumber: 1,
      score: 100,
      isPassed: true,
      submittedAt: '2026-01-03T00:00:00.000Z',
      correctCount: 1,
      totalQuestions: 1,
      quiz: {
        id: 'quiz-1',
        title: 'React Checkpoint',
        passingScore: 70,
      },
      answers: [
        {
          questionId: 'question-1',
          questionText: 'What is React?',
          selectedOptionId: 'option-1',
          selectedOptionText: 'A library',
          correctOptionId: 'option-1',
          correctOptionText: 'A library',
          isCorrect: true,
        },
      ],
    });

    renderWithProviders('/courses/course-1/quizzes/quiz-1');

    expect(await screen.findByRole('button', { name: 'Start attempt' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Start attempt' }));

    await waitFor(() => {
      expect(startQuizAttemptRequest).toHaveBeenCalledWith('quiz-1');
    });

    expect(await screen.findByText('In progress')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'A library' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit attempt' }));

    await waitFor(() => {
      expect(submitQuizAttemptRequest).toHaveBeenCalledWith('quiz-1', {
        attemptId: 'attempt-1',
        answers: [
          {
            questionId: 'question-1',
            selectedOptionId: 'option-1',
          },
        ],
      });
    });

    expect(await screen.findByText('Score 100%')).toBeInTheDocument();
    expect(screen.getByText('1/1 correct')).toBeInTheDocument();
    expect(screen.getByText('Your answer:')).toBeInTheDocument();
    expect(screen.getAllByText('A library').length).toBeGreaterThan(0);
  });

  it('shows pass and fail states in attempt history', async () => {
    getStudentQuizDetailRequest.mockResolvedValue({
      id: 'quiz-1',
      courseId: 'course-1',
      title: 'React Checkpoint',
      description: 'Quiz description',
      passingScore: 70,
      maxAttempts: 3,
      isPublished: true,
      attemptsUsed: 2,
      attemptsRemaining: 1,
      questions: [
        {
          id: 'question-1',
          text: 'What is React?',
          type: 'MULTIPLE_CHOICE',
          orderIndex: 1,
          answerOptions: [
            { id: 'option-1', text: 'A library' },
            { id: 'option-2', text: 'A database' },
          ],
        },
      ],
    });
    listMyQuizAttemptsRequest.mockResolvedValue([
      {
        id: 'attempt-2',
        quizId: 'quiz-1',
        studentId: 'student-1',
        attemptNumber: 2,
        status: 'FAILED',
        score: 40,
        isPassed: false,
        submittedAt: '2026-01-04T00:00:00.000Z',
        createdAt: '2026-01-04T00:00:00.000Z',
      },
      {
        id: 'attempt-1',
        quizId: 'quiz-1',
        studentId: 'student-1',
        attemptNumber: 1,
        status: 'PASSED',
        score: 90,
        isPassed: true,
        submittedAt: '2026-01-03T00:00:00.000Z',
        createdAt: '2026-01-03T00:00:00.000Z',
      },
    ]);

    renderWithProviders('/courses/course-1/quizzes/quiz-1');

    expect(await screen.findByText('Attempt history')).toBeInTheDocument();
    expect(screen.getByText('Failed with score 40%')).toBeInTheDocument();
    expect(screen.getByText('Passed with score 90%')).toBeInTheDocument();
    expect(screen.getByText(/Attempt #2 · Latest/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Submitted/i).length).toBe(2);
    expect(screen.getAllByText('View result').length).toBe(2);
  });

  it('shows exhausted attempt guidance and keeps review access when no attempts remain', async () => {
    getStudentQuizDetailRequest.mockResolvedValue({
      id: 'quiz-1',
      courseId: 'course-1',
      title: 'React Checkpoint',
      description: 'Quiz description',
      passingScore: 70,
      maxAttempts: 2,
      isPublished: true,
      attemptsUsed: 2,
      attemptsRemaining: 0,
      questions: [
        {
          id: 'question-1',
          text: 'What is React?',
          type: 'MULTIPLE_CHOICE',
          orderIndex: 1,
          answerOptions: [
            { id: 'option-1', text: 'A library' },
            { id: 'option-2', text: 'A database' },
          ],
        },
      ],
    });
    listMyQuizAttemptsRequest.mockResolvedValue([
      {
        id: 'attempt-2',
        quizId: 'quiz-1',
        studentId: 'student-1',
        attemptNumber: 2,
        status: 'PASSED',
        score: 80,
        isPassed: true,
        submittedAt: '2026-01-04T00:00:00.000Z',
        createdAt: '2026-01-04T00:00:00.000Z',
      },
    ]);

    renderWithProviders('/courses/course-1/quizzes/quiz-1');

    expect(await screen.findByText('Attempts exhausted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start attempt' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Review latest result' })).toBeEnabled();
  });

  it('renders in-progress attempts without a result action', async () => {
    getStudentQuizDetailRequest.mockResolvedValue({
      id: 'quiz-1',
      courseId: 'course-1',
      title: 'React Checkpoint',
      description: 'Quiz description',
      passingScore: 70,
      maxAttempts: 3,
      isPublished: true,
      attemptsUsed: 1,
      attemptsRemaining: 2,
      questions: [
        {
          id: 'question-1',
          text: 'What is React?',
          type: 'MULTIPLE_CHOICE',
          orderIndex: 1,
          answerOptions: [
            { id: 'option-1', text: 'A library' },
            { id: 'option-2', text: 'A database' },
          ],
        },
      ],
    });
    listMyQuizAttemptsRequest.mockResolvedValue([
      {
        id: 'attempt-3',
        quizId: 'quiz-1',
        studentId: 'student-1',
        attemptNumber: 3,
        status: 'STARTED',
        score: null,
        isPassed: null,
        submittedAt: null,
        createdAt: '2026-01-05T00:00:00.000Z',
      },
    ]);

    renderWithProviders('/courses/course-1/quizzes/quiz-1');

    expect(await screen.findByText('Attempt in progress.')).toBeInTheDocument();
    expect(screen.getAllByText(/Started/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole('button', { name: 'View result' })).not.toBeInTheDocument();
  });

  it('renders a quiz result breakdown for a completed attempt', async () => {
    getQuizAttemptResultRequest.mockResolvedValue({
      attemptId: 'attempt-3',
      attemptNumber: 3,
      score: 50,
      isPassed: false,
      submittedAt: '2026-01-04T00:00:00.000Z',
      correctCount: 0,
      totalQuestions: 1,
      quiz: {
        id: 'quiz-1',
        title: 'React Checkpoint',
        passingScore: 70,
      },
      answers: [
        {
          questionId: 'question-1',
          questionText: 'React is primarily used for what?',
          selectedOptionId: 'option-2',
          selectedOptionText: 'Database management',
          correctOptionId: 'option-1',
          correctOptionText: 'Building user interfaces',
          isCorrect: false,
        },
      ],
    });

    renderWithProviders('/courses/course-1/quizzes/quiz-1/results/attempt-3');

    expect(await screen.findByText('Needs another attempt')).toBeInTheDocument();
    expect(screen.getByText('0/1 correct')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /React is primarily used for what\?/i })).toBeInTheDocument();
    expect(screen.getByText('Database management')).toBeInTheDocument();
    expect(screen.getByText('Building user interfaces')).toBeInTheDocument();
  });
});

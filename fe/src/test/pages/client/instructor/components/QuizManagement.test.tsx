import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../../context/AuthContext';
import { QuizManagement } from '../../../../../pages/client/instructor/quiz-management';

const listCoursesRequest = vi.fn();
const listCourseQuizzesRequest = vi.fn();
const listCourseAssignmentsRequest = vi.fn();
const listAssignmentSubmissionsRequest = vi.fn();
const gradeAssignmentSubmissionRequest = vi.fn();
const returnAssignmentSubmissionRequest = vi.fn();
const createQuizRequest = vi.fn();
const createAssignmentRequest = vi.fn();

vi.mock('../../../../../services/api/courseApi', () => ({
  listCoursesRequest: (...args: unknown[]) => listCoursesRequest(...args),
}));

vi.mock('../../../../../services/api/assignmentApi', () => ({
  listCourseAssignmentsRequest: (...args: unknown[]) => listCourseAssignmentsRequest(...args),
  listAssignmentSubmissionsRequest: (...args: unknown[]) => listAssignmentSubmissionsRequest(...args),
  gradeAssignmentSubmissionRequest: (...args: unknown[]) => gradeAssignmentSubmissionRequest(...args),
  returnAssignmentSubmissionRequest: (...args: unknown[]) => returnAssignmentSubmissionRequest(...args),
  createAssignmentRequest: (...args: unknown[]) => createAssignmentRequest(...args),
  updateAssignmentRequest: vi.fn(),
  deleteAssignmentRequest: vi.fn(),
}));

vi.mock('../../../../../services/api/quizApi', () => ({
  listCourseQuizzesRequest: (...args: unknown[]) => listCourseQuizzesRequest(...args),
  createQuizRequest: (...args: unknown[]) => createQuizRequest(...args),
  updateQuizRequest: vi.fn(),
  publishQuizRequest: vi.fn(),
  unpublishQuizRequest: vi.fn(),
  deleteQuizRequest: vi.fn(),
  createQuizQuestionRequest: vi.fn(),
  updateQuizQuestionRequest: vi.fn(),
  deleteQuizQuestionRequest: vi.fn(),
}));

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function renderComponent() {
  return render(
    <AuthProvider>
      <QuizManagement />
    </AuthProvider>,
  );
}

describe('QuizManagement', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'lms.auth',
      JSON.stringify({
        user: {
          id: 'instructor-1',
          name: 'Instructor User',
          email: 'instructor@example.com',
          role: 'INSTRUCTOR',
        },
        token: buildToken(),
        refreshToken: 'refresh-token',
      }),
    );

    listCoursesRequest.mockReset();
    listCourseQuizzesRequest.mockReset();
    listCourseAssignmentsRequest.mockReset();
    listAssignmentSubmissionsRequest.mockReset();
    gradeAssignmentSubmissionRequest.mockReset();
    returnAssignmentSubmissionRequest.mockReset();
    createQuizRequest.mockReset();
    createAssignmentRequest.mockReset();

    listCoursesRequest.mockResolvedValue({
      data: [
        {
          id: 'course-1',
          title: 'React Basics',
          instructorId: 'instructor-1',
          status: 'PUBLISHED',
        },
      ],
    });

    listCourseQuizzesRequest.mockResolvedValue([
      {
        id: 'quiz-1',
        courseId: 'course-1',
        title: 'Quiz 1',
        description: 'Course introduction quiz',
        passingScore: 60,
        maxAttempts: 3,
        isPublished: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        questions: [
          {
            id: 'question-1',
            text: 'What is React?',
            type: 'MULTIPLE_CHOICE',
            orderIndex: 0,
            answerOptions: [
              { id: 'option-1', text: 'A library', isCorrect: true },
              { id: 'option-2', text: 'A database', isCorrect: false },
            ],
          },
        ],
        attempts: [
          {
            id: 'attempt-1',
            score: 100,
            isPassed: true,
            submittedAt: '2026-01-03T00:00:00.000Z',
          },
          {
            id: 'attempt-2',
            score: 40,
            isPassed: false,
            submittedAt: '2026-01-04T00:00:00.000Z',
          },
        ],
        _count: { attempts: 0 },
      },
    ]);

    listCourseAssignmentsRequest.mockResolvedValue([
      {
        id: 'assignment-1',
        courseId: 'course-1',
        title: 'Week 1 assignment',
        description: 'Build a simple component',
        dueDate: '2026-01-10T08:00:00.000Z',
        allowLateSubmission: true,
      },
    ]);
    listAssignmentSubmissionsRequest.mockResolvedValue([
      {
        id: 'submission-1',
        assignmentId: 'assignment-1',
        studentId: 'student-1',
        textContent: 'Built the component',
        fileUrl: 'https://files.local/submission.pdf',
        fileName: 'submission.pdf',
        status: 'ON_TIME',
        isLate: false,
        submittedAt: '2026-01-09T08:00:00.000Z',
        student: {
          id: 'student-1',
          name: 'Student User',
          email: 'student@example.com',
        },
      },
    ]);
  });

  it('loads instructor courses and course quizzes', async () => {
    renderComponent();

    await waitFor(() => {
      expect(listCoursesRequest).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(listCourseQuizzesRequest).toHaveBeenCalledWith('course-1');
    });
    await waitFor(() => {
      expect(listCourseAssignmentsRequest).toHaveBeenCalledWith('course-1');
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Quizzes' }));

    expect(await screen.findByText('Quiz 1')).toBeInTheDocument();
    expect(screen.getByText('Course introduction quiz')).toBeInTheDocument();
    expect(screen.getByText('1 passed')).toBeInTheDocument();
    expect(screen.getByText('1 failed')).toBeInTheDocument();
  }, 15000);

  it('creates a new quiz from the management modal', async () => {
    createQuizRequest.mockResolvedValue({
      id: 'quiz-2',
      courseId: 'course-1',
      title: 'Module 2 quiz',
      description: 'New quiz',
      passingScore: 75,
      maxAttempts: 2,
      isPublished: false,
      questions: [],
      createdAt: '2026-01-05T00:00:00.000Z',
      updatedAt: '2026-01-05T00:00:00.000Z',
      _count: { attempts: 0 },
    });

    renderComponent();

    await waitFor(() => {
      expect(listCourseQuizzesRequest).toHaveBeenCalledWith('course-1');
    });

    fireEvent.click(screen.getAllByRole('button', { name: /create quiz/i })[0]);

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText('Module 1 knowledge check'), {
      target: { value: 'Module 2 quiz' },
    });
    fireEvent.change(within(dialog).getByPlaceholderText('Describe what this quiz evaluates.'), {
      target: { value: 'New quiz' },
    });

    const spinButtons = within(dialog).getAllByRole('spinbutton');
    fireEvent.change(spinButtons[0], { target: { value: '75' } });
    fireEvent.change(spinButtons[1], { target: { value: '2' } });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create quiz' }));

    await waitFor(() => {
      expect(createQuizRequest).toHaveBeenCalledWith({
        courseId: 'course-1',
        title: 'Module 2 quiz',
        description: 'New quiz',
        passingScore: 75,
        maxAttempts: 2,
      });
    });
  }, 15000);

  it('loads course assignments in the second tab', async () => {
    renderComponent();

    await waitFor(() => {
      expect(listCourseAssignmentsRequest).toHaveBeenCalledWith('course-1');
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Assignments' }));

    expect(await screen.findByText('Week 1 assignment')).toBeInTheDocument();
    expect(screen.getByText('Build a simple component')).toBeInTheDocument();
    expect(screen.getByText('Late allowed')).toBeInTheDocument();
  }, 10000);

  it('creates a new assignment from the assignments tab', async () => {
    createAssignmentRequest.mockResolvedValue({
      id: 'assignment-2',
      courseId: 'course-1',
      title: 'Week 2 assignment',
      description: 'Ship the next task',
      dueDate: '2026-01-12T08:30:00.000Z',
      allowLateSubmission: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(listCourseAssignmentsRequest).toHaveBeenCalledWith('course-1');
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Assignments' }));
    await screen.findByText('Assignment management');
    fireEvent.click(screen.getAllByRole('button', { name: /create assignment/i })[0]);

    const dialogs = await screen.findAllByRole('dialog');
    const dialog = dialogs.find((candidate) => within(candidate).queryAllByText('Create assignment').length > 0);

    expect(dialog).toBeDefined();
    const assignmentDialog = dialog!;

    fireEvent.change(within(assignmentDialog).getByPlaceholderText('Week 1 implementation task'), {
      target: { value: 'Week 2 assignment' },
    });
    fireEvent.change(within(assignmentDialog).getByPlaceholderText('Describe what learners need to submit.'), {
      target: { value: 'Ship the next task' },
    });
    fireEvent.change(assignmentDialog.querySelector('input[type="datetime-local"]') as HTMLInputElement, {
      target: { value: '2026-01-12T08:30' },
    });
    fireEvent.click(within(assignmentDialog).getByRole('switch'));
    fireEvent.click(within(assignmentDialog).getByRole('button', { name: 'Create assignment' }));

    await waitFor(() => {
      expect(createAssignmentRequest).toHaveBeenCalledWith({
        courseId: 'course-1',
        title: 'Week 2 assignment',
        description: 'Ship the next task',
        dueDate: new Date('2026-01-12T08:30').toISOString(),
        allowLateSubmission: false,
      });
    });
  }, 10000);

});

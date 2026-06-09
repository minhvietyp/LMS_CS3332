import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CircleHelp, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { listCoursesRequest, type CourseListItem } from '../../../../services/api/courseApi';
import {
  createAssignmentRequest,
  deleteAssignmentRequest,
  gradeAssignmentSubmissionRequest,
  listAssignmentSubmissionsRequest,
  listCourseAssignmentsRequest,
  type AssignmentListItem,
  type AssignmentSubmissionListItem,
  returnAssignmentSubmissionRequest,
  updateAssignmentRequest,
} from '../../../../services/api/assignmentApi';
import {
  createQuizQuestionRequest,
  createQuizRequest,
  deleteQuizQuestionRequest,
  deleteQuizRequest,
  listCourseQuizzesRequest,
  publishQuizRequest,
  type QuizListItem,
  type QuizQuestion,
  type QuizQuestionType,
  unpublishQuizRequest,
  updateQuizQuestionRequest,
  updateQuizRequest,
} from '../../../../services/api/quizApi';
import { getQuizPublishReadiness } from './publishReadiness';
import './index.css';

type QuizFormValues = {
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts: number;
};

type QuestionFormValues = {
  text: string;
  type: QuizQuestionType;
  orderIndex?: number;
  options: Array<{
    text: string;
    isCorrect: boolean;
  }>;
};

type AssignmentFormValues = {
  title: string;
  description?: string;
  dueDate?: string;
  allowLateSubmission: boolean;
};

type AssignmentGradeFormValues = {
  grade: number;
  feedback?: string;
};

type AssignmentSubmissionFeedItem = {
  assignment: AssignmentListItem;
  submission: AssignmentSubmissionListItem;
};

export function QuizManagement() {
  const defaultQuestionOptions = (type: QuizQuestionType = 'MULTIPLE_CHOICE') =>
    type === 'TRUE_FALSE'
      ? [
          { text: 'True', isCorrect: true },
          { text: 'False', isCorrect: false },
        ]
      : [
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
        ];

  const formatDateTime = (value?: string | null) => {
    if (!value) return 'No schedule set';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  };

  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isMutating, setIsMutating] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<QuizListItem | null>(null);
  const [quizForm] = Form.useForm<QuizFormValues>();

  const [activeQuiz, setActiveQuiz] = useState<QuizListItem | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [quizPendingPublishAction, setQuizPendingPublishAction] = useState<QuizListItem | null>(null);
  const [questionForm] = Form.useForm<QuestionFormValues>();
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentListItem | null>(null);
  const [assignmentForm] = Form.useForm<AssignmentFormValues>();
  const [isAssignmentSubmissionsModalOpen, setIsAssignmentSubmissionsModalOpen] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<AssignmentListItem | null>(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState<AssignmentSubmissionListItem[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmissionListItem | null>(null);
  const [isLoadingSubmissionList, setIsLoadingSubmissionList] = useState(false);
  const [gradingFeed, setGradingFeed] = useState<AssignmentSubmissionFeedItem[]>([]);
  const [isLoadingGradingFeed, setIsLoadingGradingFeed] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('quizzes');
  const [assignmentGradeForm] = Form.useForm<AssignmentGradeFormValues>();

  const courseOptions = useMemo(
    () =>
      courses.map((course) => ({
        value: course.id,
        label: course.title,
      })),
    [courses],
  );

  const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0);
  const publishedQuizzes = quizzes.filter((quiz) => quiz.isPublished).length;
  const assignmentsWithDueDate = assignments.filter((assignment) => Boolean(assignment.dueDate)).length;
  const totalGradedSubmissions = assignmentSubmissions.filter((submission) => submission.status === 'GRADED').length;
  const totalReturnedSubmissions = assignmentSubmissions.filter((submission) => submission.status === 'RETURNED').length;
  const totalPassedAttempts = quizzes.reduce(
    (sum, quiz) => sum + (quiz.attempts?.filter((attempt) => attempt.submittedAt && attempt.isPassed).length ?? 0),
    0,
  );
  const totalFailedAttempts = quizzes.reduce(
    (sum, quiz) => sum + (quiz.attempts?.filter((attempt) => attempt.submittedAt && attempt.isPassed === false).length ?? 0),
    0,
  );
  const totalNeedsGrading = gradingFeed.filter(
    ({ submission }) => submission.status === 'ON_TIME' || submission.status === 'LATE',
  ).length;
  const selectedCourseTitle = courses.find((course) => course.id === selectedCourseId)?.title ?? 'Selected course';

  const loadCourses = async () => {
    setIsLoadingCourses(true);
    setErrorMessage(null);

    try {
      const result = await listCoursesRequest({ includeDeleted: false });
      const manageableCourses = result.data.filter((course) => user?.role === 'ADMIN' || course.instructorId === user?.id);
      setCourses(manageableCourses);

      if (!selectedCourseId && manageableCourses.length > 0) {
        setSelectedCourseId(manageableCourses[0].id);
      }

      if (selectedCourseId && !manageableCourses.some((course) => course.id === selectedCourseId)) {
        setSelectedCourseId(manageableCourses[0]?.id ?? null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load courses.');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const loadQuizzes = async (courseId: string) => {
    setIsLoadingQuizzes(true);
    setErrorMessage(null);

    try {
      const result = await listCourseQuizzesRequest(courseId);
      setQuizzes(result);
      if (activeQuiz) {
        setActiveQuiz(result.find((quiz) => quiz.id === activeQuiz.id) ?? null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load quizzes.');
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  const loadAssignments = async (courseId: string) => {
    setIsLoadingAssignments(true);
    setErrorMessage(null);

    try {
      const result = await listCourseAssignmentsRequest(courseId);
      setAssignments(result);
      setIsLoadingGradingFeed(true);
      try {
        const submissionsByAssignment = await Promise.all(
          result.map(async (assignment) => ({
            assignment,
            submissions: await listAssignmentSubmissionsRequest(assignment.id).catch(() => []),
          })),
        );

        const feed = submissionsByAssignment
          .flatMap(({ assignment, submissions }) =>
            submissions.map((submission) => ({
              assignment,
              submission,
            })),
          )
          .sort(
            (left, right) =>
              new Date(right.submission.submittedAt).getTime() - new Date(left.submission.submittedAt).getTime(),
          );

        setGradingFeed(feed);
      } finally {
        setIsLoadingGradingFeed(false);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load assignments.');
      setGradingFeed([]);
      setIsLoadingGradingFeed(false);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      void loadQuizzes(selectedCourseId);
      void loadAssignments(selectedCourseId);
    } else {
      setQuizzes([]);
      setAssignments([]);
      setGradingFeed([]);
    }
  }, [selectedCourseId]);

  const openCreateQuizModal = () => {
    setEditingQuiz(null);
    quizForm.setFieldsValue({
      title: '',
      description: '',
      passingScore: 60,
      maxAttempts: 3,
    });
    setIsQuizModalOpen(true);
  };

  const openEditQuizModal = (quiz: QuizListItem) => {
    setEditingQuiz(quiz);
    quizForm.setFieldsValue({
      title: quiz.title,
      description: quiz.description ?? '',
      passingScore: quiz.passingScore,
      maxAttempts: quiz.maxAttempts,
    });
    setIsQuizModalOpen(true);
  };

  const closeQuizModal = () => {
    setEditingQuiz(null);
    setIsQuizModalOpen(false);
    quizForm.resetFields();
  };

  const submitQuiz = async () => {
    if (!selectedCourseId) return;

    const values = await quizForm.validateFields();
    setIsMutating(editingQuiz?.id ?? 'quiz-new');
    setErrorMessage(null);

    try {
      const payload = {
        courseId: selectedCourseId,
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        passingScore: values.passingScore,
        maxAttempts: values.maxAttempts,
      };

      if (editingQuiz) {
        await updateQuizRequest(editingQuiz.id, payload);
      } else {
        await createQuizRequest(payload);
      }

      closeQuizModal();
      await loadQuizzes(selectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save quiz.');
    } finally {
      setIsMutating(null);
    }
  };

  const handlePublishToggle = async (quiz: QuizListItem) => {
    if (!selectedCourseId) return;

    setIsMutating(quiz.id);
    setErrorMessage(null);

    try {
      if (quiz.isPublished) {
        await unpublishQuizRequest(quiz.id);
      } else {
        await publishQuizRequest(quiz.id);
      }

      await loadQuizzes(selectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update quiz status.');
    } finally {
      setIsMutating(null);
    }
  };

  const openPublishWorkflow = (quiz: QuizListItem) => {
    setQuizPendingPublishAction(quiz);
  };

  const closePublishWorkflow = () => {
    setQuizPendingPublishAction(null);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!selectedCourseId) return;

    setIsMutating(quizId);
    setErrorMessage(null);

    try {
      await deleteQuizRequest(quizId);
      await loadQuizzes(selectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete quiz.');
    } finally {
      setIsMutating(null);
    }
  };

  const openQuestionModal = (quiz: QuizListItem) => {
    setActiveQuiz(quiz);
    setEditingQuestion(null);
    questionForm.setFieldsValue({
      text: '',
      type: 'MULTIPLE_CHOICE',
      orderIndex: quiz.questions.length,
      options: defaultQuestionOptions(),
    });
    setIsQuestionModalOpen(true);
  };

  const openEditQuestion = (quiz: QuizListItem, question: QuizQuestion) => {
    setActiveQuiz(quiz);
    setEditingQuestion(question);
    questionForm.setFieldsValue({
      text: question.text,
      type: question.type,
      orderIndex: question.orderIndex,
      options: question.answerOptions.map((option) => ({
        text: option.text,
        isCorrect: option.isCorrect,
      })),
    });
    setIsQuestionModalOpen(true);
  };

  const closeQuestionModal = () => {
    setActiveQuiz(null);
    setEditingQuestion(null);
    setIsQuestionModalOpen(false);
    questionForm.resetFields();
  };

  const submitQuestion = async () => {
    if (!activeQuiz || !selectedCourseId) return;

    const values = await questionForm.validateFields();
    const normalizedOptions =
      values.type === 'TRUE_FALSE'
        ? values.options.slice(0, 2)
        : values.options;
    const correctCount = normalizedOptions.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      setErrorMessage('Each question must have exactly one correct answer.');
      return;
    }

    setIsMutating(`question-${editingQuestion?.id ?? activeQuiz.id}`);
    setErrorMessage(null);

    try {
      const payload = {
        text: values.text.trim(),
        type: values.type,
        orderIndex: values.orderIndex,
        options: normalizedOptions.map((option) => ({
          text: option.text.trim(),
          isCorrect: option.isCorrect,
        })),
      };

      if (editingQuestion) {
        await updateQuizQuestionRequest(editingQuestion.id, payload);
        closeQuestionModal();
      } else {
        await createQuizQuestionRequest(activeQuiz.id, payload);
        questionForm.setFieldsValue({
          text: '',
          type: 'MULTIPLE_CHOICE',
          orderIndex: activeQuiz.questions.length + 1,
          options: defaultQuestionOptions(),
        });
      }

      await loadQuizzes(selectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Failed to ${editingQuestion ? 'update' : 'create'} question.`);
    } finally {
      setIsMutating(null);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!activeQuiz || !selectedCourseId) return;

    setIsMutating(questionId);
    setErrorMessage(null);

    try {
      await deleteQuizQuestionRequest(questionId);
      await loadQuizzes(selectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete question.');
    } finally {
      setIsMutating(null);
    }
  };

  const openCreateAssignmentModal = () => {
    setEditingAssignment(null);
    assignmentForm.setFieldsValue({
      title: '',
      description: '',
      dueDate: undefined,
      allowLateSubmission: true,
    });
    setIsAssignmentModalOpen(true);
  };

  const openEditAssignmentModal = (assignment: AssignmentListItem) => {
    setEditingAssignment(assignment);
    assignmentForm.setFieldsValue({
      title: assignment.title,
      description: assignment.description ?? '',
      dueDate: assignment.dueDate ? assignment.dueDate.slice(0, 16) : undefined,
      allowLateSubmission: assignment.allowLateSubmission,
    });
    setIsAssignmentModalOpen(true);
  };

  const closeAssignmentModal = () => {
    setEditingAssignment(null);
    setIsAssignmentModalOpen(false);
    assignmentForm.resetFields();
  };

  const submitAssignment = async () => {
    if (!selectedCourseId) return;

    const values = await assignmentForm.validateFields();
    setIsMutating(editingAssignment?.id ?? 'assignment-new');
    setErrorMessage(null);

    try {
      const payload = {
        courseId: selectedCourseId,
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        allowLateSubmission: values.allowLateSubmission,
      };

      if (editingAssignment) {
        await updateAssignmentRequest(editingAssignment.id, payload);
      } else {
        await createAssignmentRequest(payload);
      }

      closeAssignmentModal();
      await loadAssignments(selectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save assignment.');
    } finally {
      setIsMutating(null);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!selectedCourseId) return;

    setIsMutating(assignmentId);
    setErrorMessage(null);

    try {
      await deleteAssignmentRequest(assignmentId);
      await loadAssignments(selectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete assignment.');
    } finally {
      setIsMutating(null);
    }
  };

  const getSubmissionStatusPresentation = (submission: AssignmentSubmissionListItem) => {
    if (submission.status === 'RETURNED') return { label: 'Returned', color: 'purple' as const };
    if (submission.status === 'GRADED') return { label: submission.grade != null ? `Graded ${submission.grade}%` : 'Graded', color: 'blue' as const };
    if (submission.status === 'LATE') return { label: 'Late', color: 'volcano' as const };
    return { label: 'On time', color: submission.isLate ? 'volcano' as const : 'green' as const };
  };

  const loadAssignmentSubmissions = async (assignmentId: string) => {
    setIsLoadingSubmissionList(true);
    setErrorMessage(null);

    try {
      const result = await listAssignmentSubmissionsRequest(assignmentId);
      setAssignmentSubmissions(result);
      if (selectedSubmission) {
        const refreshed = result.find((submission) => submission.id === selectedSubmission.id) ?? null;
        setSelectedSubmission(refreshed);
        if (refreshed) {
          assignmentGradeForm.setFieldsValue({
            grade: refreshed.grade ?? undefined,
            feedback: refreshed.feedback ?? undefined,
          });
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load assignment submissions.');
    } finally {
      setIsLoadingSubmissionList(false);
    }
  };

  const openAssignmentSubmissionsModal = async (assignment: AssignmentListItem) => {
    setActiveAssignment(assignment);
    setSelectedSubmission(null);
    assignmentGradeForm.resetFields();
    setIsAssignmentSubmissionsModalOpen(true);
    await loadAssignmentSubmissions(assignment.id);
  };

  const closeAssignmentSubmissionsModal = () => {
    setActiveAssignment(null);
    setSelectedSubmission(null);
    setAssignmentSubmissions([]);
    setIsAssignmentSubmissionsModalOpen(false);
    assignmentGradeForm.resetFields();
  };

  const handleSelectSubmission = (submission: AssignmentSubmissionListItem) => {
    setSelectedSubmission(submission);
    assignmentGradeForm.setFieldsValue({
      grade: submission.grade ?? undefined,
      feedback: submission.feedback ?? undefined,
    });
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !activeAssignment) return;

    const values = await assignmentGradeForm.validateFields();
    setIsMutating(`submission-grade-${selectedSubmission.id}`);
    setErrorMessage(null);

    try {
      await gradeAssignmentSubmissionRequest(selectedSubmission.id, {
        grade: values.grade,
        feedback: values.feedback?.trim() || undefined,
      });
      await loadAssignmentSubmissions(activeAssignment.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to grade submission.');
    } finally {
      setIsMutating(null);
    }
  };

  const handleReturnSubmission = async (submission: AssignmentSubmissionListItem) => {
    if (!activeAssignment) return;

    setIsMutating(`submission-return-${submission.id}`);
    setErrorMessage(null);

    try {
      await returnAssignmentSubmissionRequest(submission.id);
      await loadAssignmentSubmissions(activeAssignment.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to return submission.');
    } finally {
      setIsMutating(null);
    }
  };

  const getAssignmentSubmissionStats = (assignmentId: string) => {
    const records = gradingFeed.filter((entry) => entry.assignment.id === assignmentId);
    return {
      total: records.length,
      late: records.filter((entry) => entry.submission.isLate || entry.submission.status === 'LATE').length,
      graded: records.filter((entry) => entry.submission.status === 'GRADED' || entry.submission.status === 'RETURNED').length,
      pending: records.filter((entry) => entry.submission.status === 'ON_TIME' || entry.submission.status === 'LATE').length,
    };
  };

  const getQuizAttemptStats = (quiz: QuizListItem) => {
    const submittedAttempts = quiz.attempts?.filter((attempt) => attempt.submittedAt) ?? [];
    const scores = submittedAttempts
      .map((attempt) => attempt.score)
      .filter((score): score is number => typeof score === 'number');

    return {
      totalAttempts: submittedAttempts.length,
      passedAttempts: submittedAttempts.filter((attempt) => attempt.isPassed).length,
      failedAttempts: submittedAttempts.filter((attempt) => attempt.isPassed === false).length,
      averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
    };
  };

  const quizColumns: ColumnsType<QuizListItem> = [
    {
      title: 'Quiz',
      key: 'quiz',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary">{record.description || 'No description yet.'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Questions',
      key: 'questions',
      render: (_, record) => <Tag color="blue">{record.questions.length}</Tag>,
    },
    {
      title: 'Passing score',
      dataIndex: 'passingScore',
      key: 'passingScore',
      render: (value) => <Tag color="purple">{value}%</Tag>,
    },
    {
      title: 'Attempts',
      key: 'attempts',
      render: (_, record) => {
        const submittedAttempts = record.attempts?.filter((attempt) => attempt.submittedAt) ?? [];
        const passedAttempts = submittedAttempts.filter((attempt) => attempt.isPassed).length;
        const failedAttempts = submittedAttempts.filter((attempt) => attempt.isPassed === false).length;

        return (
          <Space size={8} wrap>
            <Tag color="geekblue">Max {record.maxAttempts}</Tag>
            <Tag>{record._count?.attempts ?? 0} submitted</Tag>
            <Tag color="green">{passedAttempts} passed</Tag>
            <Tag color="red">{failedAttempts} failed</Tag>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      key: 'isPublished',
      render: (_, record) => (
        <Space direction="vertical" size={4}>
          <Tag color={record.isPublished ? 'green' : 'default'}>
            {record.isPublished ? 'Published' : 'Draft'}
          </Tag>
          {!record.isPublished ? (
            <Tag color={getQuizPublishReadiness(record).color}>{getQuizPublishReadiness(record).label}</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: 'Readiness',
      key: 'readiness',
      render: (_, record) => {
        const readiness = getQuizPublishReadiness(record);
        return readiness.issues.length > 0 ? (
          <Typography.Text type="secondary" className="quiz-management-readiness">
            {readiness.issues[0]}
          </Typography.Text>
        ) : (
          <Typography.Text type="secondary" className="quiz-management-readiness">
            Students can attempt this quiz once it is published.
          </Typography.Text>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space wrap>
          <Button size="small" onClick={() => openEditQuizModal(record)}>
            Edit
          </Button>
          <Button size="small" onClick={() => openQuestionModal(record)}>
            Questions
          </Button>
          <Button size="small" onClick={() => openPublishWorkflow(record)} loading={isMutating === record.id}>
            {record.isPublished ? 'Unpublish' : 'Publish'}
          </Button>
          <Popconfirm
            title="Delete this quiz?"
            description="This removes the quiz and all of its questions."
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => void handleDeleteQuiz(record.id)}
          >
            <Button danger size="small" icon={<Trash2 size={14} />} loading={isMutating === record.id}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const questionColumns: ColumnsType<QuizQuestion> = [
    {
      title: 'Question',
      key: 'question',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{record.text}</Typography.Text>
          <Typography.Text type="secondary">
            {record.answerOptions.map((option) => `${option.isCorrect ? '✓' : '○'} ${option.text}`).join(' • ')}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (value) => <Tag color="magenta">{String(value).replace('_', ' ')}</Tag>,
    },
    {
      title: 'Order',
      dataIndex: 'orderIndex',
      key: 'orderIndex',
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space wrap>
          <Button
            size="small"
            onClick={() => activeQuiz && openEditQuestion(activeQuiz, record)}
            disabled={activeQuiz?.isPublished}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this question?"
            description="The quiz must be in draft before removing questions."
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => void handleDeleteQuestion(record.id)}
            disabled={activeQuiz?.isPublished}
          >
            <Button
              danger
              size="small"
              icon={<Trash2 size={14} />}
              loading={isMutating === record.id}
              disabled={activeQuiz?.isPublished}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const assignmentColumns: ColumnsType<AssignmentListItem> = [
    {
      title: 'Assignment',
      key: 'assignment',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary">{record.description || 'No description yet.'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Due date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (value: string | null | undefined) =>
        value ? (
          <Typography.Text>{new Date(value).toLocaleString()}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">No due date</Typography.Text>
        ),
    },
    {
      title: 'Late policy',
      dataIndex: 'allowLateSubmission',
      key: 'allowLateSubmission',
      render: (value: boolean) => <Tag color={value ? 'green' : 'red'}>{value ? 'Late allowed' : 'Late blocked'}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space wrap>
          <Button size="small" onClick={() => openEditAssignmentModal(record)}>
            Edit
          </Button>
          <Button size="small" onClick={() => void openAssignmentSubmissionsModal(record)}>
            Submissions
          </Button>
          <Popconfirm
            title="Delete this assignment?"
            description="This removes the assignment definition from the course."
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => void handleDeleteAssignment(record.id)}
          >
            <Button danger size="small" icon={<Trash2 size={14} />} loading={isMutating === record.id}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const assignmentSubmissionColumns: ColumnsType<AssignmentSubmissionListItem> = [
    {
      title: 'Student',
      key: 'student',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{record.student?.name || record.student?.email || record.studentId}</Typography.Text>
          <Typography.Text type="secondary">{record.student?.email || record.studentId}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Space wrap>
          <Tag color={getSubmissionStatusPresentation(record).color}>{getSubmissionStatusPresentation(record).label}</Tag>
          <Tag color={record.isLate ? 'volcano' : 'green'}>{record.isLate ? 'Late' : 'On time'}</Tag>
        </Space>
      ),
    },
    {
      title: 'Submitted',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (value: string) => <Typography.Text>{new Date(value).toLocaleString()}</Typography.Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space wrap>
          <Button size="small" onClick={() => handleSelectSubmission(record)}>
            Review
          </Button>
          <Button
            size="small"
            onClick={() => void handleReturnSubmission(record)}
            disabled={record.status !== 'GRADED'}
            loading={isMutating === `submission-return-${record.id}`}
          >
            Return
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card className="quiz-management-card" bordered={false}>
        <Space direction="vertical" size={16} className="quiz-management-card__content">
          <div className="quiz-management-toolbar">
            <Space wrap>
              <Select
                className="quiz-management-toolbar__course-select"
                placeholder="Select a course"
                value={selectedCourseId ?? undefined}
                onChange={(value) => setSelectedCourseId(value)}
                options={courseOptions}
                loading={isLoadingCourses}
                showSearch
                optionFilterProp="label"
              />
              <Button icon={<RefreshCw size={16} />} onClick={() => void loadCourses()} loading={isLoadingCourses}>
                Refresh courses
              </Button>
            </Space>
            <Space wrap>
              <Button type="primary" icon={<Plus size={16} />} onClick={openCreateAssignmentModal} disabled={!selectedCourseId}>
                Create assignment
              </Button>
              <Button icon={<Plus size={16} />} onClick={openCreateQuizModal} disabled={!selectedCourseId}>
                Create quiz
              </Button>
            </Space>
          </div>

          <div className="quiz-management-summary">
            <div className="quiz-management-summary__item">
              <span className="quiz-management-summary__label">Assignments</span>
              <strong>{assignments.length}</strong>
            </div>
            <div className="quiz-management-summary__item">
              <span className="quiz-management-summary__label">Quizzes</span>
              <strong>{quizzes.length}</strong>
            </div>
            <div className="quiz-management-summary__item">
              <span className="quiz-management-summary__label">Published</span>
              <strong>{publishedQuizzes}</strong>
            </div>
            <div className="quiz-management-summary__item">
              <span className="quiz-management-summary__label">Need grading</span>
              <strong>{totalNeedsGrading}</strong>
            </div>
            <div className="quiz-management-summary__item">
              <span className="quiz-management-summary__label">Passed attempts</span>
              <strong>{totalPassedAttempts}</strong>
            </div>
            <div className="quiz-management-summary__item">
              <span className="quiz-management-summary__label">Failed attempts</span>
              <strong>{totalFailedAttempts}</strong>
            </div>
          </div>

          {selectedCourseId ? (
            <section className="quiz-management-overview-card">
              <div className="quiz-management-overview-card__copy">
                <Typography.Text className="quiz-management-summary__label">Selected course</Typography.Text>
                <Typography.Title level={4}>{selectedCourseTitle}</Typography.Title>
                <Typography.Paragraph>
                  Move between assignment planning, quiz publishing, grading review, and lightweight analytics without falling back to an admin table as the default workspace.
                </Typography.Paragraph>
              </div>
              <div className="quiz-management-overview-card__metrics">
                <div>
                  <span>Questions</span>
                  <strong>{totalQuestions}</strong>
                </div>
                <div>
                  <span>Due-dated work</span>
                  <strong>{assignmentsWithDueDate}</strong>
                </div>
                <div>
                  <span>Returned</span>
                  <strong>{totalReturnedSubmissions}</strong>
                </div>
              </div>
            </section>
          ) : null}

          {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

          <Tabs
            className="quiz-management-tabs"
            activeKey={activeWorkspaceTab}
            onChange={setActiveWorkspaceTab}
            items={[
              {
                key: 'assignments',
                label: 'Assignments',
                children: selectedCourseId ? (
                  <div className="quiz-management-workspace">
                    <div className="quiz-management-tab-head">
                      <div>
                        <Typography.Title level={4}>Assignment workspace</Typography.Title>
                        <Typography.Paragraph>
                          Review due-date work, submission pressure, and late risk with card-based teaching views.
                        </Typography.Paragraph>
                      </div>
                      <Button type="primary" icon={<Plus size={16} />} onClick={openCreateAssignmentModal}>
                        New assignment
                      </Button>
                    </div>

                    {isLoadingAssignments ? (
                      <div className="quiz-management-placeholder">
                        <RefreshCw size={18} />
                        <Typography.Text>Loading assignment workspace...</Typography.Text>
                      </div>
                    ) : assignments.length ? (
                      <>
                        <div className="quiz-management-card-grid">
                          {assignments.map((assignment) => {
                            const stats = getAssignmentSubmissionStats(assignment.id);
                            return (
                              <article key={assignment.id} className="quiz-management-work-card">
                                <div className="quiz-management-work-card__header">
                                  <div>
                                    <Typography.Title level={5}>{assignment.title}</Typography.Title>
                                    <Typography.Paragraph>
                                      {assignment.description || 'No assignment summary yet.'}
                                    </Typography.Paragraph>
                                  </div>
                                  <Tag color={assignment.allowLateSubmission ? 'green' : 'red'}>
                                    {assignment.allowLateSubmission ? 'Late allowed' : 'Strict due date'}
                                  </Tag>
                                </div>

                                <div className="quiz-management-work-card__meta">
                                  <span>Course: {selectedCourseTitle}</span>
                                  <span>Due: {formatDateTime(assignment.dueDate)}</span>
                                  <span>Submissions: {stats.total}</span>
                                  <span>Late: {stats.late}</span>
                                </div>

                                <div className="quiz-management-work-card__stats">
                                  <div>
                                    <span>Pending</span>
                                    <strong>{stats.pending}</strong>
                                  </div>
                                  <div>
                                    <span>Graded</span>
                                    <strong>{stats.graded}</strong>
                                  </div>
                                </div>

                                <div className="quiz-management-work-card__actions">
                                  <Button type="primary" onClick={() => void openAssignmentSubmissionsModal(assignment)}>
                                    Review submissions
                                  </Button>
                                  <Button onClick={() => openEditAssignmentModal(assignment)}>Edit</Button>
                                  <Popconfirm
                                    title="Delete this assignment?"
                                    description="This removes the assignment definition from the course."
                                    okText="Delete"
                                    cancelText="Cancel"
                                    onConfirm={() => void handleDeleteAssignment(assignment.id)}
                                  >
                                    <Button danger loading={isMutating === assignment.id}>
                                      Close assignment
                                    </Button>
                                  </Popconfirm>
                                </div>
                              </article>
                            );
                          })}
                        </div>

                        <Collapse
                          items={[
                            {
                              key: 'assignment-table',
                              label: 'Advanced assignment table',
                              children: (
                                <Table<AssignmentListItem>
                                  rowKey="id"
                                  columns={assignmentColumns}
                                  dataSource={assignments}
                                  loading={isLoadingAssignments}
                                  pagination={false}
                                  scroll={{ x: 880 }}
                                />
                              ),
                            },
                          ]}
                        />
                      </>
                    ) : (
                      <Empty description="No assignments yet for this course." />
                    )}
                  </div>
                ) : (
                  <Empty description="Select a course to manage assignments." />
                ),
              },
              {
                key: 'quizzes',
                label: 'Quizzes',
                children: selectedCourseId ? (
                  <div className="quiz-management-workspace">
                    <div className="quiz-management-tab-head">
                      <div>
                        <Typography.Title level={4}>Quiz workspace</Typography.Title>
                        <Typography.Paragraph>
                          Publish knowledge checks, inspect attempt quality, and open question editing without switching back to an ERP-style table.
                        </Typography.Paragraph>
                      </div>
                      <Button type="primary" icon={<Plus size={16} />} onClick={openCreateQuizModal}>
                        New quiz
                      </Button>
                    </div>

                    {isLoadingQuizzes ? (
                      <div className="quiz-management-placeholder">
                        <RefreshCw size={18} />
                        <Typography.Text>Loading quiz workspace...</Typography.Text>
                      </div>
                    ) : quizzes.length ? (
                      <>
                        <div className="quiz-management-card-grid">
                          {quizzes.map((quiz) => {
                            const stats = getQuizAttemptStats(quiz);
                            return (
                              <article key={quiz.id} className="quiz-management-work-card">
                                <div className="quiz-management-work-card__header">
                                  <div>
                                    <Typography.Title level={5}>{quiz.title}</Typography.Title>
                                    <Typography.Paragraph>{quiz.description || 'No quiz summary yet.'}</Typography.Paragraph>
                                  </div>
                                  <Tag color={quiz.isPublished ? 'green' : 'default'}>
                                    {quiz.isPublished ? 'Published' : 'Draft'}
                                  </Tag>
                                </div>

                                <div className="quiz-management-work-card__meta">
                                  <span>Questions: {quiz.questions.length}</span>
                                  <span>Passing score: {quiz.passingScore}%</span>
                                  <span>Attempts: {stats.totalAttempts}</span>
                                  <span>Average score: {stats.averageScore}%</span>
                                  <span>{stats.passedAttempts} passed</span>
                                  <span>{stats.failedAttempts} failed</span>
                                </div>

                                <div className="quiz-management-work-card__stats">
                                  <div>
                                    <span>Passed</span>
                                    <strong>{stats.passedAttempts}</strong>
                                  </div>
                                  <div>
                                    <span>Failed</span>
                                    <strong>{stats.failedAttempts}</strong>
                                  </div>
                                </div>

                                {!quiz.isPublished ? (
                                  <Typography.Text type="secondary" className="quiz-management-readiness">
                                    {getQuizPublishReadiness(quiz).issues[0] ?? 'Ready to publish'}
                                  </Typography.Text>
                                ) : null}

                                <div className="quiz-management-work-card__actions">
                                  <Button type="primary" onClick={() => openQuestionModal(quiz)}>
                                    Open quiz
                                  </Button>
                                  <Button onClick={() => openEditQuizModal(quiz)}>Edit</Button>
                                  <Button onClick={() => setActiveWorkspaceTab('analytics')}>Analytics</Button>
                                  <Button onClick={() => openPublishWorkflow(quiz)} loading={isMutating === quiz.id}>
                                    {quiz.isPublished ? 'Unpublish' : 'Publish'}
                                  </Button>
                                </div>
                              </article>
                            );
                          })}
                        </div>

                        <Collapse
                          items={[
                            {
                              key: 'quiz-table',
                              label: 'Advanced quiz table',
                              children: (
                                <Table<QuizListItem>
                                  rowKey="id"
                                  columns={quizColumns}
                                  dataSource={quizzes}
                                  loading={isLoadingQuizzes}
                                  pagination={false}
                                  scroll={{ x: 980 }}
                                />
                              ),
                            },
                          ]}
                        />
                      </>
                    ) : (
                      <Empty description="No quizzes yet for this course." />
                    )}
                  </div>
                ) : (
                  <Empty description="Select a course to manage quizzes." />
                ),
              },
              {
                key: 'grading',
                label: 'Grading',
                children: selectedCourseId ? (
                  <div className="quiz-management-workspace">
                    <div className="quiz-management-tab-head">
                      <div>
                        <Typography.Title level={4}>Grading feed</Typography.Title>
                        <Typography.Paragraph>
                          Work through the latest submissions in a feed ordered by submitted time instead of hunting through nested tables.
                        </Typography.Paragraph>
                      </div>
                    </div>

                    {isLoadingGradingFeed ? (
                      <div className="quiz-management-placeholder">
                        <RefreshCw size={18} />
                        <Typography.Text>Loading grading activity...</Typography.Text>
                      </div>
                    ) : gradingFeed.length ? (
                      <div className="quiz-management-feed">
                        {gradingFeed.map(({ assignment, submission }) => (
                          <article key={submission.id} className="quiz-management-feed-card">
                            <div className="quiz-management-feed-card__avatar" aria-hidden="true">
                              {(submission.student?.name || submission.student?.email || 'S').slice(0, 1).toUpperCase()}
                            </div>
                            <div className="quiz-management-feed-card__body">
                              <div className="quiz-management-feed-card__header">
                                <div>
                                  <Typography.Text strong>
                                    {submission.student?.name || submission.student?.email || submission.studentId}
                                  </Typography.Text>
                                  <Typography.Paragraph>
                                    {assignment.title}
                                  </Typography.Paragraph>
                                </div>
                                <Tag color={getSubmissionStatusPresentation(submission).color}>
                                  {getSubmissionStatusPresentation(submission).label}
                                </Tag>
                              </div>
                              <div className="quiz-management-feed-card__meta">
                                <span>Submitted {formatDateTime(submission.submittedAt)}</span>
                                <span>{submission.isLate ? 'Late submission' : 'On time'}</span>
                                <span>{typeof submission.grade === 'number' ? `Score ${submission.grade}%` : 'Not graded yet'}</span>
                              </div>
                              <Typography.Text type="secondary">
                                {submission.feedback?.trim() || submission.textContent?.trim() || 'Open the submission to review the full response and feedback context.'}
                              </Typography.Text>
                              <div className="quiz-management-work-card__actions">
                                <Button type="primary" onClick={() => void openAssignmentSubmissionsModal(assignment)}>
                                  Review submission
                                </Button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <Empty description="No submission activity yet for this course." />
                    )}
                  </div>
                ) : (
                  <Empty description="Select a course to review grading activity." />
                ),
              },
              {
                key: 'analytics',
                label: 'Analytics',
                children: selectedCourseId ? (
                  <div className="quiz-management-workspace">
                    <div className="quiz-management-tab-head">
                      <div>
                        <Typography.Title level={4}>Assessment analytics</Typography.Title>
                        <Typography.Paragraph>
                          Lightweight teaching widgets for assignment pressure, quiz quality, and grading throughput.
                        </Typography.Paragraph>
                      </div>
                    </div>

                    <div className="quiz-management-analytics-grid">
                      <article className="quiz-management-analytics-card">
                        <Typography.Text className="quiz-management-summary__label">Assignment coverage</Typography.Text>
                        <strong>{assignments.length}</strong>
                        <span>{assignmentsWithDueDate} scheduled with due dates</span>
                      </article>
                      <article className="quiz-management-analytics-card">
                        <Typography.Text className="quiz-management-summary__label">Quiz publishing</Typography.Text>
                        <strong>{publishedQuizzes}/{quizzes.length}</strong>
                        <span>Published quizzes across the selected course</span>
                      </article>
                      <article className="quiz-management-analytics-card">
                        <Typography.Text className="quiz-management-summary__label">Grading throughput</Typography.Text>
                        <strong>{totalGradedSubmissions}</strong>
                        <span>{totalReturnedSubmissions} returned to students</span>
                      </article>
                      <article className="quiz-management-analytics-card">
                        <Typography.Text className="quiz-management-summary__label">Attempt outcomes</Typography.Text>
                        <strong>{totalPassedAttempts}</strong>
                        <span>{totalFailedAttempts} failed attempts recorded</span>
                      </article>
                    </div>

                    <div className="quiz-management-analytics-grid quiz-management-analytics-grid--details">
                      {quizzes.map((quiz) => {
                        const stats = getQuizAttemptStats(quiz);
                        return (
                          <article key={quiz.id} className="quiz-management-analytics-card">
                            <Typography.Text strong>{quiz.title}</Typography.Text>
                            <span>{quiz.questions.length} questions · passing score {quiz.passingScore}%</span>
                            <div className="quiz-management-analytics-card__bar">
                              <span>Average score</span>
                              <strong>{stats.averageScore}%</strong>
                            </div>
                            <div className="quiz-management-analytics-card__bar">
                              <span>Attempts</span>
                              <strong>{stats.totalAttempts}</strong>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <Empty description="Select a course to inspect assessment analytics." />
                ),
              },
            ]}
          />
        </Space>
      </Card>

      <Modal
        title={editingQuiz ? 'Edit quiz' : 'Create quiz'}
        open={isQuizModalOpen}
        onCancel={closeQuizModal}
        onOk={() => void submitQuiz()}
        confirmLoading={isMutating === (editingQuiz?.id ?? 'quiz-new')}
        okText={editingQuiz ? 'Save quiz' : 'Create quiz'}
      >
        <Form form={quizForm} layout="vertical" initialValues={{ passingScore: 60, maxAttempts: 3 }}>
          <Form.Item
            label="Title"
            name="title"
            rules={[
              { required: true, message: 'Enter a quiz title.' },
              { min: 3, message: 'Title must be at least 3 characters.' },
            ]}
          >
            <Input placeholder="Module 1 knowledge check" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={4} placeholder="Describe what this quiz evaluates." />
          </Form.Item>
          <Form.Item label="Passing score" name="passingScore" rules={[{ required: true, message: 'Set a passing score.' }]}>
            <InputNumber min={0} max={100} className="quiz-management-field" />
          </Form.Item>
          <Form.Item label="Maximum attempts" name="maxAttempts" rules={[{ required: true, message: 'Set an attempt limit.' }]}>
            <InputNumber min={1} max={10} className="quiz-management-field" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={activeQuiz ? `Questions: ${activeQuiz.title}` : 'Quiz questions'}
        open={isQuestionModalOpen}
        onCancel={closeQuestionModal}
        footer={null}
        width={960}
      >
        <Space direction="vertical" size={16} className="quiz-management-questions">
          {activeQuiz?.isPublished ? (
            <Alert
              type="info"
              showIcon
              message="This quiz is published. Unpublish it before adding or removing questions."
            />
          ) : null}

          <Card bordered={false} className="quiz-management-questions__builder">
            <Typography.Title level={5}>{editingQuestion ? 'Edit question' : 'Add question'}</Typography.Title>
            <Form form={questionForm} layout="vertical">
              <Form.Item
                label="Question"
                name="text"
                rules={[
                  { required: true, message: 'Enter the question prompt.' },
                  { min: 3, message: 'Question must be at least 3 characters.' },
                ]}
              >
                <Input.TextArea rows={3} placeholder="What is the main purpose of React state?" />
              </Form.Item>

              <div className="quiz-management-question-grid">
                <Form.Item label="Question type" name="type" rules={[{ required: true, message: 'Select a type.' }]}>
                  <Select
                    onChange={(value: QuizQuestionType) => {
                      const currentOptions = questionForm.getFieldValue('options') ?? [];
                      if (value === 'TRUE_FALSE') {
                        questionForm.setFieldValue('options', defaultQuestionOptions('TRUE_FALSE'));
                        return;
                      }

                      if (currentOptions.length < 2 || currentOptions.every((option: { text: string }) => option.text === 'True' || option.text === 'False')) {
                        questionForm.setFieldValue('options', defaultQuestionOptions('MULTIPLE_CHOICE'));
                      }
                    }}
                    options={[
                      { value: 'MULTIPLE_CHOICE', label: 'Multiple choice' },
                      { value: 'TRUE_FALSE', label: 'True / False' },
                    ]}
                  />
                </Form.Item>
                <Form.Item label="Order index" name="orderIndex">
                  <InputNumber min={0} className="quiz-management-field" />
                </Form.Item>
              </div>

              <Form.List name="options">
                {(fields, { add, remove }) => (
                  <div className="quiz-management-options">
                    <div className="quiz-management-options__header">
                      <Typography.Text strong>Answer options</Typography.Text>
                      <Button
                        size="small"
                        onClick={() => add({ text: '', isCorrect: false })}
                        disabled={questionForm.getFieldValue('type') === 'TRUE_FALSE' || activeQuiz?.isPublished}
                      >
                        Add option
                      </Button>
                    </div>
                    {fields.map((field, index) => (
                      <div key={field.key} className="quiz-management-options__row">
                        <Form.Item
                          className="quiz-management-options__text"
                          name={[field.name, 'text']}
                          rules={[{ required: true, message: 'Enter option text.' }]}
                        >
                          <Input placeholder={`Option ${index + 1}`} />
                        </Form.Item>
                        <Form.Item
                          className="quiz-management-options__select"
                          name={[field.name, 'isCorrect']}
                        >
                          <Select
                            options={[
                              { value: true, label: 'Correct' },
                              { value: false, label: 'Incorrect' },
                            ]}
                          />
                        </Form.Item>
                        <Button
                          danger
                          type="text"
                          onClick={() => remove(field.name)}
                          disabled={fields.length <= 2 || activeQuiz?.isPublished}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Form.List>

              <Alert
                type="info"
                showIcon
                icon={<CircleHelp size={16} />}
                message="Use exactly one correct answer. True / False questions must contain exactly two options."
              />

              <div className="quiz-management-actions">
                <Button
                  type="primary"
                  icon={<Plus size={16} />}
                  onClick={() => void submitQuestion()}
                  disabled={activeQuiz?.isPublished}
                  loading={isMutating === `question-${editingQuestion?.id ?? activeQuiz?.id ?? 'new'}`}
                >
                  {editingQuestion ? 'Save question' : 'Add question'}
                </Button>
                {editingQuestion ? (
                  <Button
                    onClick={() => {
                      setEditingQuestion(null);
                      questionForm.setFieldsValue({
                        text: '',
                        type: 'MULTIPLE_CHOICE',
                        orderIndex: activeQuiz?.questions.length ?? 0,
                        options: defaultQuestionOptions(),
                      });
                    }}
                  >
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </Form>
          </Card>

          <Table<QuizQuestion>
            rowKey="id"
            columns={questionColumns}
            dataSource={activeQuiz?.questions ?? []}
            pagination={false}
            scroll={{ x: 760 }}
            locale={{ emptyText: 'No questions yet.' }}
          />
        </Space>
      </Modal>

      <Modal
        title={editingAssignment ? 'Edit assignment' : 'Create assignment'}
        open={isAssignmentModalOpen}
        onCancel={closeAssignmentModal}
        onOk={() => void submitAssignment()}
        confirmLoading={isMutating === (editingAssignment?.id ?? 'assignment-new')}
        okText={editingAssignment ? 'Save assignment' : 'Create assignment'}
      >
        <Form form={assignmentForm} layout="vertical" initialValues={{ allowLateSubmission: true }}>
          <Form.Item
            label="Title"
            name="title"
            rules={[
              { required: true, message: 'Enter an assignment title.' },
              { min: 3, message: 'Title must be at least 3 characters.' },
            ]}
          >
            <Input placeholder="Week 1 implementation task" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={4} placeholder="Describe what learners need to submit." />
          </Form.Item>
          <Form.Item label="Due date" name="dueDate">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item label="Allow late submission" name="allowLateSubmission" valuePropName="checked">
            <Switch checkedChildren="Allowed" unCheckedChildren="Blocked" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={activeAssignment ? `Submissions: ${activeAssignment.title}` : 'Assignment submissions'}
        open={isAssignmentSubmissionsModalOpen}
        onCancel={closeAssignmentSubmissionsModal}
        footer={null}
        width={1100}
      >
        <Space direction="vertical" size={16} className="quiz-management-questions">
          <div className="quiz-management-summary">
            <div className="quiz-management-summary__item">
              <span className="quiz-management-summary__label">Submissions</span>
              <strong>{assignmentSubmissions.length}</strong>
            </div>
            <div className="quiz-management-summary__item">
              <span className="quiz-management-summary__label">Graded</span>
              <strong>{totalGradedSubmissions}</strong>
            </div>
            <div className="quiz-management-summary__item">
              <span className="quiz-management-summary__label">Returned</span>
              <strong>{totalReturnedSubmissions}</strong>
            </div>
          </div>

          <Table<AssignmentSubmissionListItem>
            rowKey="id"
            columns={assignmentSubmissionColumns}
            dataSource={assignmentSubmissions}
            loading={isLoadingSubmissionList}
            pagination={false}
            scroll={{ x: 760 }}
            locale={{ emptyText: 'No submissions yet.' }}
          />

          {selectedSubmission ? (
            <Card bordered={false} className="quiz-management-questions__builder">
              <Typography.Title level={5}>Review submission</Typography.Title>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Student">
                    {selectedSubmission.student?.name || selectedSubmission.student?.email || selectedSubmission.studentId}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag color={getSubmissionStatusPresentation(selectedSubmission).color}>
                      {getSubmissionStatusPresentation(selectedSubmission).label}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Submitted">
                    {new Date(selectedSubmission.submittedAt).toLocaleString()}
                  </Descriptions.Item>
                </Descriptions>

                {selectedSubmission.textContent ? (
                  <div>
                    <Typography.Text strong>Student response</Typography.Text>
                    <Typography.Paragraph className="quiz-management-submission-copy">
                      {selectedSubmission.textContent}
                    </Typography.Paragraph>
                  </div>
                ) : null}

                {selectedSubmission.fileName ? (
                  <div>
                    <Typography.Text strong>Attachment</Typography.Text>
                    <div>
                      <a href={selectedSubmission.fileUrl ?? '#'} target="_blank" rel="noreferrer">
                        {selectedSubmission.fileName}
                      </a>
                    </div>
                  </div>
                ) : null}

                <Form form={assignmentGradeForm} layout="vertical">
                  <Form.Item
                    label="Grade"
                    name="grade"
                    rules={[{ required: true, message: 'Enter a grade between 0 and 100.' }]}
                  >
                    <InputNumber min={0} max={100} className="quiz-management-field" />
                  </Form.Item>
                  <Form.Item label="Feedback" name="feedback">
                    <Input.TextArea rows={4} placeholder="Add review notes for the student." />
                  </Form.Item>
                </Form>

                {selectedSubmission.status === 'RETURNED' ? (
                  <Alert
                    type="success"
                    showIcon
                    message="This submission has been returned to the student."
                    description="You can still update the grade or feedback and return it again if needed."
                  />
                ) : selectedSubmission.status === 'GRADED' ? (
                  <Alert
                    type="info"
                    showIcon
                    message="This submission is graded and ready to return."
                    description="Returning it marks the review as released to the student."
                  />
                ) : (
                  <Alert
                    type="warning"
                    showIcon
                    message="Grade this submission before returning it."
                    description="The return action is only available after a grade has been saved."
                  />
                )}

                <div className="quiz-management-actions">
                  <Button
                    type="primary"
                    onClick={() => void handleGradeSubmission()}
                    loading={isMutating === `submission-grade-${selectedSubmission.id}`}
                  >
                    Save grade
                  </Button>
                  <Button
                    onClick={() => void handleReturnSubmission(selectedSubmission)}
                    disabled={selectedSubmission.status !== 'GRADED' && selectedSubmission.status !== 'RETURNED'}
                    loading={isMutating === `submission-return-${selectedSubmission.id}`}
                  >
                    Return to student
                  </Button>
                </div>
              </Space>
            </Card>
          ) : assignmentSubmissions.length > 0 ? (
            <Card bordered={false} className="quiz-management-questions__builder">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Select a submission to review the student response, grade, and feedback."
              />
            </Card>
          ) : null}
        </Space>
      </Modal>

      <Modal
        title={quizPendingPublishAction?.isPublished ? 'Unpublish quiz' : 'Publish quiz'}
        open={Boolean(quizPendingPublishAction)}
        onCancel={closePublishWorkflow}
        onOk={() => quizPendingPublishAction && void handlePublishToggle(quizPendingPublishAction)}
        confirmLoading={isMutating === quizPendingPublishAction?.id}
        okText={quizPendingPublishAction?.isPublished ? 'Unpublish quiz' : 'Publish quiz'}
        okButtonProps={{
          disabled: quizPendingPublishAction ? (!quizPendingPublishAction.isPublished && !getQuizPublishReadiness(quizPendingPublishAction).canPublish) : false,
        }}
      >
        {quizPendingPublishAction ? (
          <Space direction="vertical" size={16} className="quiz-management-publish-modal">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Quiz">{quizPendingPublishAction.title}</Descriptions.Item>
              <Descriptions.Item label="Questions">{quizPendingPublishAction.questions.length}</Descriptions.Item>
              <Descriptions.Item label="Passing score">{quizPendingPublishAction.passingScore}%</Descriptions.Item>
              <Descriptions.Item label="Max attempts">{quizPendingPublishAction.maxAttempts}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={quizPendingPublishAction.isPublished ? 'green' : getQuizPublishReadiness(quizPendingPublishAction).color}>
                  {quizPendingPublishAction.isPublished ? 'Published' : getQuizPublishReadiness(quizPendingPublishAction).label}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {quizPendingPublishAction.isPublished ? (
              <Alert
                type="warning"
                showIcon
                message="Unpublishing will block new student attempts, but existing attempt history will remain."
              />
            ) : getQuizPublishReadiness(quizPendingPublishAction).issues.length > 0 ? (
              <Alert
                type="error"
                showIcon
                message="Resolve these quiz readiness issues before publishing:"
                description={
                  <ul className="quiz-management-issues">
                    {getQuizPublishReadiness(quizPendingPublishAction).issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                }
              />
            ) : (
              <Alert
                type="success"
                showIcon
                message="This quiz is ready to publish. Enrolled students will be able to attempt it immediately."
              />
            )}
          </Space>
        ) : null}
      </Modal>
    </>
  );
}


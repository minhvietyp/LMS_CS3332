import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
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
import {
  BookOpenCheck,
  CircleHelp,
  ClipboardCheck,
  FileQuestion,
  GraduationCap,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
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

type AssessmentWorkspaceTab = 'overview' | 'assignments' | 'quizzes' | 'submissions';

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
  const [activeTab, setActiveTab] = useState<AssessmentWorkspaceTab>('overview');

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
  const [assignmentGradeForm] = Form.useForm<AssignmentGradeFormValues>();

  const courseOptions = useMemo(
    () =>
      courses.map((course) => ({
        value: course.id,
        label: course.title,
      })),
    [courses],
  );
  const selectedCourseExists = selectedCourseId ? courses.some((course) => course.id === selectedCourseId) : false;
  const effectiveSelectedCourseId = selectedCourseExists ? selectedCourseId : courses[0]?.id ?? null;
  const selectedCourse = courses.find((course) => course.id === effectiveSelectedCourseId) ?? null;
  const visibleQuizzes = effectiveSelectedCourseId ? quizzes : [];
  const visibleAssignments = effectiveSelectedCourseId ? assignments : [];

  const totalQuestions = visibleQuizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0);
  const publishedQuizzes = visibleQuizzes.filter((quiz) => quiz.isPublished).length;
  const draftQuizzes = visibleQuizzes.length - publishedQuizzes;
  const assignmentsWithDueDate = visibleAssignments.filter((assignment) => Boolean(assignment.dueDate)).length;
  const totalSubmittedAttempts = visibleQuizzes.reduce(
    (sum, quiz) => sum + (quiz._count?.attempts ?? quiz.attempts?.filter((attempt) => attempt.submittedAt).length ?? 0),
    0,
  );
  const totalGradedSubmissions = assignmentSubmissions.filter((submission) => submission.status === 'GRADED').length;
  const totalReturnedSubmissions = assignmentSubmissions.filter((submission) => submission.status === 'RETURNED').length;
  const loadCourses = async () => {
    setIsLoadingCourses(true);
    setErrorMessage(null);

    try {
      const result = await listCoursesRequest({ includeDeleted: false });
      const manageableCourses = result.data.filter((course) => user?.role === 'ADMIN' || course.instructorId === user?.id);
      setCourses(manageableCourses);
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load assignments.');
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  useEffect(() => {
    void loadCourses();
  }, []);

  useEffect(() => {
    if (effectiveSelectedCourseId) {
      void loadQuizzes(effectiveSelectedCourseId);
      void loadAssignments(effectiveSelectedCourseId);
    }
  }, [effectiveSelectedCourseId]);

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
    if (!effectiveSelectedCourseId) return;

    const values = await quizForm.validateFields();
    setIsMutating(editingQuiz?.id ?? 'quiz-new');
    setErrorMessage(null);

    try {
      const payload = {
        courseId: effectiveSelectedCourseId,
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
      await loadQuizzes(effectiveSelectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save quiz.');
    } finally {
      setIsMutating(null);
    }
  };

  const handlePublishToggle = async (quiz: QuizListItem) => {
    if (!effectiveSelectedCourseId) return;

    setIsMutating(quiz.id);
    setErrorMessage(null);

    try {
      if (quiz.isPublished) {
        await unpublishQuizRequest(quiz.id);
      } else {
        await publishQuizRequest(quiz.id);
      }

      await loadQuizzes(effectiveSelectedCourseId);
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
    if (!effectiveSelectedCourseId) return;

    setIsMutating(quizId);
    setErrorMessage(null);

    try {
      await deleteQuizRequest(quizId);
      await loadQuizzes(effectiveSelectedCourseId);
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
    if (!activeQuiz || !effectiveSelectedCourseId) return;

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

      await loadQuizzes(effectiveSelectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : `Failed to ${editingQuestion ? 'update' : 'create'} question.`);
    } finally {
      setIsMutating(null);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!activeQuiz || !effectiveSelectedCourseId) return;

    setIsMutating(questionId);
    setErrorMessage(null);

    try {
      await deleteQuizQuestionRequest(questionId);
      await loadQuizzes(effectiveSelectedCourseId);
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
    if (!effectiveSelectedCourseId) return;

    const values = await assignmentForm.validateFields();
    setIsMutating(editingAssignment?.id ?? 'assignment-new');
    setErrorMessage(null);

    try {
      const payload = {
        courseId: effectiveSelectedCourseId,
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
      await loadAssignments(effectiveSelectedCourseId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save assignment.');
    } finally {
      setIsMutating(null);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!effectiveSelectedCourseId) return;

    setIsMutating(assignmentId);
    setErrorMessage(null);

    try {
      await deleteAssignmentRequest(assignmentId);
      await loadAssignments(effectiveSelectedCourseId);
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
      <div className="quiz-management-workspace">
        <Card className="quiz-management-card quiz-management-course-card" bordered={false}>
          <div className="quiz-management-course-card__main">
            <div>
              <Typography.Text className="quiz-management-eyebrow">Selected course</Typography.Text>
              <Typography.Title level={4}>
                {selectedCourse ? selectedCourse.title : 'Select a course to manage assessments'}
              </Typography.Title>
              <Typography.Paragraph type="secondary">
                {selectedCourse
                  ? `Status: ${selectedCourse.status}. Assessment counts below are derived from this selected course.`
                  : 'Assignments, quizzes, questions, and submissions load after a course is selected.'}
              </Typography.Paragraph>
            </div>
            <div className="quiz-management-course-card__actions">
              <Select
                className="quiz-management-toolbar__course-select"
                placeholder="Select a course"
                value={effectiveSelectedCourseId ?? undefined}
                onChange={(value) => setSelectedCourseId(value)}
                options={courseOptions}
                loading={isLoadingCourses}
                disabled={isLoadingCourses || courses.length === 0}
                showSearch
                optionFilterProp="label"
              />
              <Button icon={<RefreshCw size={16} />} onClick={() => void loadCourses()} loading={isLoadingCourses}>
                Refresh
              </Button>
            </div>
          </div>

          {!isLoadingCourses && courses.length === 0 ? (
            <Alert
              type="info"
              showIcon
              message="No instructor courses found."
              description="Create a course before adding assignments, quizzes, or questions."
              action={<Button href="/instructor/courses">Go to courses</Button>}
            />
          ) : null}
        </Card>

        {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

        <Card className="quiz-management-card" bordered={false}>
          <div className="quiz-management-header">
            <div>
              <Typography.Text className="quiz-management-eyebrow">Assessment workspace</Typography.Text>
              <Typography.Title level={3}>Assignments, quizzes, and grading</Typography.Title>
              <Typography.Paragraph type="secondary">
                Workflows are grouped by task so course setup, publishing, and review stay easy to scan.
              </Typography.Paragraph>
            </div>
            <Space wrap>
              {activeTab === 'assignments' ? (
                <Button type="primary" icon={<Plus size={16} />} onClick={openCreateAssignmentModal} disabled={!effectiveSelectedCourseId}>
                  Create Assignment
                </Button>
              ) : activeTab === 'quizzes' ? (
                <Button type="primary" icon={<Plus size={16} />} onClick={openCreateQuizModal} disabled={!effectiveSelectedCourseId}>
                  Create Quiz
                </Button>
              ) : (
                <>
                  <Button icon={<Plus size={16} />} onClick={openCreateAssignmentModal} disabled={!effectiveSelectedCourseId}>
                    Create Assignment
                  </Button>
                  <Button type="primary" icon={<Plus size={16} />} onClick={openCreateQuizModal} disabled={!effectiveSelectedCourseId}>
                    Create Quiz
                  </Button>
                </>
              )}
              <Button href="/reports/assignments">View Assignment Reports</Button>
              <Button href="/reports/quizzes">View Quiz Reports</Button>
            </Space>
          </div>

          <Tabs
            className="quiz-management-tabs"
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as AssessmentWorkspaceTab)}
            items={[
              {
                key: 'overview',
                label: 'Overview',
                children: (
                  <Space direction="vertical" size={16} className="quiz-management-card__content">
                    {!effectiveSelectedCourseId ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Select a course to manage assessments."
                      />
                    ) : (
                      <>
                        <div className="quiz-management-summary">
                          <div className="quiz-management-summary__item">
                            <span className="quiz-management-summary__label">Assignments</span>
                            <strong>{visibleAssignments.length}</strong>
                            <span>{assignmentsWithDueDate} with due dates</span>
                          </div>
                          <div className="quiz-management-summary__item">
                            <span className="quiz-management-summary__label">Quizzes</span>
                            <strong>{visibleQuizzes.length}</strong>
                            <span>{totalQuestions} questions</span>
                          </div>
                          <div className="quiz-management-summary__item">
                            <span className="quiz-management-summary__label">Published quizzes</span>
                            <strong>{publishedQuizzes}</strong>
                            <span>{draftQuizzes} drafts</span>
                          </div>
                          <div className="quiz-management-summary__item">
                            <span className="quiz-management-summary__label">Submitted quiz attempts</span>
                            <strong>{totalSubmittedAttempts}</strong>
                            <span>Returned by quiz API</span>
                          </div>
                        </div>

                        <div className="quiz-management-quick-actions">
                          <button type="button" className="quiz-management-action-card" onClick={openCreateAssignmentModal}>
                            <ClipboardCheck size={20} />
                            <span>Create assignment</span>
                            <small>Set a brief, deadline, and late policy.</small>
                          </button>
                          <button type="button" className="quiz-management-action-card" onClick={openCreateQuizModal}>
                            <FileQuestion size={20} />
                            <span>Create quiz</span>
                            <small>Build a quiz shell before adding questions.</small>
                          </button>
                          <button
                            type="button"
                            className="quiz-management-action-card"
                            onClick={() => setActiveTab('quizzes')}
                          >
                            <BookOpenCheck size={20} />
                            <span>Manage questions</span>
                            <small>Open a quiz and edit supported question types.</small>
                          </button>
                          <button
                            type="button"
                            className="quiz-management-action-card"
                            onClick={() => setActiveTab('submissions')}
                          >
                            <GraduationCap size={20} />
                            <span>Review submissions</span>
                            <small>Select an assignment to load real submissions.</small>
                          </button>
                        </div>
                      </>
                    )}
                  </Space>
                ),
              },
              {
                key: 'assignments',
                label: 'Assignments',
                children: (
                  <Space direction="vertical" size={16} className="quiz-management-card__content">
                    <div className="quiz-management-section-header">
                      <div>
                        <Typography.Title level={4}>Assignment management</Typography.Title>
                        <Typography.Text type="secondary">
                          Create briefs, manage due dates, and open submission review for the selected course.
                        </Typography.Text>
                      </div>
                      <Button type="primary" icon={<Plus size={16} />} onClick={openCreateAssignmentModal} disabled={!effectiveSelectedCourseId}>
                        Create Assignment
                      </Button>
                    </div>
                    <Table<AssignmentListItem>
                      rowKey="id"
                      columns={assignmentColumns}
                      dataSource={visibleAssignments}
                      loading={isLoadingAssignments}
                      pagination={false}
                      scroll={{ x: 880 }}
                      locale={{ emptyText: effectiveSelectedCourseId ? 'No assignments yet.' : 'Select a course to manage assignments.' }}
                    />
                  </Space>
                ),
              },
              {
                key: 'quizzes',
                label: 'Quizzes',
                children: (
                  <Space direction="vertical" size={16} className="quiz-management-card__content">
                    <div className="quiz-management-section-header">
                      <div>
                        <Typography.Title level={4}>Quiz management</Typography.Title>
                        <Typography.Text type="secondary">
                          Build quiz settings, manage questions, and run publish readiness checks.
                        </Typography.Text>
                      </div>
                      <Button type="primary" icon={<Plus size={16} />} onClick={openCreateQuizModal} disabled={!effectiveSelectedCourseId}>
                        Create Quiz
                      </Button>
                    </div>
                    <Table<QuizListItem>
                      rowKey="id"
                      columns={quizColumns}
                      dataSource={visibleQuizzes}
                      loading={isLoadingQuizzes}
                      pagination={false}
                      scroll={{ x: 980 }}
                      locale={{ emptyText: effectiveSelectedCourseId ? 'No quizzes yet.' : 'Select a course to manage quizzes.' }}
                    />
                  </Space>
                ),
              },
              {
                key: 'submissions',
                label: 'Submissions / Grading',
                children: (
                  <Space direction="vertical" size={16} className="quiz-management-card__content">
                    <div className="quiz-management-section-header">
                      <div>
                        <Typography.Title level={4}>Submission review</Typography.Title>
                        <Typography.Text type="secondary">
                          Choose an assignment to load its real submissions and open the grading workflow.
                        </Typography.Text>
                      </div>
                    </div>
                    {visibleAssignments.length > 0 ? (
                      <div className="quiz-management-assignment-grid">
                        {visibleAssignments.map((assignment) => (
                          <Card key={assignment.id} className="quiz-management-mini-card" bordered={false}>
                            <Space direction="vertical" size={10} className="quiz-management-card__content">
                              <Typography.Text strong>{assignment.title}</Typography.Text>
                              <Typography.Text type="secondary">
                                {assignment.description || 'No description yet.'}
                              </Typography.Text>
                              <Space wrap>
                                <Tag color={assignment.allowLateSubmission ? 'green' : 'red'}>
                                  {assignment.allowLateSubmission ? 'Late allowed' : 'Late blocked'}
                                </Tag>
                                <Tag>
                                  {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'No due date'}
                                </Tag>
                              </Space>
                              <Button type="primary" onClick={() => void openAssignmentSubmissionsModal(assignment)}>
                                Review submissions
                              </Button>
                            </Space>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={effectiveSelectedCourseId ? 'No assignments yet.' : 'Select a course to review submissions.'}
                      />
                    )}
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </div>

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


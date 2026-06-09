import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Button, Input, Select, Typography } from 'antd';
import { ArrowLeft, ClipboardCheck, FileQuestion, RotateCcw, Search, Trophy } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { getCourseByIdRequest } from '../../../services/api/courseApi';
import {
  listMyQuizAttemptsRequest,
  listStudentCourseQuizzesRequest,
  type StudentQuizAttempt,
  type StudentQuizCourseItem,
} from '../../../services/api/quizApi';
import './ClientQuizPages.css';

type QuizStatus = 'AVAILABLE' | 'NOT_ATTEMPTED' | 'ATTEMPTED' | 'PASSED' | 'FAILED' | 'NOT_AVAILABLE';
type QuizFilter = 'ALL' | 'AVAILABLE' | 'NOT_ATTEMPTED' | 'ATTEMPTED' | 'COMPLETED';
type QuizSort = 'STATUS' | 'SCORE' | 'UPDATED';

type QuizViewItem = {
  quiz: StudentQuizCourseItem;
  attempts: StudentQuizAttempt[];
  latestAttempt: StudentQuizAttempt | null;
  status: QuizStatus;
  latestScore: number | null;
  updatedTime: number;
};

const filterTabs: Array<{ value: QuizFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'NOT_ATTEMPTED', label: 'Not Attempted' },
  { value: 'ATTEMPTED', label: 'Attempted' },
  { value: 'COMPLETED', label: 'Passed / Completed' },
];

const statusRank: Record<QuizStatus, number> = {
  AVAILABLE: 0,
  NOT_ATTEMPTED: 1,
  ATTEMPTED: 2,
  FAILED: 3,
  PASSED: 4,
  NOT_AVAILABLE: 5,
};

function getLatestAttempt(attempts: StudentQuizAttempt[] = []) {
  return [...attempts].sort((left, right) => {
    const leftTime = left.submittedAt || left.updatedAt || left.createdAt || '';
    const rightTime = right.submittedAt || right.updatedAt || right.createdAt || '';
    return (rightTime ? new Date(rightTime).getTime() : 0) - (leftTime ? new Date(leftTime).getTime() : 0);
  })[0] ?? null;
}

function getQuizStatus(quiz: StudentQuizCourseItem, attempts: StudentQuizAttempt[], latestAttempt: StudentQuizAttempt | null): QuizStatus {
  if (!quiz.isPublished) return 'NOT_AVAILABLE';

  const latestScore = latestAttempt?.score ?? null;
  if (latestScore != null) {
    return latestScore >= quiz.passingScore ? 'PASSED' : 'FAILED';
  }

  if (latestAttempt?.status === 'PASSED') return 'PASSED';
  if (latestAttempt?.status === 'FAILED') return 'FAILED';
  if (attempts.length > 0 || quiz.attemptsUsed > 0) return 'ATTEMPTED';
  if (quiz.attemptsRemaining > 0) return 'NOT_ATTEMPTED';

  return 'NOT_AVAILABLE';
}

function getStatusLabel(status: QuizStatus) {
  switch (status) {
    case 'AVAILABLE':
      return 'Available';
    case 'NOT_ATTEMPTED':
      return 'Not attempted';
    case 'ATTEMPTED':
      return 'Attempted';
    case 'PASSED':
      return 'Passed';
    case 'FAILED':
      return 'Failed';
    case 'NOT_AVAILABLE':
    default:
      return 'Not available';
  }
}

function getStatusBadgeClass(status: QuizStatus) {
  switch (status) {
    case 'PASSED':
      return 'client-badge client-badge-success';
    case 'FAILED':
      return 'client-badge client-badge-danger';
    case 'ATTEMPTED':
      return 'client-badge client-badge-info';
    case 'AVAILABLE':
    case 'NOT_ATTEMPTED':
      return 'client-badge client-badge-warning';
    case 'NOT_AVAILABLE':
    default:
      return 'client-badge';
  }
}

function getPrimaryAction(item: QuizViewItem) {
  if (item.latestAttempt?.status === 'STARTED') return 'Continue attempt';
  if ((item.status === 'PASSED' || item.status === 'FAILED') && item.latestAttempt?.id) return 'View result';
  if (item.quiz.attemptsRemaining > 0 && item.quiz.attemptsUsed > 0) return 'Retake';
  if (item.quiz.attemptsRemaining > 0) return 'Start quiz';
  return 'View course';
}

function getPrimaryHref(item: QuizViewItem, courseId: string) {
  if ((item.status === 'PASSED' || item.status === 'FAILED') && item.latestAttempt?.id) {
    return `/courses/${courseId}/quizzes/${item.quiz.id}/results/${item.latestAttempt.id}`;
  }

  if (item.quiz.attemptsRemaining > 0 || item.latestAttempt?.status === 'STARTED') {
    return `/courses/${courseId}/quizzes/${item.quiz.id}`;
  }

  return `/courses/${courseId}`;
}

function getEmptyTitle(filter: QuizFilter, hasQuizzes: boolean) {
  if (!hasQuizzes) return 'No quizzes available yet.';
  if (filter === 'ATTEMPTED' || filter === 'COMPLETED') return 'No quiz attempts yet.';
  return 'No quizzes match your filters.';
}

function buildQuizListSkeleton() {
  return (
    <div className="quiz-workspace__stack">
      <section className="client-card quiz-workspace__skeleton-card">
        <div className="quiz-workspace__skeleton-shell">
          <div className="quiz-workspace__skeleton-line quiz-workspace__skeleton-line--meta" />
          <div className="quiz-workspace__skeleton-line quiz-workspace__skeleton-line--title" />
          <div className="quiz-workspace__skeleton-block" />
        </div>
      </section>
      <section className="client-card quiz-workspace__skeleton-card">
        <div className="quiz-workspace__skeleton-shell">
          <div className="quiz-workspace__skeleton-block" />
          <div className="quiz-workspace__skeleton-block" />
        </div>
      </section>
    </div>
  );
}

export function ClientCourseQuizzesPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [activeFilter, setActiveFilter] = useState<QuizFilter>('ALL');
  const [sortBy, setSortBy] = useState<QuizSort>('STATUS');

  const courseQuery = useQuery({
    queryKey: ['quizzes', 'course-header', courseId],
    queryFn: () => getCourseByIdRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });

  const quizzesQuery = useQuery({
    queryKey: ['quizzes', 'student-course', courseId],
    queryFn: () => listStudentCourseQuizzesRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const quizzes = quizzesQuery.data ?? [];
  const courseTitle = courseQuery.data?.title ?? 'Current course';

  const attemptQueries = useQueries({
    queries: quizzes.map((quiz) => ({
      queryKey: ['quizzes', 'student-attempts', quiz.id],
      queryFn: () => listMyQuizAttemptsRequest(quiz.id),
      staleTime: 60 * 1000,
      retry: 1,
    })),
  });

  const quizItems = useMemo<QuizViewItem[]>(() => {
    return quizzes.map((quiz, index) => {
      const attempts = attemptQueries[index]?.data ?? [];
      const latestAttempt = getLatestAttempt(attempts);
      const latestScore = latestAttempt?.score ?? null;

      return {
        quiz,
        attempts,
        latestAttempt,
        status: getQuizStatus(quiz, attempts, latestAttempt),
        latestScore,
        updatedTime: new Date(quiz.updatedAt || quiz.createdAt).getTime(),
      };
    });
  }, [attemptQueries, quizzes]);

  const metrics = useMemo(() => {
    return {
      available: quizItems.filter((item) => item.quiz.isPublished && item.quiz.attemptsRemaining > 0).length,
      pending: quizItems.filter((item) => item.status === 'NOT_ATTEMPTED').length,
      attempted: quizItems.filter((item) => item.attempts.length > 0 || item.quiz.attemptsUsed > 0).length,
      completed: quizItems.filter((item) => item.status === 'PASSED' || item.status === 'FAILED').length,
    };
  }, [quizItems]);

  const filteredQuizzes = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return quizItems
      .filter((item) => {
        const matchesSearch =
          !search ||
          item.quiz.title.toLowerCase().includes(search) ||
          (item.quiz.description ?? '').toLowerCase().includes(search) ||
          courseTitle.toLowerCase().includes(search);
        const matchesFilter =
          activeFilter === 'ALL' ||
          (activeFilter === 'AVAILABLE' && item.quiz.isPublished && item.quiz.attemptsRemaining > 0) ||
          (activeFilter === 'NOT_ATTEMPTED' && item.status === 'NOT_ATTEMPTED') ||
          (activeFilter === 'ATTEMPTED' && (item.attempts.length > 0 || item.quiz.attemptsUsed > 0)) ||
          (activeFilter === 'COMPLETED' && (item.status === 'PASSED' || item.status === 'FAILED'));

        return matchesSearch && matchesFilter;
      })
      .sort((left, right) => {
        if (sortBy === 'SCORE') return (right.latestScore ?? -1) - (left.latestScore ?? -1);
        if (sortBy === 'UPDATED') return right.updatedTime - left.updatedTime;
        return statusRank[left.status] - statusRank[right.status] || left.quiz.title.localeCompare(right.quiz.title);
      });
  }, [activeFilter, courseTitle, quizItems, searchValue, sortBy]);

  const isLoading = quizzesQuery.isLoading || courseQuery.isLoading || attemptQueries.some((query) => query.isLoading);
  const supportError = attemptQueries.find((query) => query.error)?.error;

  const renderQuizRow = (item: QuizViewItem) => {
    const actionLabel = getPrimaryAction(item);
    const actionHref = getPrimaryHref(item, courseId!);
    const isPrimaryAction = actionLabel === 'Start quiz' || actionLabel === 'Continue attempt' || actionLabel === 'Retake';

    return (
      <article key={item.quiz.id} className={`quiz-workspace__quiz-row quiz-workspace__quiz-row--${item.status.toLowerCase()}`}>
        <div className="quiz-workspace__quiz-icon" aria-hidden="true">
          <FileQuestion size={18} />
        </div>
        <div className="quiz-workspace__quiz-copy">
          <div className="quiz-workspace__quiz-title-row">
            <Typography.Text className="client-card-title">{item.quiz.title}</Typography.Text>
            <span className={getStatusBadgeClass(item.status)}>{getStatusLabel(item.status)}</span>
          </div>
          <Typography.Text className="client-meta">{courseTitle}</Typography.Text>
          {item.quiz.description ? (
            <Typography.Paragraph className="client-body quiz-workspace__quiz-description">
              {item.quiz.description}
            </Typography.Paragraph>
          ) : (
            <Typography.Text className="client-meta">Quiz requirements are available inside the quiz workspace.</Typography.Text>
          )}
          <div className="quiz-workspace__quiz-meta">
            <span>{item.quiz.questionCount} questions</span>
            <span>Passing score {item.quiz.passingScore}%</span>
            <span>{item.quiz.attemptsUsed}/{item.quiz.maxAttempts} attempts used</span>
            <span>{item.quiz.attemptsRemaining} remaining</span>
            {item.latestScore != null ? <span>Latest score {item.latestScore}%</span> : null}
          </div>
        </div>
        <Link className={isPrimaryAction ? 'client-button client-button-primary quiz-workspace__quiz-action' : 'client-button client-button-secondary quiz-workspace__quiz-action'} to={actionHref}>
          {actionLabel}
        </Link>
      </article>
    );
  };

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Quizzes"
        subtitle="Review available quizzes, attempts, scores, and results."
        actions={
          <Button className="client-button client-button-secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(`/courses/${courseId}`)}>
            Back to Course
          </Button>
        }
      >
        {isLoading ? buildQuizListSkeleton() : null}

        {quizzesQuery.error ? (
          <section className="client-card quiz-workspace__state-card">
            <EmptyState
              title="Unable to load quizzes"
              description={quizzesQuery.error instanceof Error ? quizzesQuery.error.message : 'The quiz list could not be loaded right now.'}
              action={
                <Button className="client-button client-button-primary" onClick={() => quizzesQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          </section>
        ) : null}

        {!isLoading && !quizzesQuery.error ? (
          <div className="quiz-workspace quiz-workspace--management">
            <section className="client-card quiz-workspace__summary-panel">
              <div className="quiz-workspace__summary-heading">
                <Typography.Text className="client-caption">{courseTitle}</Typography.Text>
                <Typography.Title level={2} className="client-section-title">
                  Quiz status
                </Typography.Title>
              </div>
              <div className="quiz-workspace__summary-cards">
                <div className="client-card quiz-workspace__summary-card">
                  <FileQuestion size={18} aria-hidden="true" />
                  <Typography.Text className="client-meta">Available</Typography.Text>
                  <strong>{metrics.available}</strong>
                </div>
                <div className="client-card quiz-workspace__summary-card">
                  <ClipboardCheck size={18} aria-hidden="true" />
                  <Typography.Text className="client-meta">Not attempted</Typography.Text>
                  <strong>{metrics.pending}</strong>
                </div>
                <div className="client-card quiz-workspace__summary-card">
                  <RotateCcw size={18} aria-hidden="true" />
                  <Typography.Text className="client-meta">Attempted</Typography.Text>
                  <strong>{metrics.attempted}</strong>
                </div>
                <div className="client-card quiz-workspace__summary-card">
                  <Trophy size={18} aria-hidden="true" />
                  <Typography.Text className="client-meta">Passed/completed</Typography.Text>
                  <strong>{metrics.completed}</strong>
                </div>
              </div>
            </section>

            <section className="client-card quiz-workspace__panel quiz-workspace__quiz-panel">
              <div className="quiz-workspace__section-header">
                <div className="quiz-workspace__section-header-copy">
                  <Typography.Text className="client-caption">Course assessments</Typography.Text>
                  <Typography.Title level={3} className="client-section-title">
                    Manage quizzes
                  </Typography.Title>
                </div>
              </div>

              <div className="quiz-workspace__management-controls">
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search quizzes..."
                  prefix={<Search size={16} />}
                  className="quiz-workspace__search"
                />
                <Select<QuizSort>
                  value={sortBy}
                  onChange={setSortBy}
                  className="quiz-workspace__sort"
                  options={[
                    { value: 'STATUS', label: 'Sort by status' },
                    { value: 'SCORE', label: 'Sort by score' },
                    { value: 'UPDATED', label: 'Sort by recently updated' },
                  ]}
                />
              </div>

              <div className="quiz-workspace__filter-tabs" aria-label="Quiz status filters">
                {filterTabs.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={`quiz-workspace__filter-tab${activeFilter === filter.value ? ' quiz-workspace__filter-tab--active' : ''}`}
                    onClick={() => setActiveFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {supportError ? (
                <div className="quiz-workspace__warning-state">
                  <Typography.Text className="client-card-title">Some attempt data is unavailable</Typography.Text>
                  <Typography.Text className="client-meta">
                    Quiz availability remains visible, but latest scores or result links may be incomplete until attempts load.
                  </Typography.Text>
                </div>
              ) : null}

              {!quizzes.length || !filteredQuizzes.length ? (
                <EmptyState
                  compact
                  title={getEmptyTitle(activeFilter, quizzes.length > 0)}
                  description={quizzes.length ? 'Try another status or search term.' : 'Published quizzes will appear here when they are available in the course.'}
                />
              ) : (
                <div className="quiz-workspace__quiz-list">
                  {filteredQuizzes.map((item) => renderQuizRow(item))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </ClientPageContainer>
    </ClientLayout>
  );
}

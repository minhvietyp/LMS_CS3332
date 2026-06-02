import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Select, Typography } from 'antd';
import { ArrowLeft, Search } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { getCourseByIdRequest } from '../../../services/api/courseApi';
import { listStudentCourseQuizzesRequest, type StudentQuizCourseItem } from '../../../services/api/quizApi';
import './ClientQuizPages.css';

type QuizQueueFilter = 'ALL' | 'AVAILABLE' | 'ATTEMPTED' | 'EXHAUSTED';

type QuizQueuePresentation = {
  label: string;
  badgeClassName: string;
  primaryAction: 'Start Quiz' | 'Retake Quiz' | 'View Details';
  summary: string;
};

function getQuizPresentation(quiz: StudentQuizCourseItem): QuizQueuePresentation {
  if (quiz.attemptsRemaining <= 0) {
    return {
      label: 'No Attempts Left',
      badgeClassName: 'client-badge client-badge-warning',
      primaryAction: 'View Details',
      summary: 'All available quiz attempts have been used. Review the latest result or quiz requirements.',
    };
  }

  if (quiz.attemptsUsed > 0) {
    return {
      label: 'Attempts Remaining',
      badgeClassName: 'client-badge client-badge-info',
      primaryAction: 'Retake Quiz',
      summary: 'You can start another attempt while attempts remain.',
    };
  }

  return {
    label: 'Available',
    badgeClassName: 'client-badge client-badge-info',
    primaryAction: 'Start Quiz',
    summary: 'Open this quiz to review requirements and begin your first attempt.',
  };
}

function matchesFilter(quiz: StudentQuizCourseItem, filter: QuizQueueFilter) {
  switch (filter) {
    case 'AVAILABLE':
      return quiz.attemptsRemaining > 0 && quiz.attemptsUsed === 0;
    case 'ATTEMPTED':
      return quiz.attemptsUsed > 0;
    case 'EXHAUSTED':
      return quiz.attemptsRemaining <= 0;
    default:
      return true;
  }
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
  const [activeFilter, setActiveFilter] = useState<QuizQueueFilter>('ALL');

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

  const metrics = useMemo(() => {
    const total = quizzes.length;
    const available = quizzes.filter((quiz) => quiz.attemptsRemaining > 0).length;
    const attempted = quizzes.filter((quiz) => quiz.attemptsUsed > 0).length;
    const exhausted = quizzes.filter((quiz) => quiz.attemptsRemaining <= 0).length;
    const attemptsRemaining = quizzes.reduce((sum, quiz) => sum + quiz.attemptsRemaining, 0);

    return { total, available, attempted, exhausted, attemptsRemaining };
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return quizzes.filter((quiz) => {
      const matchesSearch =
        !search ||
        quiz.title.toLowerCase().includes(search) ||
        (quiz.description ?? '').toLowerCase().includes(search);

      return matchesSearch && matchesFilter(quiz, activeFilter);
    });
  }, [activeFilter, quizzes, searchValue]);

  const availableQuizzes = filteredQuizzes.filter((quiz) => quiz.attemptsRemaining > 0 && quiz.attemptsUsed === 0);
  const attemptedQuizzes = filteredQuizzes.filter((quiz) => quiz.attemptsUsed > 0 && quiz.attemptsRemaining > 0);
  const exhaustedQuizzes = filteredQuizzes.filter((quiz) => quiz.attemptsRemaining <= 0);
  const firstActionableQuiz = availableQuizzes[0] ?? quizzes[0] ?? null;

  const renderQuizRow = (quiz: StudentQuizCourseItem, accent = false) => {
    const presentation = getQuizPresentation(quiz);

    return (
      <article
        key={quiz.id}
        className={`quiz-workspace__queue-card${accent ? ' quiz-workspace__queue-card--accent' : ''}`}
      >
        <div className="quiz-workspace__queue-header">
          <div className="quiz-workspace__queue-heading">
            <div className="quiz-workspace__queue-heading-copy">
              <Typography.Text className="client-card-title">{quiz.title}</Typography.Text>
              <Typography.Text className="client-meta">
                {quiz.description || 'Quiz requirements are available inside the quiz workspace.'}
              </Typography.Text>
            </div>
            <div className="quiz-workspace__queue-primary">
              <span className={presentation.badgeClassName}>{presentation.label}</span>
              <Button
                className={
                  presentation.primaryAction === 'View Details'
                    ? 'client-button client-button-secondary'
                    : 'client-button client-button-primary'
                }
                onClick={() => navigate(`/courses/${quiz.courseId}/quizzes/${quiz.id}`)}
                disabled={presentation.primaryAction === 'View Details' && quiz.attemptsRemaining <= 0 && quiz.attemptsUsed === 0}
              >
                {presentation.primaryAction}
              </Button>
            </div>
          </div>
          <div className="quiz-workspace__row-meta">
            <Typography.Text className="client-meta">{quiz.questionCount} questions</Typography.Text>
            <Typography.Text className="client-meta">Passing score {quiz.passingScore}%</Typography.Text>
            <Typography.Text className="client-meta">Max attempts {quiz.maxAttempts}</Typography.Text>
            <Typography.Text className="client-meta">{quiz.attemptsUsed} used</Typography.Text>
            <Typography.Text className="client-meta">{quiz.attemptsRemaining} remaining</Typography.Text>
          </div>
        </div>
        <Typography.Text className="client-body">{presentation.summary}</Typography.Text>
        <div className="quiz-workspace__queue-footer">
          <Typography.Text className="client-meta">
            {quiz.attemptsUsed > 0
              ? 'Review the latest attempt history and start a new attempt if attempts remain.'
              : 'Open the quiz workspace to review the quiz instructions before starting.'}
          </Typography.Text>
          <div className="quiz-workspace__queue-row-actions">
            <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${quiz.courseId}/quizzes/${quiz.id}`)}>
              View Details
            </Button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Quizzes"
        subtitle="Review quiz readiness, remaining attempts, and assessment work from one focused workspace."
        actions={
          <Button
            className="client-button client-button-secondary"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            Back to Course
          </Button>
        }
      >
        {quizzesQuery.isLoading || courseQuery.isLoading ? buildQuizListSkeleton() : null}

        {quizzesQuery.error ? (
          <section className="client-card quiz-workspace__state-card">
            <EmptyState
              title="Unable to load quizzes"
              description={quizzesQuery.error instanceof Error ? quizzesQuery.error.message : 'The quiz workspace could not be loaded right now.'}
              action={
                <Button className="client-button client-button-primary" onClick={() => quizzesQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          </section>
        ) : null}

        {!quizzesQuery.isLoading && !quizzes.length ? (
          <section className="client-card quiz-workspace__state-card">
            <EmptyState
              title="No quizzes are available for this course yet."
              description="Published quizzes will appear here when they are available in the course."
            />
          </section>
        ) : null}

        {!quizzesQuery.isLoading && quizzes.length ? (
          <div className="quiz-workspace__stack">
            <section className="client-card quiz-workspace__hero">
              <div className="quiz-workspace__hero-copy">
                <Typography.Text className="client-caption">
                  {courseQuery.data?.title ?? 'Quiz workspace'}
                </Typography.Text>
                <Typography.Title level={1} className="client-page-title">
                  Assessments & knowledge checks
                </Typography.Title>
                <Typography.Paragraph className="client-body">
                  Track available quizzes, remaining attempts, and the next assessment you should open.
                </Typography.Paragraph>
                <div className="quiz-workspace__hero-meta">
                  <span className="client-badge">{metrics.total} total quizzes</span>
                  <span className="client-badge client-badge-info">{metrics.available} available</span>
                  <span className="client-badge">{metrics.attempted} attempted</span>
                  {metrics.exhausted ? <span className="client-badge client-badge-warning">{metrics.exhausted} exhausted</span> : null}
                </div>
              </div>
              <div className="quiz-workspace__hero-summary">
                <Typography.Text className="client-card-title">Quiz readiness</Typography.Text>
                <div className="quiz-workspace__metric-grid">
                  <div className="quiz-workspace__metric-card quiz-workspace__metric-card--focus">
                    <Typography.Text className="client-meta">Available</Typography.Text>
                    <strong>{metrics.available}</strong>
                  </div>
                  <div className="quiz-workspace__metric-card">
                    <Typography.Text className="client-meta">Attempts Left</Typography.Text>
                    <strong>{metrics.attemptsRemaining}</strong>
                  </div>
                  <div className="quiz-workspace__metric-card">
                    <Typography.Text className="client-meta">Attempted</Typography.Text>
                    <strong>{metrics.attempted}</strong>
                  </div>
                  <div className={`quiz-workspace__metric-card${metrics.exhausted ? ' quiz-workspace__metric-card--warning' : ''}`}>
                    <Typography.Text className="client-meta">Exhausted</Typography.Text>
                    <strong>{metrics.exhausted}</strong>
                  </div>
                </div>
                {firstActionableQuiz ? (
                  <Button
                    className="client-button client-button-primary"
                    onClick={() => navigate(`/courses/${courseId}/quizzes/${firstActionableQuiz.id}`)}
                  >
                    {firstActionableQuiz.attemptsUsed > 0 && firstActionableQuiz.attemptsRemaining > 0 ? 'Open next quiz' : 'Start next quiz'}
                  </Button>
                ) : null}
              </div>
            </section>

            <div className="quiz-workspace__layout">
              <main className="quiz-workspace__main">
                <section className="client-card quiz-workspace__panel">
                  <div className="quiz-workspace__section-header">
                    <div className="quiz-workspace__section-header-copy">
                      <Typography.Text className="client-caption">Quiz queue</Typography.Text>
                      <Typography.Title level={3} className="client-section-title">
                        Manage quiz work
                      </Typography.Title>
                    </div>
                  </div>

                  <div className="quiz-workspace__queue-controls">
                    <Input
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder="Find assessments..."
                      prefix={<Search size={16} />}
                      className="quiz-workspace__search"
                    />
                    <Select<QuizQueueFilter>
                      value={activeFilter}
                      onChange={setActiveFilter}
                      className="quiz-workspace__queue-filter"
                      options={[
                        { value: 'ALL', label: 'All assessments' },
                        { value: 'AVAILABLE', label: 'Available' },
                        { value: 'ATTEMPTED', label: 'Attempted' },
                        { value: 'EXHAUSTED', label: 'No attempts left' },
                      ]}
                    />
                  </div>

                  {filteredQuizzes.length === 0 ? (
                    <EmptyState
                      title="No quizzes match this view."
                      description="Try a different filter or clear the search query."
                      compact
                    />
                  ) : (
                    <div className="quiz-workspace__stack">
                      {availableQuizzes.length ? (
                        <section className="quiz-workspace__stack">
                          <div className="quiz-workspace__section-header">
                            <div className="quiz-workspace__section-header-copy">
                              <Typography.Text className="client-caption">Available & due soon</Typography.Text>
                              <Typography.Title level={4} className="client-card-title">
                                Ready to take
                              </Typography.Title>
                            </div>
                          </div>
                          {availableQuizzes.map((quiz) => renderQuizRow(quiz, true))}
                        </section>
                      ) : null}

                      {attemptedQuizzes.length ? (
                        <section className="quiz-workspace__stack">
                          <div className="quiz-workspace__section-header">
                            <div className="quiz-workspace__section-header-copy">
                              <Typography.Text className="client-caption">Attempt history</Typography.Text>
                              <Typography.Title level={4} className="client-card-title">
                                Review or retake
                              </Typography.Title>
                            </div>
                          </div>
                          {attemptedQuizzes.map((quiz) => renderQuizRow(quiz))}
                        </section>
                      ) : null}

                      {exhaustedQuizzes.length ? (
                        <section className="quiz-workspace__stack">
                          <div className="quiz-workspace__section-header">
                            <div className="quiz-workspace__section-header-copy">
                              <Typography.Text className="client-caption">Attempts used</Typography.Text>
                              <Typography.Title level={4} className="client-card-title">
                                Review only
                              </Typography.Title>
                            </div>
                          </div>
                          {exhaustedQuizzes.map((quiz) => renderQuizRow(quiz))}
                        </section>
                      ) : null}
                    </div>
                  )}
                </section>
              </main>

              <aside className="quiz-workspace__sidebar">
                <section className="client-card quiz-workspace__sidebar-card">
                  <Typography.Text className="client-caption">Assessment status</Typography.Text>
                  <Typography.Title level={4} className="client-card-title">
                    Quiz overview
                  </Typography.Title>
                  <div className="quiz-workspace__status-grid">
                    <div className="quiz-workspace__status-tile">
                      <Typography.Text className="client-meta">Available</Typography.Text>
                      <strong>{metrics.available}</strong>
                    </div>
                    <div className="quiz-workspace__status-tile">
                      <Typography.Text className="client-meta">Attempted</Typography.Text>
                      <strong>{metrics.attempted}</strong>
                    </div>
                    <div className="quiz-workspace__status-tile">
                      <Typography.Text className="client-meta">Attempts Left</Typography.Text>
                      <strong>{metrics.attemptsRemaining}</strong>
                    </div>
                    <div className="quiz-workspace__status-tile">
                      <Typography.Text className="client-meta">No Attempts Left</Typography.Text>
                      <strong>{metrics.exhausted}</strong>
                    </div>
                  </div>
                </section>

                <section className="client-card quiz-workspace__sidebar-card">
                  <Typography.Text className="client-caption">Navigation</Typography.Text>
                  <Typography.Title level={4} className="client-card-title">
                    Quiz actions
                  </Typography.Title>
                  <Typography.Text className="client-meta">
                    Open the next available quiz or return to the course workspace if you need more preparation first.
                  </Typography.Text>
                  <div className="quiz-workspace__action-group">
                    {firstActionableQuiz ? (
                      <Button
                        className="client-button client-button-primary"
                        onClick={() => navigate(`/courses/${courseId}/quizzes/${firstActionableQuiz.id}`)}
                      >
                        Open next quiz
                      </Button>
                    ) : null}
                    <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}`)}>
                      Back to Course
                    </Button>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        ) : null}
      </ClientPageContainer>
    </ClientLayout>
  );
}

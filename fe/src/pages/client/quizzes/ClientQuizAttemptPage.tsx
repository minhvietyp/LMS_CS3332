import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { getCourseByIdRequest } from '../../../services/api/courseApi';
import {
  getStudentQuizDetailRequest,
  listMyQuizAttemptsRequest,
  startQuizAttemptRequest,
  submitQuizAttemptRequest,
  type StudentQuizAttempt,
} from '../../../services/api/quizApi';
import './ClientQuizPages.css';

function buildQuizAttemptSkeleton() {
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
          <div className="quiz-workspace__skeleton-block" />
        </div>
      </section>
    </div>
  );
}

function getAttemptStatus(attempt: StudentQuizAttempt) {
  return attempt.status ?? (attempt.submittedAt ? (attempt.isPassed ? 'PASSED' : 'FAILED') : 'STARTED');
}

function formatAttemptTimestamp(attempt: StudentQuizAttempt) {
  const source = attempt.submittedAt ?? attempt.createdAt;
  if (!source) return null;
  return new Date(source).toLocaleString();
}

export function ClientQuizAttemptPage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const navigate = useNavigate();
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const courseQuery = useQuery({
    queryKey: ['quiz', 'course-header', courseId],
    queryFn: () => getCourseByIdRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });

  const quizQuery = useQuery({
    queryKey: ['quiz', 'student-detail', quizId],
    queryFn: () => getStudentQuizDetailRequest(quizId!),
    enabled: Boolean(quizId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const attemptsQuery = useQuery({
    queryKey: ['quiz', 'student-attempts', quizId],
    queryFn: async () => (await listMyQuizAttemptsRequest(quizId!)) ?? [],
    enabled: Boolean(quizId),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const latestAttempt = attemptsQuery.data?.[0] ?? null;
  const startedAttempt = attemptsQuery.data?.find((attempt) => getAttemptStatus(attempt) === 'STARTED') ?? null;

  const startAttemptMutation = useMutation({
    mutationFn: () => startQuizAttemptRequest(quizId!),
    onSuccess: async (attempt) => {
      setCurrentAttemptId(attempt.id);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setSubmitError(null);
      await attemptsQuery.refetch();
      await quizQuery.refetch();
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : 'Failed to start quiz attempt.');
    },
  });

  const submitAttemptMutation = useMutation({
    mutationFn: () =>
      submitQuizAttemptRequest(quizId!, {
        attemptId: currentAttemptId!,
        answers: quizQuery.data!.questions.map((question) => ({
          questionId: question.id,
          selectedOptionId: selectedAnswers[question.id]!,
        })),
      }),
    onSuccess: async (attempt) => {
      setCurrentAttemptId(null);
      await attemptsQuery.refetch();
      await quizQuery.refetch();
      navigate(`/courses/${courseId}/quizzes/${quizId}/results/${attempt.id}`);
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit quiz attempt.');
    },
  });

  const quiz = quizQuery.data;
  const answeredCount = useMemo(
    () => quiz?.questions.filter((question) => Boolean(selectedAnswers[question.id])).length ?? 0,
    [quiz, selectedAnswers],
  );
  const totalQuestions = quiz?.questions.length ?? 0;
  const unansweredCount = totalQuestions - answeredCount;
  const allQuestionsAnswered = totalQuestions > 0 && unansweredCount === 0;
  const currentQuestion = quiz?.questions[currentQuestionIndex] ?? null;
  const currentQuestionNumber = currentQuestionIndex + 1;
  const progressPercent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <ClientLayout>
      <ClientPageContainer
        title={quiz?.title ?? 'Quiz Workspace'}
        subtitle="Review the quiz requirements, answer each question, and submit your attempt safely."
        actions={
          <div className="quiz-workspace__section-header-actions">
            <Button
              className="client-button client-button-secondary"
              icon={<ArrowLeft size={16} />}
              onClick={() => navigate(`/courses/${courseId}/quizzes`)}
            >
              Back to Quizzes
            </Button>
            <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}`)}>
              Back to Course
            </Button>
          </div>
        }
      >
        {quizQuery.isLoading || courseQuery.isLoading ? buildQuizAttemptSkeleton() : null}

        {quizQuery.error ? (
          <section className="client-card quiz-workspace__state-card">
            <EmptyState
              title="Unable to load quiz"
              description={quizQuery.error instanceof Error ? quizQuery.error.message : 'The quiz workspace could not be loaded right now.'}
              action={
                <Button className="client-button client-button-primary" onClick={() => quizQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          </section>
        ) : null}

        {!quizQuery.isLoading && !quiz ? (
          <section className="client-card quiz-workspace__state-card">
            <EmptyState title="Quiz not found." description="The quiz may have been removed or is no longer available." />
          </section>
        ) : null}

        {quiz ? (
          <div className="quiz-workspace__stack">
            <section className="client-card quiz-workspace__hero">
              <div className="quiz-workspace__hero-copy">
                <Typography.Text className="client-caption">
                  {courseQuery.data?.title ?? 'Quiz workspace'}
                </Typography.Text>
                <Typography.Title level={1} className="client-page-title">
                  {quiz.title}
                </Typography.Title>
                <Typography.Paragraph className="client-body">
                  {quiz.description || 'Review the quiz questions carefully and submit your attempt when you are ready.'}
                </Typography.Paragraph>
                <div className="quiz-workspace__hero-meta">
                  <span className="client-badge client-badge-info">
                    {currentAttemptId ? 'In Progress' : quiz.attemptsRemaining > 0 ? 'Available' : 'No Attempts Left'}
                  </span>
                  <Typography.Text className="client-meta">
                    Question progress {currentQuestion ? `${currentQuestionNumber}/${totalQuestions}` : `${totalQuestions} questions`}
                  </Typography.Text>
                  <Typography.Text className="client-meta">Attempts remaining {quiz.attemptsRemaining}</Typography.Text>
                </div>
              </div>
              <div className="quiz-workspace__hero-summary">
                <Typography.Text className="client-card-title">Attempt overview</Typography.Text>
                <div className="quiz-workspace__status-grid">
                  <div className="quiz-workspace__status-tile">
                    <Typography.Text className="client-meta">Questions</Typography.Text>
                    <strong>{totalQuestions}</strong>
                  </div>
                  <div className="quiz-workspace__status-tile">
                    <Typography.Text className="client-meta">Passing score</Typography.Text>
                    <strong>{quiz.passingScore}%</strong>
                  </div>
                  <div className="quiz-workspace__status-tile">
                    <Typography.Text className="client-meta">Attempts used</Typography.Text>
                    <strong>{quiz.attemptsUsed}</strong>
                  </div>
                  <div className="quiz-workspace__status-tile">
                    <Typography.Text className="client-meta">Attempts left</Typography.Text>
                    <strong>{quiz.attemptsRemaining}</strong>
                  </div>
                </div>
                {!currentAttemptId ? (
                  <div className="quiz-workspace__action-group">
                    {startedAttempt ? (
                      <Button
                        className="client-button client-button-primary"
                        onClick={() => {
                          setCurrentAttemptId(startedAttempt.id);
                          setCurrentQuestionIndex(0);
                          setSubmitError(null);
                        }}
                      >
                        Continue Attempt
                      </Button>
                    ) : null}
                    <Button
                      className="client-button client-button-primary"
                      onClick={() => startAttemptMutation.mutate()}
                      loading={startAttemptMutation.isPending}
                      disabled={quiz.attemptsRemaining <= 0}
                    >
                      Start Quiz
                    </Button>
                  </div>
                ) : (
                  <Typography.Text className="client-meta">
                    {allQuestionsAnswered
                      ? 'All answers are ready. Submit from the progress panel when you are ready.'
                      : 'Answer every question, then submit from the progress panel.'}
                  </Typography.Text>
                )}
              </div>
            </section>

            {submitError ? (
              <section className="client-card quiz-workspace__error-state">
                <Typography.Text className="client-card-title">Submission failed</Typography.Text>
                <Typography.Text className="client-meta">{submitError}</Typography.Text>
              </section>
            ) : null}

            {!currentAttemptId ? (
              <div className="quiz-workspace__layout">
                <main className="quiz-workspace__main">
                  <section className="client-card quiz-workspace__panel">
                    <div className="quiz-workspace__section-header">
                      <div className="quiz-workspace__section-header-copy">
                        <Typography.Text className="client-caption">Quiz instructions</Typography.Text>
                        <Typography.Title level={3} className="client-section-title">
                          Before you begin
                        </Typography.Title>
                      </div>
                    </div>
                    <div className="quiz-workspace__brief-grid">
                      <div className="quiz-workspace__brief-copy">
                        <Typography.Paragraph className="client-body">
                          {quiz.description || 'This quiz checks your understanding of the current course material.'}
                        </Typography.Paragraph>
                        <div className="quiz-workspace__brief-meta">
                          <span className="client-badge">{quiz.questions.length} questions</span>
                          <span className="client-badge">Passing score {quiz.passingScore}%</span>
                          <span className="client-badge">Max attempts {quiz.maxAttempts}</span>
                        </div>
                      </div>
                      <div className="quiz-workspace__brief-side">
                        <div className="quiz-workspace__brief-note">
                          <Typography.Text className="client-card-title">Attempt policy</Typography.Text>
                          <Typography.Text className="client-meta">
                            {quiz.attemptsRemaining > 0
                              ? `You can still start ${quiz.attemptsRemaining} more attempt${quiz.attemptsRemaining === 1 ? '' : 's'}.`
                              : 'No attempts remain for this quiz.'}
                          </Typography.Text>
                        </div>
                        <div className="quiz-workspace__brief-note">
                          <Typography.Text className="client-card-title">Result review</Typography.Text>
                          <Typography.Text className="client-meta">
                            Completed attempts can be reviewed from the attempt history panel when a result is available.
                          </Typography.Text>
                        </div>
                      </div>
                    </div>
                    {quiz.attemptsRemaining <= 0 && !startedAttempt ? (
                      <div className="quiz-workspace__warning-state">
                        <Typography.Text className="client-card-title">No attempts remaining</Typography.Text>
                        <Typography.Text className="client-meta">
                          You can review your latest submitted result, but you cannot start another attempt right now.
                        </Typography.Text>
                        {latestAttempt?.id ? (
                          <Button
                            className="client-button client-button-secondary"
                            onClick={() => navigate(`/courses/${courseId}/quizzes/${quizId}/results/${latestAttempt.id}`)}
                          >
                            Review latest result
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                </main>

                <aside className="quiz-workspace__sidebar">
                  <section className="client-card quiz-workspace__sidebar-card">
                    <Typography.Text className="client-caption">Attempt history</Typography.Text>
                    <Typography.Title level={4} className="client-card-title">
                      Previous attempts
                    </Typography.Title>
                    {!attemptsQuery.data?.length ? (
                      <EmptyState title="No attempts yet." description="Your quiz attempt history will appear here after you start the assessment." compact />
                    ) : (
                      <div className="quiz-workspace__history-list">
                        {attemptsQuery.data.map((attempt) => {
                          const status = getAttemptStatus(attempt);
                          return (
                            <article key={attempt.id} className="quiz-workspace__history-item">
                              <div className="quiz-workspace__history-item-title">
                                <Typography.Text className="client-card-title">
                                  Attempt #{attempt.attemptNumber}
                                  {attempt.id === latestAttempt?.id ? ' · Latest' : ''}
                                </Typography.Text>
                                <span
                                  className={
                                    status === 'PASSED'
                                      ? 'client-badge client-badge-success'
                                      : status === 'FAILED'
                                        ? 'client-badge client-badge-danger'
                                        : 'client-badge client-badge-info'
                                  }
                                >
                                  {status === 'PASSED' ? 'Passed' : status === 'FAILED' ? 'Failed' : 'Started'}
                                </span>
                              </div>
                              <Typography.Text className="client-meta">
                                {status === 'STARTED'
                                  ? 'Attempt in progress.'
                                  : `${status === 'PASSED' ? 'Passed' : 'Failed'} with score ${attempt.score ?? 0}%`}
                              </Typography.Text>
                              {formatAttemptTimestamp(attempt) ? (
                                <Typography.Text className="client-meta">
                                  {attempt.submittedAt ? 'Submitted' : 'Started'} {formatAttemptTimestamp(attempt)}
                                </Typography.Text>
                              ) : null}
                              <div className="quiz-workspace__history-actions">
                                {status === 'STARTED' ? (
                                  <Button
                                    className="client-button client-button-secondary"
                                    onClick={() => {
                                      setCurrentAttemptId(attempt.id);
                                      setCurrentQuestionIndex(0);
                                      setSubmitError(null);
                                    }}
                                  >
                                    Continue Attempt
                                  </Button>
                                ) : attempt.submittedAt ? (
                                  <Button
                                    className="client-button client-button-secondary"
                                    onClick={() => navigate(`/courses/${courseId}/quizzes/${quizId}/results/${attempt.id}`)}
                                  >
                                    View Result
                                  </Button>
                                ) : null}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </aside>
              </div>
            ) : (
              <div className="quiz-workspace__attempt-layout">
                <main className="quiz-workspace__attempt-main">
                  {currentQuestion ? (
                    <section className="client-card quiz-workspace__panel">
                      <div className="quiz-workspace__section-header">
                        <div className="quiz-workspace__section-header-copy">
                          <Typography.Text className="client-caption">Question {currentQuestionNumber} of {totalQuestions}</Typography.Text>
                          <Typography.Title level={3} className="client-section-title">
                            {currentQuestion.text}
                          </Typography.Title>
                        </div>
                      </div>

                      <div className="quiz-workspace__question-options">
                        {currentQuestion.answerOptions.map((option) => {
                          const isSelected = selectedAnswers[currentQuestion.id] === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              className={`quiz-workspace__option${isSelected ? ' quiz-workspace__option--selected' : ''}`}
                              onClick={() =>
                                setSelectedAnswers((current) => ({
                                  ...current,
                                  [currentQuestion.id]: option.id,
                                }))
                              }
                            >
                              <span className="quiz-workspace__option-indicator" aria-hidden="true">
                                {String.fromCharCode(65 + currentQuestion.answerOptions.indexOf(option))}
                              </span>
                              <span className="quiz-workspace__option-copy">
                                <strong>{option.text}</strong>
                                <Typography.Text className="client-meta">
                                  {isSelected ? 'Selected answer' : 'Select this option'}
                                </Typography.Text>
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="quiz-workspace__attempt-actions">
                        <Button
                          className="client-button client-button-secondary"
                          disabled={currentQuestionIndex === 0}
                          onClick={() => setCurrentQuestionIndex((index) => Math.max(0, index - 1))}
                        >
                          Previous
                        </Button>
                        <div className="quiz-workspace__attempt-actions-right">
                          {selectedAnswers[currentQuestion.id] ? (
                            <Button
                              className="client-button client-button-ghost"
                              onClick={() =>
                                setSelectedAnswers((current) => {
                                  const next = { ...current };
                                  delete next[currentQuestion.id];
                                  return next;
                                })
                              }
                            >
                              Clear Answer
                            </Button>
                          ) : null}
                          <Button
                            className="client-button client-button-secondary"
                            disabled={currentQuestionIndex >= totalQuestions - 1}
                            icon={<ArrowRight size={16} />}
                            onClick={() => setCurrentQuestionIndex((index) => Math.min(totalQuestions - 1, index + 1))}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </section>
                  ) : null}
                </main>

                <aside className="quiz-workspace__attempt-sidebar">
                  <section className="client-card quiz-workspace__sidebar-card quiz-workspace__sidebar-card--focus">
                    <Typography.Text className="client-caption">Quiz progress</Typography.Text>
                    <Typography.Title level={4} className="client-card-title">
                      Progress panel
                    </Typography.Title>
                    <div className="quiz-workspace__progress-stat">
                      <strong>{progressPercent}%</strong>
                      <Typography.Text className="client-meta">{answeredCount}/{totalQuestions} answered</Typography.Text>
                    </div>
                    <div className="quiz-workspace__progress-bar">
                      <span className="quiz-workspace__progress-bar-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div className="quiz-workspace__status-grid">
                      <div className="quiz-workspace__status-tile">
                        <Typography.Text className="client-meta">Answered</Typography.Text>
                        <strong>{answeredCount}</strong>
                      </div>
                      <div className="quiz-workspace__status-tile">
                        <Typography.Text className="client-meta">Unanswered</Typography.Text>
                        <strong>{unansweredCount}</strong>
                      </div>
                    </div>
                  </section>

                  <section className="client-card quiz-workspace__sidebar-card">
                    <Typography.Text className="client-caption">Question navigator</Typography.Text>
                    <Typography.Title level={4} className="client-card-title">
                      Jump between questions
                    </Typography.Title>
                    <div className="quiz-workspace__navigator-grid">
                      {quiz.questions.map((question, index) => {
                        const isCurrent = index === currentQuestionIndex;
                        const isAnswered = Boolean(selectedAnswers[question.id]);
                        return (
                          <button
                            key={question.id}
                            type="button"
                            className={`quiz-workspace__navigator-item${isCurrent ? ' quiz-workspace__navigator-item--current' : ''}${isAnswered ? ' quiz-workspace__navigator-item--answered' : ''}`}
                            onClick={() => setCurrentQuestionIndex(index)}
                            aria-label={`Question ${index + 1}${isAnswered ? ', answered' : ', unanswered'}${isCurrent ? ', current question' : ''}`}
                          >
                            {index + 1}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="client-card quiz-workspace__sidebar-card">
                    <Typography.Text className="client-caption">Attempt info</Typography.Text>
                    <Typography.Title level={4} className="client-card-title">
                      Submission panel
                    </Typography.Title>
                    <Typography.Text className="client-meta">
                      {allQuestionsAnswered
                        ? 'All questions are answered and ready for submission.'
                        : `${unansweredCount} question${unansweredCount === 1 ? '' : 's'} still need an answer before you can submit.`}
                    </Typography.Text>
                    <div className="quiz-workspace__action-group">
                      <Button
                        className="client-button client-button-primary"
                        icon={<CheckCircle2 size={16} />}
                        onClick={() => submitAttemptMutation.mutate()}
                        loading={submitAttemptMutation.isPending}
                        disabled={!allQuestionsAnswered}
                      >
                        Submit Quiz
                      </Button>
                      <Button
                        className="client-button client-button-ghost"
                        onClick={() => navigate(`/courses/${courseId}/quizzes`)}
                      >
                        Back to Quizzes
                      </Button>
                    </div>
                  </section>
                </aside>
              </div>
            )}
          </div>
        ) : null}
      </ClientPageContainer>
    </ClientLayout>
  );
}

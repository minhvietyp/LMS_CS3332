import { useQuery } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { getCourseByIdRequest } from '../../../services/api/courseApi';
import { getQuizAttemptResultRequest, getStudentQuizDetailRequest } from '../../../services/api/quizApi';
import './ClientQuizPages.css';

function buildQuizResultSkeleton() {
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

export function ClientQuizResultPage() {
  const { courseId, quizId, attemptId } = useParams<{ courseId: string; quizId: string; attemptId: string }>();
  const navigate = useNavigate();

  const courseQuery = useQuery({
    queryKey: ['quiz-result', 'course-header', courseId],
    queryFn: () => getCourseByIdRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });

  const quizQuery = useQuery({
    queryKey: ['quiz-result', 'quiz-detail', quizId],
    queryFn: () => getStudentQuizDetailRequest(quizId!),
    enabled: Boolean(quizId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const resultQuery = useQuery({
    queryKey: ['quiz', 'student-result', quizId, attemptId],
    queryFn: () => getQuizAttemptResultRequest(quizId!, attemptId!),
    enabled: Boolean(quizId && attemptId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const result = resultQuery.data;
  const canRetake = (quizQuery.data?.attemptsRemaining ?? 0) > 0;

  return (
    <ClientLayout>
      <ClientPageContainer
        title={result?.quiz.title ?? 'Quiz Result'}
        subtitle="Review your score, pass status, and answer breakdown for this attempt."
        actions={
          <div className="quiz-workspace__section-header-actions">
            <Button
              className="client-button client-button-secondary"
              icon={<ArrowLeft size={16} />}
              onClick={() => navigate(`/courses/${courseId}/quizzes/${quizId}`)}
            >
              Back to Quiz
            </Button>
            <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}/quizzes`)}>
              Back to Quizzes
            </Button>
            <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}`)}>
              Back to Course
            </Button>
          </div>
        }
      >
        {resultQuery.isLoading || courseQuery.isLoading || quizQuery.isLoading ? buildQuizResultSkeleton() : null}

        {resultQuery.error ? (
          <section className="client-card quiz-workspace__state-card">
            <EmptyState
              title="Unable to load quiz result"
              description={resultQuery.error instanceof Error ? resultQuery.error.message : 'The result workspace could not be loaded right now.'}
              action={
                <Button className="client-button client-button-primary" onClick={() => resultQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          </section>
        ) : null}

        {!resultQuery.isLoading && !result ? (
          <section className="client-card quiz-workspace__state-card">
            <EmptyState
              title="Quiz result not found."
              description="This result may have been removed or is not available for review."
            />
          </section>
        ) : null}

        {result ? (
          <div className="quiz-workspace__stack">
            <section className="client-card quiz-workspace__hero">
              <div className="quiz-workspace__hero-copy">
                <Typography.Text className="client-caption">
                  {courseQuery.data?.title ?? 'Quiz result'}
                </Typography.Text>
                <Typography.Title level={1} className="client-page-title">
                  {result.quiz.title}
                </Typography.Title>
                <Typography.Paragraph className="client-body">
                  Review your submitted answers, pass status, and the latest quiz result for this attempt.
                </Typography.Paragraph>
                <div className="quiz-workspace__hero-meta">
                  <span className={result.isPassed ? 'client-badge client-badge-success' : 'client-badge client-badge-danger'}>
                    {result.isPassed ? 'Passed' : 'Failed'}
                  </span>
                  {!result.isPassed ? (
                    <Typography.Text className="client-meta">Needs another attempt</Typography.Text>
                  ) : null}
                  <Typography.Text className="client-meta">Attempt #{result.attemptNumber}</Typography.Text>
                  <Typography.Text className="client-meta">{new Date(result.submittedAt).toLocaleString()}</Typography.Text>
                </div>
              </div>
              <div className="quiz-workspace__hero-summary">
                <Typography.Text className="client-card-title">Result summary</Typography.Text>
                <div className="quiz-workspace__status-grid">
                  <div className="quiz-workspace__status-tile">
                    <Typography.Text className="client-meta">Score</Typography.Text>
                    <strong>Score {result.score}%</strong>
                  </div>
                  <div className="quiz-workspace__status-tile">
                    <Typography.Text className="client-meta">Correct</Typography.Text>
                    <strong>{result.correctCount}/{result.totalQuestions} correct</strong>
                  </div>
                  <div className="quiz-workspace__status-tile">
                    <Typography.Text className="client-meta">Passing score</Typography.Text>
                    <strong>{result.quiz.passingScore}%</strong>
                  </div>
                  <div className="quiz-workspace__status-tile">
                    <Typography.Text className="client-meta">Attempts left</Typography.Text>
                    <strong>{quizQuery.data?.attemptsRemaining ?? 'Unknown'}</strong>
                  </div>
                </div>
                <div className="quiz-workspace__action-group">
                  {canRetake ? (
                    <Button className="client-button client-button-primary" onClick={() => navigate(`/courses/${courseId}/quizzes/${quizId}`)}>
                      Retake Quiz
                    </Button>
                  ) : null}
                  <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}/quizzes/${quizId}`)}>
                    Review Result
                  </Button>
                </div>
              </div>
            </section>

            <div className="quiz-workspace__result-layout">
              <main className="quiz-workspace__main">
                <section className="client-card quiz-workspace__panel">
                  <div className="quiz-workspace__section-header">
                    <div className="quiz-workspace__section-header-copy">
                      <Typography.Text className="client-caption">Answer review</Typography.Text>
                      <Typography.Title level={3} className="client-section-title">
                        Review your answers
                      </Typography.Title>
                    </div>
                  </div>

                  {result.answers.length ? (
                    <div className="quiz-workspace__review-list">
                      {result.answers.map((answer, index) => (
                        <article key={answer.questionId} className="quiz-workspace__review-card">
                          <div className="quiz-workspace__review-header">
                            <Typography.Title level={5} className="client-card-title">
                              {index + 1}. {answer.questionText}
                            </Typography.Title>
                            <span className={answer.isCorrect ? 'client-badge client-badge-success' : 'client-badge client-badge-danger'}>
                              {answer.isCorrect ? (
                                <>
                                  <CheckCircle2 size={14} /> Correct
                                </>
                              ) : (
                                <>
                                  <XCircle size={14} /> Incorrect
                                </>
                              )}
                            </span>
                          </div>
                          <div className="quiz-workspace__review-grid">
                            <div className="quiz-workspace__review-answer quiz-workspace__review-answer--selected">
                              <Typography.Text className="client-meta">Your answer:</Typography.Text>
                              <Typography.Text className="client-card-title">
                                {answer.selectedOptionText ?? 'No answer submitted'}
                              </Typography.Text>
                            </div>
                            <div className="quiz-workspace__review-answer quiz-workspace__review-answer--correct">
                              <Typography.Text className="client-meta">Correct answer:</Typography.Text>
                              <Typography.Text className="client-card-title">
                                {answer.correctOptionText ?? 'Unavailable'}
                              </Typography.Text>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="Detailed review is not available for this quiz."
                      description="This attempt does not include per-question review data."
                      compact
                    />
                  )}
                </section>
              </main>

              <aside className="quiz-workspace__sidebar">
                <section className="client-card quiz-workspace__sidebar-card">
                  <Typography.Text className="client-caption">Result actions</Typography.Text>
                  <Typography.Title level={4} className="client-card-title">
                    Next steps
                  </Typography.Title>
                  <Typography.Text className="client-meta">
                    Return to the quiz workspace to review attempt history or start another attempt if your attempt policy allows it.
                  </Typography.Text>
                  <div className="quiz-workspace__action-group">
                    {canRetake ? (
                      <Button className="client-button client-button-primary" onClick={() => navigate(`/courses/${courseId}/quizzes/${quizId}`)}>
                        Retake Quiz
                      </Button>
                    ) : null}
                    <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}/quizzes`)}>
                      Back to Quizzes
                    </Button>
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

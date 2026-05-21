import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Radio, Skeleton, Space, Tag, Typography } from 'antd';
import { ArrowLeft, CheckCircle2, PlayCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../components/client/layout';
import {
  getStudentQuizDetailRequest,
  listMyQuizAttemptsRequest,
  startQuizAttemptRequest,
  submitQuizAttemptRequest,
} from '../services/quizApi';
import './ClientQuizPages.css';

export function ClientQuizAttemptPage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const navigate = useNavigate();
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const quizQuery = useQuery({
    queryKey: ['quiz', 'student-detail', quizId],
    queryFn: () => getStudentQuizDetailRequest(quizId!),
    enabled: Boolean(quizId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const attemptsQuery = useQuery({
    queryKey: ['quiz', 'student-attempts', quizId],
    queryFn: () => listMyQuizAttemptsRequest(quizId!),
    enabled: Boolean(quizId),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const startAttemptMutation = useMutation({
    mutationFn: () => startQuizAttemptRequest(quizId!),
    onSuccess: (attempt) => {
      setCurrentAttemptId(attempt.id);
      setSelectedAnswers({});
      setSubmitError(null);
      void attemptsQuery.refetch();
      void quizQuery.refetch();
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
          selectedOptionId: selectedAnswers[question.id],
        })),
      }),
    onSuccess: (attempt) => {
      setCurrentAttemptId(null);
      void attemptsQuery.refetch();
      void quizQuery.refetch();
      navigate(`/courses/${courseId}/quizzes/${quizId}/results/${attempt.id}`);
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit quiz attempt.');
    },
  });

  const quiz = quizQuery.data;
  const allQuestionsAnswered = useMemo(
    () => quiz?.questions.every((question) => Boolean(selectedAnswers[question.id])) ?? false,
    [quiz, selectedAnswers],
  );

  const latestAttempt = attemptsQuery.data?.[0];
  const getAttemptStatus = (attempt: NonNullable<typeof attemptsQuery.data>[number]) =>
    attempt.status ?? (attempt.submittedAt ? (attempt.isPassed ? 'PASSED' : 'FAILED') : 'STARTED');
  const formatAttemptTimestamp = (attempt: NonNullable<typeof attemptsQuery.data>[number]) => {
    const source = attempt.submittedAt ?? attempt.createdAt;
    if (!source) {
      return null;
    }

    return new Date(source).toLocaleString();
  };

  return (
    <ClientLayout>
      <ClientPageContainer
        title={quiz?.title ?? 'Quiz Attempt'}
        subtitle={quiz?.description ?? 'Review the quiz instructions, then start your attempt when ready.'}
        actions={
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      >
        {quizQuery.isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        {quizQuery.error ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load quiz"
            description={quizQuery.error instanceof Error ? quizQuery.error.message : 'Unexpected error'}
          />
        ) : null}
        {!quizQuery.isLoading && !quiz ? <Empty description="Quiz not found." /> : null}

        {quiz ? (
          <div className="client-quiz-attempt-layout">
            <Card className="client-quiz-attempt-panel">
              {!currentAttemptId ? (
                <Space direction="vertical" size={18} style={{ width: '100%' }}>
                  <div className="client-quiz-card__header">
                    <div>
                      <Typography.Title level={3}>{quiz.title}</Typography.Title>
                      <Typography.Paragraph type="secondary">
                        {quiz.description || 'Complete this quiz to check your understanding of the course material.'}
                      </Typography.Paragraph>
                    </div>
                    <Tag color={quiz.attemptsRemaining > 0 ? 'green' : 'red'}>
                      {quiz.attemptsRemaining > 0 ? `${quiz.attemptsRemaining} attempts remaining` : 'Attempts exhausted'}
                    </Tag>
                  </div>

                  <div className="client-quiz-card__meta">
                    <Tag color="blue">{quiz.questions.length} questions</Tag>
                    <Tag color="purple">Passing score {quiz.passingScore}%</Tag>
                    <Tag color="geekblue">Max attempts {quiz.maxAttempts}</Tag>
                    <Tag>{quiz.attemptsUsed} used</Tag>
                  </div>

                  {quiz.attemptsRemaining <= 0 ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="You have used all available attempts for this quiz."
                      description="You can still review your most recent result, but you cannot start another attempt."
                    />
                  ) : null}

                  {submitError ? <Alert type="error" showIcon message={submitError} /> : null}

                  <div className="client-quiz-card__actions">
                    <Button
                      type="primary"
                      icon={<PlayCircle size={16} />}
                      onClick={() => startAttemptMutation.mutate()}
                      loading={startAttemptMutation.isPending}
                      disabled={quiz.attemptsRemaining <= 0}
                    >
                      Start attempt
                    </Button>
                    {latestAttempt?.id ? (
                      <Button onClick={() => navigate(`/courses/${courseId}/quizzes/${quizId}/results/${latestAttempt.id}`)}>
                        Review latest result
                      </Button>
                    ) : null}
                  </div>
                </Space>
              ) : (
                <Space direction="vertical" size={18} style={{ width: '100%' }}>
                  <div className="client-quiz-card__header">
                    <div>
                      <Typography.Title level={3}>{quiz.title}</Typography.Title>
                      <Typography.Text type="secondary">
                        Attempt #{(attemptsQuery.data?.length ?? 0) + 1}
                      </Typography.Text>
                    </div>
                    <Tag color="blue">In progress</Tag>
                  </div>

                  {submitError ? <Alert type="error" showIcon message={submitError} /> : null}

                  {quiz.questions.map((question, index) => (
                    <div key={question.id} className="client-quiz-question">
                      <div className="client-quiz-question__prompt">
                        <Typography.Title level={5}>
                          {index + 1}. {question.text}
                        </Typography.Title>
                      </div>
                      <Radio.Group
                        className="client-quiz-option-group"
                        value={selectedAnswers[question.id]}
                        onChange={(event) => {
                          setSelectedAnswers((current) => ({
                            ...current,
                            [question.id]: event.target.value,
                          }));
                        }}
                      >
                        <Space direction="vertical" size={10}>
                          {question.answerOptions.map((option) => (
                            <Radio key={option.id} value={option.id}>
                              {option.text}
                            </Radio>
                          ))}
                        </Space>
                      </Radio.Group>
                    </div>
                  ))}

                  <div className="client-quiz-attempt-actions">
                    <Button onClick={() => setCurrentAttemptId(null)}>Cancel attempt</Button>
                    <Button
                      type="primary"
                      icon={<CheckCircle2 size={16} />}
                      onClick={() => submitAttemptMutation.mutate()}
                      loading={submitAttemptMutation.isPending}
                      disabled={!allQuestionsAnswered}
                    >
                      Submit attempt
                    </Button>
                  </div>
                </Space>
              )}
            </Card>

            <Card className="client-quiz-attempt-sidebar">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Typography.Title level={4}>Attempt history</Typography.Title>
                {!attemptsQuery.data?.length ? (
                  <Empty description="No attempts yet." />
                ) : (
                  <div className="client-quiz-attempt-history">
                    {attemptsQuery.data.map((attempt) => (
                      <div key={attempt.id} className="client-quiz-attempt-history__item">
                        {(() => {
                          const status = getAttemptStatus(attempt);

                          return (
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <div className="client-quiz-result-answer__row">
                            <strong>
                              Attempt #{attempt.attemptNumber}
                              {attempt.id === latestAttempt?.id ? ' · Latest' : ''}
                            </strong>
                            <Tag color={status === 'PASSED' ? 'green' : status === 'FAILED' ? 'red' : 'blue'}>
                              {status === 'PASSED' ? 'Passed' : status === 'FAILED' ? 'Failed' : 'Started'}
                            </Tag>
                          </div>
                          <Typography.Text type="secondary">
                            {status === 'STARTED'
                              ? 'Attempt in progress.'
                              : `${status === 'PASSED' ? 'Passed' : 'Failed'} with score ${attempt.score ?? 0}%`}
                          </Typography.Text>
                          {formatAttemptTimestamp(attempt) ? (
                            <Typography.Text type="secondary" className="client-quiz-attempt-history__time">
                              {attempt.submittedAt ? 'Submitted' : 'Started'} {formatAttemptTimestamp(attempt)}
                            </Typography.Text>
                          ) : null}
                          {attempt.submittedAt ? (
                            <Button size="small" onClick={() => navigate(`/courses/${courseId}/quizzes/${quizId}/results/${attempt.id}`)}>
                              View result
                            </Button>
                          ) : null}
                        </Space>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </Space>
            </Card>
          </div>
        ) : null}
      </ClientPageContainer>
    </ClientLayout>
  );
}

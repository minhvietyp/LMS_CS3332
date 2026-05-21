import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Skeleton, Space, Tag, Typography } from 'antd';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../components/client/layout';
import { getQuizAttemptResultRequest } from '../services/quizApi';
import './ClientQuizPages.css';

export function ClientQuizResultPage() {
  const { courseId, quizId, attemptId } = useParams<{ courseId: string; quizId: string; attemptId: string }>();
  const navigate = useNavigate();

  const resultQuery = useQuery({
    queryKey: ['quiz', 'student-result', quizId, attemptId],
    queryFn: () => getQuizAttemptResultRequest(quizId!, attemptId!),
    enabled: Boolean(quizId && attemptId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const result = resultQuery.data;

  return (
    <ClientLayout>
      <ClientPageContainer
        title={result?.quiz.title ?? 'Quiz Result'}
        subtitle="Review your score, pass status, and the answer breakdown for this attempt."
        actions={
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(`/courses/${courseId}/quizzes/${quizId}`)}>
            Back to quiz
          </Button>
        }
      >
        {resultQuery.isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        {resultQuery.error ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load quiz result"
            description={resultQuery.error instanceof Error ? resultQuery.error.message : 'Unexpected error'}
          />
        ) : null}
        {!resultQuery.isLoading && !result ? <Empty description="Quiz result not found." /> : null}

        {result ? (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Card className="client-quiz-result-card">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div className="client-quiz-result-card__header">
                  <div>
                    <Typography.Title level={3}>{result.quiz.title}</Typography.Title>
                    <Typography.Text type="secondary">
                      Attempt #{result.attemptNumber}
                    </Typography.Text>
                  </div>
                  <Tag color={result.isPassed ? 'green' : 'red'}>
                    {result.isPassed ? 'Passed' : 'Needs another attempt'}
                  </Tag>
                </div>

                <div className="client-quiz-card__meta">
                  <Tag color="blue">Score {result.score}%</Tag>
                  <Tag color={result.isPassed ? 'green' : 'red'}>
                    {result.correctCount}/{result.totalQuestions} correct
                  </Tag>
                  <Tag color="purple">Passing score {result.quiz.passingScore}%</Tag>
                  <Tag>{new Date(result.submittedAt).toLocaleString()}</Tag>
                </div>
              </Space>
            </Card>

            {result.answers.map((answer, index) => (
              <Card key={answer.questionId} className="client-quiz-result-card">
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div className="client-quiz-result-answer__row">
                    <Typography.Title level={5}>
                      {index + 1}. {answer.questionText}
                    </Typography.Title>
                    <Tag color={answer.isCorrect ? 'green' : 'red'}>
                      {answer.isCorrect ? (
                        <Space size={4}>
                          <CheckCircle2 size={14} />
                          Correct
                        </Space>
                      ) : (
                        <Space size={4}>
                          <XCircle size={14} />
                          Incorrect
                        </Space>
                      )}
                    </Tag>
                  </div>

                  <div className="client-quiz-result-answer">
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Typography.Text>
                        Your answer: <strong>{answer.selectedOptionText ?? 'No answer submitted'}</strong>
                      </Typography.Text>
                      <Typography.Text>
                        Correct answer: <strong>{answer.correctOptionText ?? 'Unavailable'}</strong>
                      </Typography.Text>
                    </Space>
                  </div>
                </Space>
              </Card>
            ))}
          </Space>
        ) : null}
      </ClientPageContainer>
    </ClientLayout>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Skeleton, Space, Tag, Typography } from 'antd';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../components/client/layout';
import { listStudentCourseQuizzesRequest } from '../services/quizApi';
import './ClientQuizPages.css';

export function ClientCourseQuizzesPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const quizzesQuery = useQuery({
    queryKey: ['quizzes', 'student-course', courseId],
    queryFn: () => listStudentCourseQuizzesRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Course Quizzes"
        subtitle="Review available quizzes, remaining attempts, and your current assessment readiness."
        actions={
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      >
        {quizzesQuery.isLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
        {quizzesQuery.error ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load quizzes"
            description={quizzesQuery.error instanceof Error ? quizzesQuery.error.message : 'Unexpected error'}
          />
        ) : null}
        {!quizzesQuery.isLoading && !quizzesQuery.data?.length ? (
          <Empty description="No published quizzes are available for this course yet." />
        ) : null}

        <div className="client-quiz-grid">
          {quizzesQuery.data?.map((quiz) => (
            <Card key={quiz.id} className="client-quiz-card">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <div className="client-quiz-card__header">
                  <div>
                    <Typography.Title level={4}>{quiz.title}</Typography.Title>
                    <Typography.Paragraph type="secondary">
                      {quiz.description || 'No quiz description provided.'}
                    </Typography.Paragraph>
                  </div>
                  <Tag color={quiz.attemptsRemaining > 0 ? 'green' : 'red'}>
                    {quiz.attemptsRemaining > 0 ? 'Available' : 'Attempts exhausted'}
                  </Tag>
                </div>

                <div className="client-quiz-card__meta">
                  <Tag color="blue">{quiz.questionCount} questions</Tag>
                  <Tag color="purple">Passing score {quiz.passingScore}%</Tag>
                  <Tag color="geekblue">Max attempts {quiz.maxAttempts}</Tag>
                  <Tag>{quiz.attemptsUsed} used</Tag>
                  <Tag color={quiz.attemptsRemaining > 0 ? 'green' : 'default'}>
                    {quiz.attemptsRemaining} remaining
                  </Tag>
                </div>

                <div className="client-quiz-card__actions">
                  <Button
                    type="primary"
                    icon={<PlayCircle size={16} />}
                    onClick={() => navigate(`/courses/${quiz.courseId}/quizzes/${quiz.id}`)}
                    disabled={quiz.attemptsRemaining <= 0}
                  >
                    {quiz.attemptsRemaining > 0 ? 'Open quiz' : 'No attempts left'}
                  </Button>
                </div>
              </Space>
            </Card>
          ))}
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}

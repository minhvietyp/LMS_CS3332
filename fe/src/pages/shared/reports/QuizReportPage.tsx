import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Empty, Row, Select, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { listCoursesRequest } from '../../../services/api/courseApi';
import { listCourseQuizzesRequest, type QuizListItem } from '../../../services/api/quizApi';
import './InstructorReports.css';

export function QuizReportPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>();

  const coursesQuery = useQuery({
    queryKey: ['reports', 'quiz', 'courses'],
    queryFn: async () => {
      const response = await listCoursesRequest({ page: 1, limit: 50 });
      return response.data;
    },
    staleTime: 60_000,
  });
  const effectiveSelectedCourseId = selectedCourseId ?? coursesQuery.data?.[0]?.id;
  const selectedCourse = useMemo(
    () => coursesQuery.data?.find((course) => course.id === effectiveSelectedCourseId),
    [coursesQuery.data, effectiveSelectedCourseId],
  );

  const quizzesQuery = useQuery({
    queryKey: ['reports', 'quiz', 'list', effectiveSelectedCourseId],
    queryFn: () => listCourseQuizzesRequest(effectiveSelectedCourseId!),
    enabled: Boolean(effectiveSelectedCourseId),
    staleTime: 60_000,
  });

  const summary = useMemo(() => {
    const quizzes = quizzesQuery.data ?? [];
    const published = quizzes.filter((quiz) => quiz.isPublished).length;
    const totalQuestions = quizzes.reduce((total, quiz) => total + quiz.questions.length, 0);
    const totalAttempts = quizzes.reduce((total, quiz) => total + (quiz._count?.attempts ?? quiz.attempts?.length ?? 0), 0);

    return {
      totalQuizzes: quizzes.length,
      published,
      draft: quizzes.length - published,
      totalQuestions,
      totalAttempts,
    };
  }, [quizzesQuery.data]);

  const columns = useMemo<ColumnsType<QuizListItem>>(
    () => [
      {
        title: 'Quiz',
        dataIndex: 'title',
        key: 'title',
      },
      {
        title: 'Questions',
        key: 'questions',
        render: (_, record) => record.questions.length,
      },
      {
        title: 'Passing Score',
        dataIndex: 'passingScore',
        key: 'passingScore',
        render: (value: number) => `${value}%`,
      },
      {
        title: 'Attempts',
        key: 'attempts',
        render: (_, record) => record._count?.attempts ?? record.attempts?.length ?? 0,
      },
      {
        title: 'Status',
        key: 'status',
        render: (_, record) => <Tag color={record.isPublished ? 'green' : 'default'}>{record.isPublished ? 'Published' : 'Draft'}</Tag>,
      },
    ],
    [],
  );

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Quiz Reports"
        subtitle="Track quiz readiness, attempt volume, and assessment difficulty signals by course."
        actions={
          <Select
            placeholder="Select course"
            value={effectiveSelectedCourseId}
            className="report-page__select"
            options={(coursesQuery.data ?? []).map((course) => ({ label: course.title, value: course.id }))}
            onChange={(value) => setSelectedCourseId(value)}
          />
        }
      >
        <main className="instructor-report-page">
          {coursesQuery.isLoading ? <Spin tip="Loading quiz reports..." /> : null}
          {coursesQuery.error ? (
            <Alert
              type="error"
              showIcon
              message="Failed to load courses"
              description={coursesQuery.error instanceof Error ? coursesQuery.error.message : 'Unexpected error'}
            />
          ) : null}
          {quizzesQuery.error ? (
            <Alert
              type="error"
              showIcon
              message="Failed to load quizzes"
              description={quizzesQuery.error instanceof Error ? quizzesQuery.error.message : 'Unexpected error'}
            />
          ) : null}

          {effectiveSelectedCourseId ? (
            <>
              <Card className="instructor-report-page__hero-card">
                <div>
                  <Typography.Text className="instructor-report-page__eyebrow">Selected report scope</Typography.Text>
                  <Typography.Title level={3}>{selectedCourse?.title ?? 'Selected course'}</Typography.Title>
                  <Typography.Paragraph type="secondary">
                    Quiz readiness and attempt volume are derived from the selected course quiz API response.
                  </Typography.Paragraph>
                </div>
                <Tag color={selectedCourse?.status === 'PUBLISHED' ? 'green' : 'default'}>
                  {selectedCourse?.status ?? 'COURSE'}
                </Tag>
              </Card>

              <Row gutter={[16, 16]} className="instructor-report-page__summary">
                <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Quizzes" value={summary.totalQuizzes} /></Card></Col>
                <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Published / Draft" value={`${summary.published} / ${summary.draft}`} /></Card></Col>
                <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Question Bank Size" value={summary.totalQuestions} /></Card></Col>
                <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Attempt Volume" value={summary.totalAttempts} /></Card></Col>
              </Row>

              <Card className="instructor-report-page__table-card">
                <div className="instructor-report-page__section-heading">
                  <div>
                    <Typography.Title level={4}>Quiz readiness</Typography.Title>
                    <Typography.Text type="secondary">
                      Attempts are shown only when returned by the quiz API.
                    </Typography.Text>
                  </div>
                </div>
                <Table
                  rowKey="id"
                  columns={columns}
                  dataSource={quizzesQuery.data ?? []}
                  loading={quizzesQuery.isLoading}
                  pagination={false}
                  scroll={{ x: 820 }}
                  locale={{ emptyText: 'No quizzes found for this course.' }}
                />
              </Card>
            </>
          ) : (
            <Empty description="Choose a course to review quiz analytics." />
          )}
        </main>
      </ClientPageContainer>
    </ClientLayout>
  );
}

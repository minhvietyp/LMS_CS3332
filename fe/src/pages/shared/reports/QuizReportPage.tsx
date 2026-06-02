import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Empty, Row, Select, Spin, Statistic, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { listCoursesRequest } from '../../../services/api/courseApi';
import { listCourseQuizzesRequest, type QuizListItem } from '../../../services/api/quizApi';

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

  const quizzesQuery = useQuery({
    queryKey: ['reports', 'quiz', 'list', selectedCourseId],
    queryFn: () => listCourseQuizzesRequest(selectedCourseId!),
    enabled: Boolean(selectedCourseId),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!selectedCourseId && coursesQuery.data?.length) {
      setSelectedCourseId(coursesQuery.data[0].id);
    }
  }, [coursesQuery.data, selectedCourseId]);

  const summary = useMemo(() => {
    const quizzes = quizzesQuery.data ?? [];
    const published = quizzes.filter((quiz) => quiz.isPublished).length;
    const totalQuestions = quizzes.reduce((total, quiz) => total + quiz.questions.length, 0);
    const totalAttempts = quizzes.reduce((total, quiz) => total + (quiz._count?.attempts ?? quiz.attempts?.length ?? 0), 0);

    return {
      published,
      totalQuestions,
      totalAttempts,
      averageAttempts: quizzes.length ? Number((totalAttempts / quizzes.length).toFixed(1)) : 0,
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
        render: (_, record) => (record.isPublished ? 'Published' : 'Draft'),
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
            value={selectedCourseId}
            className="report-page__select"
            options={(coursesQuery.data ?? []).map((course) => ({ label: course.title, value: course.id }))}
            onChange={(value) => setSelectedCourseId(value)}
          />
        }
      >
        {coursesQuery.isLoading ? <Spin tip="Loading quiz reports..." /> : null}

        {selectedCourseId ? (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} xl={6}><Card><Statistic title="Published Quizzes" value={summary.published} /></Card></Col>
              <Col xs={24} md={12} xl={6}><Card><Statistic title="Question Bank Size" value={summary.totalQuestions} /></Card></Col>
              <Col xs={24} md={12} xl={6}><Card><Statistic title="Attempt Volume" value={summary.totalAttempts} /></Card></Col>
              <Col xs={24} md={12} xl={6}><Card><Statistic title="Avg Attempts / Quiz" value={summary.averageAttempts} /></Card></Col>
            </Row>

            <Card style={{ marginTop: 16 }}>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={quizzesQuery.data ?? []}
                loading={quizzesQuery.isLoading}
                pagination={false}
              />
            </Card>
          </>
        ) : (
          <Empty description="Choose a course to review quiz analytics." />
        )}
      </ClientPageContainer>
    </ClientLayout>
  );
}

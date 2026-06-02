import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Empty, Row, Spin, Statistic, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useParams } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';
import { listCourseAssignmentsRequest, type AssignmentListItem } from '../../../../services/api/assignmentApi';
import { getCourseByIdRequest } from '../../../../services/api/courseApi';
import { progressService } from '../../../../services/api/progressService';
import { listCourseQuizzesRequest, type QuizListItem } from '../../../../services/api/quizApi';

type AssessmentRow = {
  key: string;
  type: 'Assignment' | 'Quiz';
  title: string;
  volume: number;
  gradeSignal: string;
};

export function CourseAnalyticsPage() {
  const { courseId = '' } = useParams();

  const courseQuery = useQuery({
    queryKey: ['analytics', 'course', courseId, 'detail'],
    queryFn: () => getCourseByIdRequest(courseId),
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });

  const progressQuery = useQuery({
    queryKey: ['analytics', 'course', courseId, 'progress'],
    queryFn: () => progressService.getInstructorCourseProgress(courseId, {
      page: 1,
      pageSize: 25,
      sortBy: 'progress',
      sortOrder: 'desc',
    }),
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });

  const assignmentsQuery = useQuery({
    queryKey: ['analytics', 'course', courseId, 'assignments'],
    queryFn: () => listCourseAssignmentsRequest(courseId),
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });

  const quizzesQuery = useQuery({
    queryKey: ['analytics', 'course', courseId, 'quizzes'],
    queryFn: () => listCourseQuizzesRequest(courseId),
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });

  const assessmentRows = useMemo<AssessmentRow[]>(() => {
    const assignmentRows = (assignmentsQuery.data ?? []).map((assignment: AssignmentListItem) => ({
      key: `assignment-${assignment.id}`,
      type: 'Assignment' as const,
      title: assignment.title,
      volume: 0,
      gradeSignal: assignment.allowLateSubmission ? 'Late allowed' : 'Strict due date',
    }));
    const quizRows = (quizzesQuery.data ?? []).map((quiz: QuizListItem) => ({
      key: `quiz-${quiz.id}`,
      type: 'Quiz' as const,
      title: quiz.title,
      volume: quiz._count?.attempts ?? quiz.attempts?.length ?? 0,
      gradeSignal: `Pass ${quiz.passingScore}%`,
    }));

    return [...assignmentRows, ...quizRows];
  }, [assignmentsQuery.data, quizzesQuery.data]);

  const columns = useMemo<ColumnsType<AssessmentRow>>(
    () => [
      { title: 'Type', dataIndex: 'type', key: 'type' },
      { title: 'Title', dataIndex: 'title', key: 'title' },
      { title: 'Volume', dataIndex: 'volume', key: 'volume' },
      { title: 'Signal', dataIndex: 'gradeSignal', key: 'gradeSignal' },
    ],
    [],
  );

  if (courseQuery.isLoading) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Course Analytics" subtitle="Loading course analytics...">
          <Spin tip="Loading course analytics..." />
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (!courseQuery.data || !progressQuery.data) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Course Analytics" subtitle="Review learner progress and assessment volume for a specific course.">
          <Empty description="Course analytics is not available." />
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Course Analytics"
        subtitle={`Review learner progress and assessment volume for ${courseQuery.data.title}.`}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={6}><Card><Statistic title="Modules" value={courseQuery.data.modules.length} /></Card></Col>
          <Col xs={24} md={12} xl={6}><Card><Statistic title="Lessons" value={courseQuery.data.modules.reduce((total, module) => total + module.lessons.length, 0)} /></Card></Col>
          <Col xs={24} md={12} xl={6}><Card><Statistic title="Students" value={progressQuery.data.course.totalStudents} /></Card></Col>
          <Col xs={24} md={12} xl={6}><Card><Statistic title="Avg Weighted Progress" value={progressQuery.data.course.averageWeightedProgress} suffix="%" /></Card></Col>
        </Row>

        <Card style={{ marginTop: 16 }}>
          <Typography.Title level={4}>Assessment Mix</Typography.Title>
          <Table
            rowKey="key"
            columns={columns}
            dataSource={assessmentRows}
            loading={assignmentsQuery.isLoading || quizzesQuery.isLoading}
            pagination={false}
          />
        </Card>
      </ClientPageContainer>
    </ClientLayout>
  );
}

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Empty, Progress, Row, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useParams } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';
import { listCourseAssignmentsRequest, type AssignmentListItem } from '../../../../services/api/assignmentApi';
import { getCourseByIdRequest } from '../../../../services/api/courseApi';
import { progressService } from '../../../../services/api/progressService';
import { listCourseQuizzesRequest, type QuizListItem } from '../../../../services/api/quizApi';
import '../../../shared/reports/InstructorReports.css';

type AssessmentRow = {
  key: string;
  type: 'Assignment' | 'Quiz';
  title: string;
  volumeLabel: string;
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
      volumeLabel: 'Not available from current data',
      gradeSignal: assignment.allowLateSubmission ? 'Late allowed' : 'Strict due date',
    }));
    const quizRows = (quizzesQuery.data ?? []).map((quiz: QuizListItem) => ({
      key: `quiz-${quiz.id}`,
      type: 'Quiz' as const,
      title: quiz.title,
      volumeLabel: `${quiz._count?.attempts ?? quiz.attempts?.length ?? 0} attempts`,
      gradeSignal: `Pass ${quiz.passingScore}%`,
    }));

    return [...assignmentRows, ...quizRows];
  }, [assignmentsQuery.data, quizzesQuery.data]);

  const columns = useMemo<ColumnsType<AssessmentRow>>(
    () => [
      { title: 'Type', dataIndex: 'type', key: 'type', render: (value: AssessmentRow['type']) => <Tag color={value === 'Quiz' ? 'blue' : 'green'}>{value}</Tag> },
      { title: 'Title', dataIndex: 'title', key: 'title' },
      { title: 'Volume', dataIndex: 'volumeLabel', key: 'volumeLabel' },
      { title: 'Signal', dataIndex: 'gradeSignal', key: 'gradeSignal' },
    ],
    [],
  );

  const lessonCount = useMemo(
    () => courseQuery.data?.modules.reduce((total, module) => total + module.lessons.length, 0) ?? 0,
    [courseQuery.data],
  );
  const assignmentCount = assignmentsQuery.data?.length ?? 0;
  const quizCount = quizzesQuery.data?.length ?? 0;

  if (courseQuery.isLoading) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Course Analytics" subtitle="Loading course analytics...">
          <Spin tip="Loading course analytics..." />
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (courseQuery.error || progressQuery.error) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Course Analytics" subtitle="Review learner progress and assessment volume for a specific course.">
          <Alert
            type="error"
            showIcon
            message="Course analytics is not available"
            description={
              courseQuery.error instanceof Error
                ? courseQuery.error.message
                : progressQuery.error instanceof Error
                  ? progressQuery.error.message
                  : 'Unexpected error'
            }
          />
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
        subtitle={`Review content structure, learner progress, and assessment mix for ${courseQuery.data.title}.`}
      >
        <main className="instructor-report-page">
          <Card className="instructor-report-page__hero-card">
            <div>
              <Typography.Text className="instructor-report-page__eyebrow">Selected course</Typography.Text>
              <Typography.Title level={3}>{courseQuery.data.title}</Typography.Title>
              <Typography.Paragraph type="secondary">
                Analytics below use the current course, progress, quiz, and assignment API responses only.
              </Typography.Paragraph>
            </div>
            <Space wrap>
              <Button href={`/instructor/courses/${courseQuery.data.id}`}>Course detail</Button>
              <Button href="/instructor/lessons">Lessons</Button>
              <Button href="/instructor/assessments">Assessments</Button>
              <Button href="/instructor/progress" type="primary">Progress</Button>
            </Space>
          </Card>

          <Row gutter={[16, 16]} className="instructor-report-page__summary">
            <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Modules" value={courseQuery.data.modules.length} /></Card></Col>
            <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Lessons" value={lessonCount} /></Card></Col>
            <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Students" value={progressQuery.data.course.totalStudents} /></Card></Col>
            <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Avg Weighted Progress" value={progressQuery.data.course.averageWeightedProgress} suffix="%" /></Card></Col>
          </Row>

          <div className="instructor-report-page__section-grid">
            <Card className="instructor-report-page__table-card">
              <Typography.Title level={4}>Content structure</Typography.Title>
              <Typography.Paragraph type="secondary">
                {courseQuery.data.modules.length} modules contain {lessonCount} lessons in this course.
              </Typography.Paragraph>
            </Card>
            <Card className="instructor-report-page__table-card">
              <Typography.Title level={4}>Student progress</Typography.Title>
              <Progress percent={progressQuery.data.course.averageWeightedProgress} />
              <Typography.Text type="secondary">
                {progressQuery.data.course.activeStudents} active, {progressQuery.data.course.completedStudents} completed.
              </Typography.Text>
            </Card>
            <Card className="instructor-report-page__table-card">
              <Typography.Title level={4}>Assessment mix</Typography.Title>
              <Typography.Paragraph type="secondary">
                {assignmentCount} assignments and {quizCount} quizzes are currently returned by the course APIs.
              </Typography.Paragraph>
            </Card>
          </div>

          <Card className="instructor-report-page__table-card">
            <div className="instructor-report-page__section-heading">
              <div>
                <Typography.Title level={4}>Assessment Mix</Typography.Title>
                <Typography.Text type="secondary">
                  Assignment submission volume is hidden unless the current API response includes it.
                </Typography.Text>
              </div>
            </div>
            <Table
              rowKey="key"
              columns={columns}
              dataSource={assessmentRows}
              loading={assignmentsQuery.isLoading || quizzesQuery.isLoading}
              pagination={false}
            />
          </Card>
        </main>
      </ClientPageContainer>
    </ClientLayout>
  );
}

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Empty, Progress, Row, Select, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { listCoursesRequest } from '../../../services/api/courseApi';
import { progressService } from '../../../services/api/progressService';
import type { InstructorStudentProgressItem } from '../../../types/progress';
import './InstructorReports.css';

export function InstructorActivityReportPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>();

  const coursesQuery = useQuery({
    queryKey: ['reports', 'instructor-activity', 'courses'],
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

  const progressQuery = useQuery({
    queryKey: ['reports', 'instructor-activity', effectiveSelectedCourseId],
    queryFn: () => progressService.getInstructorCourseProgress(effectiveSelectedCourseId!, {
      page: 1,
      pageSize: 25,
      sortBy: 'lastActivity',
      sortOrder: 'desc',
    }),
    enabled: Boolean(effectiveSelectedCourseId),
    staleTime: 60_000,
  });

  const columns = useMemo<ColumnsType<InstructorStudentProgressItem>>(
    () => [
      {
        title: 'Student',
        key: 'student',
        render: (_, record) => (
          <div className="instructor-report-page__student-cell">
            <Typography.Text strong>{record.studentName}</Typography.Text>
            <Typography.Text type="secondary">{record.studentEmail}</Typography.Text>
          </div>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'enrollmentStatus',
        key: 'enrollmentStatus',
        render: (value: string) => <Tag color={value === 'COMPLETED' ? 'green' : value === 'DROPPED' ? 'red' : 'blue'}>{value}</Tag>,
      },
      {
        title: 'Weighted Progress',
        dataIndex: 'weightedPercentage',
        key: 'weightedPercentage',
        render: (value: number) => `${value}%`,
      },
      {
        title: 'Last Activity',
        dataIndex: 'lastProgressAt',
        key: 'lastProgressAt',
        render: (value: string | null) => value ? new Date(value).toLocaleDateString('en-US') : 'No activity',
      },
    ],
    [],
  );

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Instructor Activity Report"
        subtitle="Review course activity, student status, and progress momentum in a teaching-focused report view."
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
          {coursesQuery.isLoading ? <Spin tip="Loading instructor activity..." /> : null}
          {coursesQuery.error ? (
            <Alert
              type="error"
              showIcon
              message="Failed to load courses"
              description={coursesQuery.error instanceof Error ? coursesQuery.error.message : 'Unexpected error'}
            />
          ) : null}
          {progressQuery.error ? (
            <Alert
              type="error"
              showIcon
              message="Failed to load progress data"
              description={progressQuery.error instanceof Error ? progressQuery.error.message : 'Unexpected error'}
            />
          ) : null}

          {progressQuery.data ? (
            <>
              <Card className="instructor-report-page__hero-card">
                <div>
                  <Typography.Text className="instructor-report-page__eyebrow">Selected report scope</Typography.Text>
                  <Typography.Title level={3}>{selectedCourse?.title ?? progressQuery.data.course.title}</Typography.Title>
                  <Typography.Paragraph type="secondary">
                    Student status, last activity, and weighted progress are loaded from the instructor progress API.
                  </Typography.Paragraph>
                </div>
                <div className="instructor-report-page__hero-meter">
                  <Typography.Text type="secondary">Average weighted progress</Typography.Text>
                  <Progress percent={progressQuery.data.course.averageWeightedProgress} />
                </div>
              </Card>

              <Row gutter={[16, 16]} className="instructor-report-page__summary">
                <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Students" value={progressQuery.data.course.totalStudents} /></Card></Col>
                <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Active" value={progressQuery.data.course.activeStudents} /></Card></Col>
                <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Completed" value={progressQuery.data.course.completedStudents} /></Card></Col>
                <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Avg Weighted Progress" value={progressQuery.data.course.averageWeightedProgress} suffix="%" /></Card></Col>
              </Row>

              <Card className="instructor-report-page__table-card">
                <div className="instructor-report-page__section-heading">
                  <div>
                    <Typography.Title level={4}>Student momentum</Typography.Title>
                    <Typography.Text type="secondary">
                      Sorted by latest learner activity from the progress endpoint.
                    </Typography.Text>
                  </div>
                </div>
                <Table
                  rowKey="studentId"
                  columns={columns}
                  dataSource={progressQuery.data.students}
                  loading={progressQuery.isLoading}
                  pagination={false}
                  scroll={{ x: 820 }}
                  locale={{ emptyText: 'No student progress records found for this course.' }}
                />
              </Card>
            </>
          ) : (
            <Empty description="Choose a course to review instructor activity trends." />
          )}
        </main>
      </ClientPageContainer>
    </ClientLayout>
  );
}

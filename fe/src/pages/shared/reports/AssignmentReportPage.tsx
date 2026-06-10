import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Empty, Row, Select, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import {
  listAssignmentSubmissionsRequest,
  listCourseAssignmentsRequest,
  type AssignmentSubmissionListItem,
} from '../../../services/api/assignmentApi';
import { listCoursesRequest } from '../../../services/api/courseApi';
import './InstructorReports.css';

function formatScore(value: number | null | undefined) {
  if (value == null) {
    return 'Ungraded';
  }

  return `${value}%`;
}

export function AssignmentReportPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>();

  const coursesQuery = useQuery({
    queryKey: ['reports', 'assignment', 'courses'],
    queryFn: async () => {
      const response = await listCoursesRequest({ page: 1, limit: 50 });
      return response.data;
    },
    staleTime: 60_000,
  });
  const activeCourseId = selectedCourseId ?? coursesQuery.data?.[0]?.id;

  const assignmentsQuery = useQuery({
    queryKey: ['reports', 'assignment', 'list', activeCourseId],
    queryFn: () => listCourseAssignmentsRequest(activeCourseId!),
    enabled: Boolean(activeCourseId),
    staleTime: 60_000,
  });
  const activeAssignmentId = selectedAssignmentId ?? assignmentsQuery.data?.[0]?.id;

  const submissionsQuery = useQuery({
    queryKey: ['reports', 'assignment', 'submissions', activeAssignmentId],
    queryFn: () => listAssignmentSubmissionsRequest(activeAssignmentId!),
    enabled: Boolean(activeAssignmentId),
    staleTime: 30_000,
  });

  const selectedCourse = useMemo(
    () => coursesQuery.data?.find((course) => course.id === activeCourseId),
    [coursesQuery.data, activeCourseId],
  );
  const selectedAssignment = useMemo(
    () => assignmentsQuery.data?.find((assignment) => assignment.id === activeAssignmentId),
    [assignmentsQuery.data, activeAssignmentId],
  );

  const summary = useMemo(() => {
    const submissions = submissionsQuery.data ?? [];
    const graded = submissions.filter((submission) => typeof submission.grade === 'number');
    const returned = submissions.filter((submission) => submission.status === 'RETURNED').length;
    const averageGrade = graded.length
      ? Math.round(graded.reduce((total, submission) => total + (submission.grade ?? 0), 0) / graded.length)
      : null;

    return {
      totalSubmissions: submissions.length,
      gradedCount: graded.length,
      returnedCount: returned,
      averageGrade,
    };
  }, [submissionsQuery.data]);

  const columns = useMemo<ColumnsType<AssignmentSubmissionListItem>>(
    () => [
      {
        title: 'Student',
        key: 'student',
        render: (_, record) => (
          <div className="instructor-report-page__student-cell">
            <Typography.Text strong>{record.student?.name ?? 'Unknown student'}</Typography.Text>
            <Typography.Text type="secondary">{record.student?.email ?? 'No email'}</Typography.Text>
          </div>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => <Tag color={value === 'GRADED' || value === 'RETURNED' ? 'green' : 'blue'}>{value}</Tag>,
      },
      {
        title: 'Grade',
        key: 'grade',
        render: (_, record) => formatScore(record.grade),
      },
      {
        title: 'Submission',
        key: 'submission',
        render: (_, record) => record.textContent || record.fileName || 'No content',
      },
    ],
    [],
  );

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Assignment Reports"
        subtitle="Review assignment completion, grading progress, and submission quality across your courses."
        actions={
          <Space>
            <Select
              placeholder="Select course"
              value={activeCourseId}
              className="report-page__select"
              options={(coursesQuery.data ?? []).map((course) => ({ label: course.title, value: course.id }))}
              onChange={(value) => {
                setSelectedCourseId(value);
                setSelectedAssignmentId(undefined);
              }}
            />
            <Select
              placeholder="Select assignment"
              value={activeAssignmentId}
              className="report-page__select"
              options={(assignmentsQuery.data ?? []).map((assignment) => ({ label: assignment.title, value: assignment.id }))}
              onChange={(value) => setSelectedAssignmentId(value)}
              disabled={!activeCourseId}
            />
          </Space>
        }
      >
        <main className="instructor-report-page">
          {coursesQuery.isLoading ? <Spin tip="Loading assignment reports..." /> : null}
          {coursesQuery.error ? (
            <Alert
              type="error"
              showIcon
              message="Failed to load courses"
              description={coursesQuery.error instanceof Error ? coursesQuery.error.message : 'Unexpected error'}
            />
          ) : null}
          {assignmentsQuery.error ? (
            <Alert
              type="error"
              showIcon
              message="Failed to load assignments"
              description={assignmentsQuery.error instanceof Error ? assignmentsQuery.error.message : 'Unexpected error'}
            />
          ) : null}
          {submissionsQuery.error ? (
            <Alert
              type="error"
              showIcon
              message="Failed to load submissions"
              description={submissionsQuery.error instanceof Error ? submissionsQuery.error.message : 'Unexpected error'}
            />
          ) : null}

          {selectedCourse ? (
            <Card className="instructor-report-page__hero-card">
              <div>
                <Typography.Text className="instructor-report-page__eyebrow">Selected report scope</Typography.Text>
                <Typography.Title level={3}>{selectedCourse.title}</Typography.Title>
                <Typography.Paragraph type="secondary">
                  {selectedAssignment
                    ? `Assignment: ${selectedAssignment.title}`
                    : 'Choose an assignment to inspect real submission outcomes.'}
                </Typography.Paragraph>
              </div>
              {selectedAssignment ? (
                <Tag color={selectedAssignment.allowLateSubmission ? 'green' : 'red'}>
                  {selectedAssignment.allowLateSubmission ? 'Late allowed' : 'Late blocked'}
                </Tag>
              ) : null}
            </Card>
          ) : null}

          {activeAssignmentId ? (
            <>
              <Row gutter={[16, 16]} className="instructor-report-page__summary">
                <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Submissions" value={summary.totalSubmissions} /></Card></Col>
                <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Graded" value={summary.gradedCount} /></Card></Col>
                <Col xs={24} md={12} xl={6}><Card className="instructor-report-page__summary-card"><Statistic title="Returned" value={summary.returnedCount} /></Card></Col>
                <Col xs={24} md={12} xl={6}>
                  <Card className="instructor-report-page__summary-card">
                    <Statistic
                      title="Average Grade"
                      value={summary.averageGrade ?? 'Not available'}
                      suffix={summary.averageGrade == null ? undefined : '%'}
                    />
                  </Card>
                </Col>
              </Row>

              <Card className="instructor-report-page__table-card">
                <div className="instructor-report-page__section-heading">
                  <div>
                    <Typography.Title level={4}>Submission outcomes</Typography.Title>
                    <Typography.Text type="secondary">
                      Grades and return status are derived from the selected assignment submissions.
                    </Typography.Text>
                  </div>
                </div>
                <Table
                  rowKey="id"
                  columns={columns}
                  dataSource={submissionsQuery.data ?? []}
                  loading={submissionsQuery.isLoading}
                  pagination={false}
                  scroll={{ x: 820 }}
                  locale={{ emptyText: 'No submissions found for this assignment.' }}
                />
              </Card>
            </>
          ) : (
            <Empty description="Choose a course and assignment to inspect submission outcomes." />
          )}
        </main>
      </ClientPageContainer>
    </ClientLayout>
  );
}

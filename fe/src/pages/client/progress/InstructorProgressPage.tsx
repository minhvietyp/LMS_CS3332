import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import { listCoursesRequest, type CourseListItem } from '../../../services/api/courseApi';
import {
  useInstructorCourseProgress,
  useInstructorStudentCourseProgress,
} from '../../../hooks/useProgressOverview';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import type {
  EnrollmentStatus,
  InstructorStudentProgressItem,
} from '../../../types/progress';
import './InstructorProgressPage.css';

function formatDate(value: string | null) {
  if (!value) {
    return 'No activity yet';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function statusColor(status: EnrollmentStatus) {
  if (status === 'COMPLETED') {
    return 'green';
  }

  if (status === 'DROPPED') {
    return 'red';
  }

  return 'blue';
}

function progressStrokeColor(value: number) {
  if (value >= 67) {
    return '#3EB75E';
  }

  if (value >= 34) {
    return '#FF8F3C';
  }

  return '#FF0003';
}

export function InstructorProgressPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [status, setStatus] = useState<EnrollmentStatus | undefined>();
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'lastActivity' | 'enrolledAt'>('progress');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string>();

  const coursesQuery = useQuery({
    queryKey: ['courses', 'instructor-progress'],
    queryFn: async () => {
      const response = await listCoursesRequest({ page: 1, limit: 50 });
      return response.data;
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  const effectiveSelectedCourseId = selectedCourseId ?? coursesQuery.data?.[0]?.id;

  const progressQuery = useInstructorCourseProgress(effectiveSelectedCourseId, {
    page,
    pageSize: 10,
    search: deferredSearch || undefined,
    status,
    sortBy,
    sortOrder,
  });

  const detailQuery = useInstructorStudentCourseProgress(effectiveSelectedCourseId, selectedStudentId);

  const selectedCourse = useMemo(
    () => coursesQuery.data?.find((course) => course.id === effectiveSelectedCourseId),
    [coursesQuery.data, effectiveSelectedCourseId],
  );

  const columns = useMemo<ColumnsType<InstructorStudentProgressItem>>(
    () => [
      {
        title: 'Student',
        key: 'student',
        render: (_, record) => (
          <div className="instructor-progress-page__student-cell">
            <Typography.Text strong>{record.studentName}</Typography.Text>
            <Typography.Text type="secondary">{record.studentEmail}</Typography.Text>
          </div>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'enrollmentStatus',
        key: 'enrollmentStatus',
        render: (value: EnrollmentStatus) => <Tag color={statusColor(value)}>{value}</Tag>,
      },
      {
        title: 'Progress',
        key: 'progress',
        render: (_, record) => (
          <div className="instructor-progress-page__progress-cell">
            <Progress
              percent={record.weightedPercentage}
              size="small"
              strokeColor={progressStrokeColor(record.weightedPercentage)}
            />
            <Typography.Text type="secondary">
              {record.completedLessons}/{record.totalLessons} lessons
            </Typography.Text>
          </div>
        ),
      },
      {
        title: 'Last Activity',
        dataIndex: 'lastProgressAt',
        key: 'lastProgressAt',
        render: (value: string | null) => (
          <Typography.Text type={value ? undefined : 'secondary'}>{formatDate(value)}</Typography.Text>
        ),
      },
      {
        title: 'Action',
        key: 'action',
        render: (_, record) => (
          <Button type="link" onClick={() => setSelectedStudentId(record.studentId)}>
            View detail
          </Button>
        ),
      },
    ],
    [],
  );

  if (coursesQuery.isLoading) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Student Progress" subtitle="Monitor learner progress by course.">
          <main className="instructor-progress-page">
            <section className="instructor-progress-page__loading">
              <Spin size="large" tip="Loading instructor progress..." />
            </section>
          </main>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (coursesQuery.error) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Student Progress" subtitle="Monitor learner progress by course.">
          <main className="instructor-progress-page">
            <Alert
              type="error"
              showIcon
              message="Failed to load courses"
              description={coursesQuery.error instanceof Error ? coursesQuery.error.message : 'Unexpected error'}
            />
          </main>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (!coursesQuery.data?.length) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Student Progress" subtitle="Monitor learner progress by course.">
          <main className="instructor-progress-page">
            <Empty description="No instructor-owned courses available for progress monitoring." />
          </main>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Student Progress"
        subtitle="Monitor learner progress, completion status, and lesson activity by course."
        actions={
          <Space className="instructor-progress-page__actions">
            <Select
              className="instructor-progress-page__course-select"
              value={effectiveSelectedCourseId}
              onChange={(value) => {
                setSelectedCourseId(value);
                setSelectedStudentId(undefined);
                setPage(1);
              }}
              options={coursesQuery.data.map((course: CourseListItem) => ({
                label: course.title,
                value: course.id,
              }))}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                void coursesQuery.refetch();
                void progressQuery.refetch();
              }}
            >
              Refresh
            </Button>
          </Space>
        }
      >
        <main className="instructor-progress-page">
          <Card className="instructor-progress-page__course-card">
            <div>
              <Typography.Text className="instructor-progress-page__eyebrow">Selected course</Typography.Text>
              <Typography.Title level={4} className="instructor-progress-page__course-title">
                {selectedCourse?.title}
              </Typography.Title>
              <Typography.Paragraph type="secondary" className="instructor-progress-page__course-copy">
                Progress values are loaded from the instructor progress endpoint for this course.
              </Typography.Paragraph>
            </div>
            <Tag color={selectedCourse?.status === 'PUBLISHED' ? 'green' : 'default'}>{selectedCourse?.status}</Tag>
          </Card>

          {progressQuery.isLoading ? (
            <section className="instructor-progress-page__loading">
              <Spin tip="Loading course progress..." />
            </section>
          ) : null}

          {progressQuery.error ? (
            <Alert
              type="error"
              showIcon
              message="Failed to load course progress"
              description={progressQuery.error instanceof Error ? progressQuery.error.message : 'Unexpected error'}
            />
          ) : null}

          {progressQuery.data ? (
            <>
              <Row gutter={[16, 16]} className="instructor-progress-page__summary-grid">
                <Col xs={24} sm={12} lg={6}>
                  <Card className="instructor-progress-page__summary-card">
                    <Statistic title="Enrolled Students" value={progressQuery.data.course.totalStudents} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="instructor-progress-page__summary-card">
                    <Statistic title="Active Students" value={progressQuery.data.course.activeStudents} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="instructor-progress-page__summary-card">
                    <Statistic title="Completed Students" value={progressQuery.data.course.completedStudents} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="instructor-progress-page__summary-card">
                    <Statistic title="Average Progress" value={progressQuery.data.course.averageWeightedProgress} suffix="%" />
                  </Card>
                </Col>
              </Row>

              <Card className="instructor-progress-page__table-card">
                <div className="instructor-progress-page__section-heading">
                  <div>
                    <Typography.Title level={4}>Learner progress roster</Typography.Title>
                    <Typography.Text type="secondary">
                      Search, filter, and open lesson-level detail for students in the selected course.
                    </Typography.Text>
                  </div>
                </div>
                <div className="instructor-progress-page__toolbar">
                  <Input.Search
                    allowClear
                    placeholder="Search student name or email"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    className="instructor-progress-page__search"
                  />
                  <Select
                    allowClear
                    placeholder="Status"
                    value={status}
                    onChange={(value) => {
                      setStatus(value);
                      setPage(1);
                    }}
                    className="instructor-progress-page__filter"
                    options={[
                      { label: 'Active', value: 'ACTIVE' },
                      { label: 'Completed', value: 'COMPLETED' },
                      { label: 'Dropped', value: 'DROPPED' },
                    ]}
                  />
                  <Select
                    value={sortBy}
                    onChange={(value) => {
                      setSortBy(value);
                      setPage(1);
                    }}
                    className="instructor-progress-page__filter"
                    options={[
                      { label: 'Sort by progress', value: 'progress' },
                      { label: 'Sort by name', value: 'name' },
                      { label: 'Sort by last activity', value: 'lastActivity' },
                      { label: 'Sort by enrolled date', value: 'enrolledAt' },
                    ]}
                  />
                  <Select
                    value={sortOrder}
                    onChange={(value) => {
                      setSortOrder(value);
                      setPage(1);
                    }}
                    className="instructor-progress-page__filter"
                    options={[
                      { label: 'Descending', value: 'desc' },
                      { label: 'Ascending', value: 'asc' },
                    ]}
                  />
                </div>

                <Table
                  rowKey="studentId"
                  columns={columns}
                  dataSource={progressQuery.data.students}
                  pagination={{
                    current: progressQuery.data.pagination.page,
                    pageSize: progressQuery.data.pagination.pageSize,
                    total: progressQuery.data.pagination.total,
                    onChange: (nextPage) => setPage(nextPage),
                  }}
                  locale={{
                    emptyText: 'No students matched the selected filters.',
                  }}
                />
              </Card>
            </>
          ) : null}

          <Drawer
            title="Student progress detail"
            open={Boolean(selectedStudentId)}
            size="large"
            onClose={() => setSelectedStudentId(undefined)}
          >
            {detailQuery.isLoading ? <Spin tip="Loading student detail..." /> : null}
            {detailQuery.error ? (
              <Alert
                type="error"
                showIcon
                message="Failed to load student detail"
                description={detailQuery.error instanceof Error ? detailQuery.error.message : 'Unexpected error'}
              />
            ) : null}
            {detailQuery.data ? (
              <div className="instructor-progress-page__detail">
                <Typography.Title level={5}>{detailQuery.data.student.name}</Typography.Title>
                <Typography.Paragraph type="secondary">{detailQuery.data.student.email}</Typography.Paragraph>
                <Space className="instructor-progress-page__detail-summary" wrap>
                  <Tag color={statusColor(detailQuery.data.summary.enrollmentStatus)}>
                    {detailQuery.data.summary.enrollmentStatus}
                  </Tag>
                  <Typography.Text>
                    {detailQuery.data.summary.completedLessons}/{detailQuery.data.summary.totalLessons} lessons completed
                  </Typography.Text>
                  <Typography.Text>
                    Weighted progress: {detailQuery.data.summary.weightedPercentage}%
                  </Typography.Text>
                </Space>

                <div className="instructor-progress-page__detail-lessons">
                  {detailQuery.data.lessons.map((lesson) => (
                    <Card key={lesson.lessonId} size="small" className="instructor-progress-page__lesson-card">
                      <div className="instructor-progress-page__lesson-header">
                        <Typography.Text strong>{lesson.title}</Typography.Text>
                        <Tag color={lesson.isCompleted ? 'green' : 'default'}>
                          {lesson.isCompleted ? 'Completed' : 'Not completed'}
                        </Tag>
                      </div>
                      <Typography.Text type="secondary">
                        Weight {lesson.weight} / {lesson.completedAt ? formatDate(lesson.completedAt) : 'No completion date'}
                      </Typography.Text>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}
          </Drawer>
        </main>
      </ClientPageContainer>
    </ClientLayout>
  );
}


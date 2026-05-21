import { useDeferredValue, useEffect, useMemo, useState } from 'react';
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
import { listCoursesRequest, type CourseListItem } from '../services/courseApi';
import {
  useInstructorCourseProgress,
  useInstructorStudentCourseProgress,
} from '../hooks/useProgressOverview';
import { ClientLayout, ClientPageContainer } from '../components/client/layout';
import type {
  EnrollmentStatus,
  InstructorStudentProgressItem,
} from '../types/progress';
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

  useEffect(() => {
    if (!selectedCourseId && coursesQuery.data?.length) {
      setSelectedCourseId(coursesQuery.data[0].id);
    }
  }, [coursesQuery.data, selectedCourseId]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, selectedCourseId, sortBy, sortOrder, status]);

  const progressQuery = useInstructorCourseProgress(selectedCourseId, {
    page,
    pageSize: 10,
    search: deferredSearch || undefined,
    status,
    sortBy,
    sortOrder,
  });

  const detailQuery = useInstructorStudentCourseProgress(selectedCourseId, selectedStudentId);

  const selectedCourse = useMemo(
    () => coursesQuery.data?.find((course) => course.id === selectedCourseId),
    [coursesQuery.data, selectedCourseId],
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
        <ClientPageContainer title="Instructor progress monitoring" subtitle="Review course completion and activity across your students.">
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
        <ClientPageContainer title="Instructor progress monitoring" subtitle="Review course completion and activity across your students.">
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
        <ClientPageContainer title="Instructor progress monitoring" subtitle="Review course completion and activity across your students.">
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
        title="Instructor progress monitoring"
        subtitle="Review course completion, last activity, and lesson-level progress across your students."
        actions={
          <Space className="instructor-progress-page__actions">
            <Select
              className="instructor-progress-page__course-select"
              value={selectedCourseId}
              onChange={(value) => {
                setSelectedCourseId(value);
                setSelectedStudentId(undefined);
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
          <section className="instructor-progress-page__header">
            <div className="instructor-progress-page__heading">
              <Typography.Text className="instructor-progress-page__eyebrow">
                Learning Progress Tracking
              </Typography.Text>
              <Typography.Title level={2} className="instructor-progress-page__title">
                Instructor progress monitoring
              </Typography.Title>
              <Typography.Paragraph className="instructor-progress-page__subtitle">
                Review course completion, last activity, and lesson-level progress across your students.
              </Typography.Paragraph>
            </div>
          </section>

          <Card className="instructor-progress-page__course-card">
            <Typography.Title level={4} className="instructor-progress-page__course-title">
              {selectedCourse?.title}
            </Typography.Title>
            <Typography.Text type="secondary">{selectedCourse?.status}</Typography.Text>
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
                    <Statistic title="Students" value={progressQuery.data.course.totalStudents} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="instructor-progress-page__summary-card">
                    <Statistic title="Average Progress" value={progressQuery.data.course.averageProgress} suffix="%" />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="instructor-progress-page__summary-card">
                    <Statistic title="Weighted Average" value={progressQuery.data.course.averageWeightedProgress} suffix="%" />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="instructor-progress-page__summary-card">
                    <Statistic title="Lessons" value={progressQuery.data.course.totalLessons} />
                  </Card>
                </Col>
              </Row>

              <Card className="instructor-progress-page__table-card">
                <div className="instructor-progress-page__toolbar">
                  <Input.Search
                    allowClear
                    placeholder="Search student name or email"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="instructor-progress-page__search"
                  />
                  <Select
                    allowClear
                    placeholder="Status"
                    value={status}
                    onChange={(value) => setStatus(value)}
                    className="instructor-progress-page__filter"
                    options={[
                      { label: 'Active', value: 'ACTIVE' },
                      { label: 'Completed', value: 'COMPLETED' },
                      { label: 'Dropped', value: 'DROPPED' },
                    ]}
                  />
                  <Select
                    value={sortBy}
                    onChange={(value) => setSortBy(value)}
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
                    onChange={(value) => setSortOrder(value)}
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
                        Weight {lesson.weight} • {lesson.completedAt ? formatDate(lesson.completedAt) : 'No completion date'}
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

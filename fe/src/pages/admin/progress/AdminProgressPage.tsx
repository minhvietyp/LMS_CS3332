import { useDeferredValue, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Input,
  Progress,
  Row,
  Select,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import { AdminPageContainer } from '../../../components/admin-layout';
import {
  useAdminCourseProgressList,
  useAdminProgressOverview,
  useInstructorCourseProgress,
  useInstructorStudentCourseProgress,
} from '../../../hooks/useProgressOverview';
import type {
  AdminCourseProgressItem,
  EnrollmentStatus,
  InstructorStudentProgressItem,
} from '../../../types/progress';
import './AdminProgressPage.css';

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

function progressStrokeColor(value: number) {
  if (value >= 67) {
    return '#3EB75E';
  }

  if (value >= 34) {
    return '#FF8F3C';
  }

  return '#FF0003';
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

export function AdminProgressPage() {
  const [courseSearch, setCourseSearch] = useState('');
  const deferredCourseSearch = useDeferredValue(courseSearch);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined>();
  const [sortBy, setSortBy] = useState<'title' | 'progress' | 'students' | 'completionRate'>('progress');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selectedCourseId, setSelectedCourseId] = useState<string>();
  const [selectedStudentId, setSelectedStudentId] = useState<string>();
  const [studentPage, setStudentPage] = useState(1);
  const [studentSearch, setStudentSearch] = useState('');
  const deferredStudentSearch = useDeferredValue(studentSearch);
  const [studentStatus, setStudentStatus] = useState<EnrollmentStatus | undefined>();

  const overviewQuery = useAdminProgressOverview();
  const coursesQuery = useAdminCourseProgressList({
    page,
    pageSize: 10,
    search: deferredCourseSearch || undefined,
    status,
    sortBy,
    sortOrder,
  });
  const selectedCourse = useMemo(
    () => coursesQuery.data?.courses.find((course) => course.courseId === selectedCourseId),
    [coursesQuery.data, selectedCourseId],
  );
  const studentsQuery = useInstructorCourseProgress(selectedCourseId, {
    page: studentPage,
    pageSize: 10,
    search: deferredStudentSearch || undefined,
    status: studentStatus,
    sortBy: 'progress',
    sortOrder: 'desc',
  });
  const detailQuery = useInstructorStudentCourseProgress(selectedCourseId, selectedStudentId);

  const courseColumns = useMemo<ColumnsType<AdminCourseProgressItem>>(
    () => [
      {
        title: 'Course',
        key: 'course',
        render: (_, record) => (
          <div className="admin-progress-page__course-cell">
            <Typography.Text strong>{record.courseTitle}</Typography.Text>
            <Typography.Text type="secondary">{record.instructorName}</Typography.Text>
          </div>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (value) => <Tag color={value === 'PUBLISHED' ? 'blue' : value === 'ARCHIVED' ? 'default' : 'gold'}>{value}</Tag>,
      },
      {
        title: 'Students',
        dataIndex: 'totalStudents',
        key: 'totalStudents',
      },
      {
        title: 'Average Progress',
        dataIndex: 'averageWeightedProgress',
        key: 'averageWeightedProgress',
        render: (value: number) => (
          <Progress percent={value} size="small" strokeColor={progressStrokeColor(value)} />
        ),
      },
      {
        title: 'Completion Rate',
        dataIndex: 'completionRate',
        key: 'completionRate',
        render: (value: number) => `${value}%`,
      },
      {
        title: 'Action',
        key: 'action',
        render: (_, record) => (
          <Button
            type="link"
            onClick={() => {
              setSelectedCourseId(record.courseId);
              setSelectedStudentId(undefined);
              setStudentPage(1);
            }}
          >
            View students
          </Button>
        ),
      },
    ],
    [],
  );

  const studentColumns = useMemo<ColumnsType<InstructorStudentProgressItem>>(
    () => [
      {
        title: 'Student',
        key: 'student',
        render: (_, record) => (
          <div className="admin-progress-page__course-cell">
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
        title: 'Weighted Progress',
        dataIndex: 'weightedPercentage',
        key: 'weightedPercentage',
        render: (value: number, record) => (
          <div className="admin-progress-page__student-progress-cell">
            <Progress percent={value} size="small" strokeColor={progressStrokeColor(value)} />
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
        render: (value: string | null) => formatDate(value),
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

  return (
    <AdminPageContainer
      title="Admin progress monitoring"
      subtitle="Monitor platform-wide learning progress, review course health, and inspect student-level completion."
      actions={(
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            void overviewQuery.refetch();
            void coursesQuery.refetch();
            void studentsQuery.refetch();
          }}
        >
          Refresh
        </Button>
      )}
    >
      {overviewQuery.isLoading ? (
        <section className="admin-progress-page__loading">
          <Spin size="large" tip="Loading admin progress overview..." />
        </section>
      ) : null}

      {overviewQuery.error ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load admin overview"
          description={overviewQuery.error instanceof Error ? overviewQuery.error.message : 'Unexpected error'}
        />
      ) : null}

      {overviewQuery.data ? (
        <Row gutter={[16, 16]} className="admin-progress-page__summary-grid">
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="Courses" value={overviewQuery.data.summary.totalCourses} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="Students" value={overviewQuery.data.summary.totalStudents} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="Average Progress" value={overviewQuery.data.summary.averageWeightedProgress} suffix="%" /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="Completion Rate" value={overviewQuery.data.summary.averageCompletionRate} suffix="%" /></Card></Col>
        </Row>
      ) : null}

      <Card className="admin-progress-page__panel">
        <div className="admin-progress-page__toolbar">
          <Input.Search
            allowClear
            placeholder="Search course or instructor"
            value={courseSearch}
            onChange={(event) => setCourseSearch(event.target.value)}
            className="admin-progress-page__search"
          />
          <Select
            allowClear
            placeholder="Course status"
            value={status}
            onChange={(value) => setStatus(value)}
            className="admin-progress-page__filter"
            options={[
              { label: 'Draft', value: 'DRAFT' },
              { label: 'Published', value: 'PUBLISHED' },
              { label: 'Archived', value: 'ARCHIVED' },
            ]}
          />
          <Select
            value={sortBy}
            onChange={(value) => setSortBy(value)}
            className="admin-progress-page__filter"
            options={[
              { label: 'Sort by progress', value: 'progress' },
              { label: 'Sort by title', value: 'title' },
              { label: 'Sort by students', value: 'students' },
              { label: 'Sort by completion rate', value: 'completionRate' },
            ]}
          />
          <Select
            value={sortOrder}
            onChange={(value) => setSortOrder(value)}
            className="admin-progress-page__filter"
            options={[
              { label: 'Descending', value: 'desc' },
              { label: 'Ascending', value: 'asc' },
            ]}
          />
        </div>

        <Table
          rowKey="courseId"
          columns={courseColumns}
          dataSource={coursesQuery.data?.courses ?? []}
          loading={coursesQuery.isLoading}
          pagination={{
            current: coursesQuery.data?.pagination.page ?? page,
            pageSize: coursesQuery.data?.pagination.pageSize ?? 10,
            total: coursesQuery.data?.pagination.total ?? 0,
            onChange: (nextPage) => setPage(nextPage),
          }}
        />
      </Card>

      {selectedCourseId ? (
        <Card className="admin-progress-page__panel">
          <div className="admin-progress-page__section-heading">
            <div>
              <Typography.Title level={4} className="admin-progress-page__section-title">
                {selectedCourse?.courseTitle ?? 'Selected course'}
              </Typography.Title>
              <Typography.Text type="secondary">
                {selectedCourse?.instructorName ?? 'Course progress detail'}
              </Typography.Text>
            </div>
          </div>

          <div className="admin-progress-page__toolbar">
            <Input.Search
              allowClear
              placeholder="Search student"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              className="admin-progress-page__search"
            />
            <Select
              allowClear
              placeholder="Enrollment status"
              value={studentStatus}
              onChange={(value) => setStudentStatus(value)}
              className="admin-progress-page__filter"
              options={[
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Completed', value: 'COMPLETED' },
                { label: 'Dropped', value: 'DROPPED' },
              ]}
            />
          </div>

          <Table
            rowKey="studentId"
            columns={studentColumns}
            dataSource={studentsQuery.data?.students ?? []}
            loading={studentsQuery.isLoading}
            pagination={{
              current: studentsQuery.data?.pagination.page ?? studentPage,
              pageSize: studentsQuery.data?.pagination.pageSize ?? 10,
              total: studentsQuery.data?.pagination.total ?? 0,
              onChange: (nextPage) => setStudentPage(nextPage),
            }}
          />
        </Card>
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
          <div className="admin-progress-page__detail">
            <Typography.Title level={5}>{detailQuery.data.student.name}</Typography.Title>
            <Typography.Paragraph type="secondary">{detailQuery.data.student.email}</Typography.Paragraph>
            <Typography.Paragraph>
              Weighted progress: {detailQuery.data.summary.weightedPercentage}% • Last activity: {formatDate(detailQuery.data.summary.lastProgressAt)}
            </Typography.Paragraph>
            {detailQuery.data.lessons.map((lesson) => (
              <Card key={lesson.lessonId} size="small" className="admin-progress-page__lesson-card">
                <div className="admin-progress-page__lesson-header">
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
        ) : null}
      </Drawer>
    </AdminPageContainer>
  );
}


import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Empty,
  Input,
  Progress,
  Select,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  archiveCourseRequest,
  getCourseByIdRequest,
  listCoursesRequest,
  publishCourseRequest,
  type CourseStatus,
} from '../../../../services/api/courseApi';
import { listCourseAssignmentsRequest } from '../../../../services/api/assignmentApi';
import { progressService } from '../../../../services/api/progressService';
import { listCourseQuizzesRequest } from '../../../../services/api/quizApi';
import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';
import { CourseManagement } from '../../../admin/courses/components';
import '../InstructorWorkspacePage.css';

type WorkspaceCourseCard = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  status: CourseStatus;
  updatedAt: string;
  moduleCount: number;
  lessonCount: number;
  assignmentCount: number;
  quizCount: number;
  studentCount: number;
  completion: number;
  lastActivity: string | null;
};

function formatShortDate(value: string | null | undefined) {
  if (!value) return 'No recent activity';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function statusColor(status: CourseStatus) {
  if (status === 'PUBLISHED') return 'green';
  if (status === 'ARCHIVED') return 'default';
  return 'blue';
}

export function InstructorCoursesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CourseStatus>('ALL');

  const coursesQuery = useQuery({
    queryKey: ['instructor-courses', 'workspace'],
    queryFn: async () => {
      const response = await listCoursesRequest({ page: 1, limit: 24 });
      return response.data;
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  const courseWorkspaceQuery = useQuery({
    queryKey: ['instructor-courses', 'workspace-details', coursesQuery.data?.map((course) => course.id)],
    enabled: Boolean(coursesQuery.data?.length),
    queryFn: async (): Promise<WorkspaceCourseCard[]> => {
      const courses = coursesQuery.data ?? [];
      const cards = await Promise.all(
        courses.map(async (course) => {
          const [detail, assignments, quizzes, progress] = await Promise.all([
            getCourseByIdRequest(course.id),
            listCourseAssignmentsRequest(course.id).catch(() => []),
            listCourseQuizzesRequest(course.id).catch(() => []),
            progressService
              .getInstructorCourseProgress(course.id, {
                page: 1,
                pageSize: 1,
                sortBy: 'lastActivity',
                sortOrder: 'desc',
              })
              .catch(() => null),
          ]);

          return {
            id: course.id,
            title: course.title,
            description: course.description ?? 'No course summary available yet.',
            thumbnailUrl: course.thumbnailUrl ?? null,
            status: course.status,
            updatedAt: course.updatedAt,
            moduleCount: detail.modules.length,
            lessonCount: detail.modules.reduce((total, module) => total + module.lessons.length, 0),
            assignmentCount: assignments.length,
            quizCount: quizzes.length,
            studentCount: progress?.course.totalStudents ?? 0,
            completion: progress?.course.averageWeightedProgress ?? 0,
            lastActivity: progress?.students[0]?.lastProgressAt ?? course.updatedAt ?? null,
          };
        }),
      );

      return cards;
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  const publishMutation = useMutation({
    mutationFn: publishCourseRequest,
    onSuccess: async () => {
      await Promise.all([coursesQuery.refetch(), courseWorkspaceQuery.refetch()]);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveCourseRequest,
    onSuccess: async () => {
      await Promise.all([coursesQuery.refetch(), courseWorkspaceQuery.refetch()]);
    },
  });

  const cards = courseWorkspaceQuery.data ?? [];

  const filteredCards = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return cards.filter((course) => {
      const matchesSearch =
        !searchValue ||
        `${course.title} ${course.description}`.toLowerCase().includes(searchValue);
      const matchesStatus = statusFilter === 'ALL' || course.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [cards, search, statusFilter]);

  const summary = useMemo(() => {
    const totalStudents = cards.reduce((sum, course) => sum + course.studentCount, 0);
    const averageCompletion =
      cards.length > 0
        ? Math.round(cards.reduce((sum, course) => sum + course.completion, 0) / cards.length)
        : 0;
    const recentActivity = cards
      .map((course) => course.updatedAt)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

    return {
      published: cards.filter((course) => course.status === 'PUBLISHED').length,
      draft: cards.filter((course) => course.status === 'DRAFT').length,
      archived: cards.filter((course) => course.status === 'ARCHIVED').length,
      totalStudents,
      averageCompletion,
      recentActivity,
    };
  }, [cards]);

  const isLoading = coursesQuery.isLoading || courseWorkspaceQuery.isLoading;
  const error = coursesQuery.error || courseWorkspaceQuery.error;

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Courses"
        subtitle="Run your teaching workspace from card-first course views instead of a management table."
      >
        <section className="instructor-workspace">
          <div className="instructor-workspace-summary instructor-workspace-summary--courses">
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Published</Typography.Text>
              <Typography.Text strong>{summary.published} live courses</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Draft</Typography.Text>
              <Typography.Text strong>{summary.draft} awaiting publish decisions</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Archived</Typography.Text>
              <Typography.Text strong>{summary.archived} preserved teaching spaces</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Total Students</Typography.Text>
              <Typography.Text strong>{summary.totalStudents} active enrollments tracked</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Average Completion</Typography.Text>
              <Typography.Text strong>{summary.averageCompletion}% weighted completion</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Recent Activity</Typography.Text>
              <Typography.Text strong>{formatShortDate(summary.recentActivity)}</Typography.Text>
            </Card>
          </div>

          <Card className="instructor-workspace-card instructor-workspace-card--toolbar">
            <div className="instructor-workspace-toolbar">
              <Input.Search
                allowClear
                placeholder="Search your courses"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="instructor-workspace-toolbar__search"
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                className="instructor-workspace-toolbar__filter"
                options={[
                  { label: 'All statuses', value: 'ALL' },
                  { label: 'Draft', value: 'DRAFT' },
                  { label: 'Published', value: 'PUBLISHED' },
                  { label: 'Archived', value: 'ARCHIVED' },
                ]}
              />
              <Button
                type="primary"
                onClick={() =>
                  document.getElementById('instructor-course-management')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }
              >
                Open Advanced Management
              </Button>
            </div>
          </Card>

          {error ? (
            <Alert
              type="error"
              showIcon
              message="Failed to load instructor courses"
              description={error instanceof Error ? error.message : 'Unexpected error'}
            />
          ) : null}

          {isLoading ? (
            <section className="instructor-workspace__loading">
              <Spin tip="Loading teaching workspace..." />
            </section>
          ) : filteredCards.length ? (
            <section className="instructor-course-grid">
              {filteredCards.map((course) => (
                <article key={course.id} className="instructor-course-card">
                  <div className="instructor-course-card__media">
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} />
                    ) : (
                      <div className="instructor-course-card__placeholder">
                        <span>{course.title.slice(0, 1).toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  <div className="instructor-course-card__body">
                    <div className="instructor-course-card__header">
                      <div>
                        <Typography.Title level={4}>{course.title}</Typography.Title>
                        <Typography.Paragraph>{course.description}</Typography.Paragraph>
                      </div>
                      <Tag color={statusColor(course.status)}>{course.status}</Tag>
                    </div>

                    <div className="instructor-course-card__stats">
                      <div><span>Students</span><strong>{course.studentCount}</strong></div>
                      <div><span>Lessons</span><strong>{course.lessonCount}</strong></div>
                      <div><span>Assignments</span><strong>{course.assignmentCount}</strong></div>
                      <div><span>Quizzes</span><strong>{course.quizCount}</strong></div>
                    </div>

                    <div className="instructor-course-card__progress">
                      <div className="instructor-course-card__progress-copy">
                        <Typography.Text strong>{course.completion}% completion</Typography.Text>
                        <Typography.Text type="secondary">Updated {formatShortDate(course.updatedAt)}</Typography.Text>
                      </div>
                      <Progress percent={course.completion} showInfo={false} />
                    </div>

                    <div className="instructor-course-card__actions">
                      <Button type="primary" onClick={() => navigate(`/instructor/courses/${course.id}`)}>
                        Open Course
                      </Button>
                      <Button onClick={() => navigate('/instructor/assessments')}>Assessments</Button>
                      <Button onClick={() => navigate(`/instructor/courses/${course.id}`)}>Edit</Button>
                      {course.status === 'DRAFT' ? (
                        <Button
                          onClick={() => publishMutation.mutate(course.id)}
                          loading={publishMutation.isPending && publishMutation.variables === course.id}
                        >
                          Publish
                        </Button>
                      ) : null}
                      {course.status === 'PUBLISHED' ? (
                        <Button
                          onClick={() => archiveMutation.mutate(course.id)}
                          loading={archiveMutation.isPending && archiveMutation.variables === course.id}
                        >
                          Archive
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <Empty description="No courses matched the current workspace filters." />
          )}

          <Collapse
            items={[
              {
                key: 'management-table',
                label: 'Advanced course management',
                children: (
                  <div className="instructor-workspace__embedded" id="instructor-course-management">
                    <CourseManagement basePath="/instructor/courses" />
                  </div>
                ),
              },
            ]}
          />
        </section>
      </ClientPageContainer>
    </ClientLayout>
  );
}

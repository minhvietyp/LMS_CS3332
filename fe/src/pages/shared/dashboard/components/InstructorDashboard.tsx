import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Empty, Row, Select, Skeleton, Tag, Typography } from 'antd';
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  FileText,
  FolderKanban,
  Layers3,
  LineChart,
  NotebookPen,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listCourseAssignmentsRequest } from '../../../../services/api/assignmentApi';
import { getCourseByIdRequest, listCoursesRequest } from '../../../../services/api/courseApi';
import type { CourseDetail, CourseStatus } from '../../../../services/api/courseApi';
import { listCourseQuizzesRequest } from '../../../../services/api/quizApi';
import { useInstructorCourseProgress } from '../../../../hooks/useProgressOverview';
import './InstructorDashboard.css';

type InstructorDashboardProps = {
  instructorId?: string;
  instructorName?: string | null;
};

type SummaryCardProps = {
  label: string;
  value: string | number;
  note: string;
  tone: 'blue' | 'green' | 'orange' | 'slate';
};

type ActionCardProps = {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
};

function getStatusLabel(status: CourseStatus) {
  switch (status) {
    case 'PUBLISHED':
      return 'Published';
    case 'ARCHIVED':
      return 'Archived';
    case 'DRAFT':
    default:
      return 'Draft';
  }
}

function getStatusColor(status: CourseStatus) {
  switch (status) {
    case 'PUBLISHED':
      return 'green';
    case 'ARCHIVED':
      return 'default';
    case 'DRAFT':
    default:
      return 'blue';
  }
}

function getCourseCounts(courseDetails: CourseDetail[]) {
  return courseDetails.reduce(
    (counts, course) => {
      counts.modules += course.modules.length;
      counts.lessons += course.modules.reduce((total, module) => total + module.lessons.length, 0);
      return counts;
    },
    { modules: 0, lessons: 0 },
  );
}

function SummaryCard({ label, value, note, tone }: SummaryCardProps) {
  return (
    <Card className={`instructor-dashboard-summary-card instructor-dashboard-summary-card--${tone}`}>
      <Typography.Text className="instructor-dashboard-summary-card__label">{label}</Typography.Text>
      <Typography.Title level={3}>{value}</Typography.Title>
      <Typography.Text className="instructor-dashboard-summary-card__note">{note}</Typography.Text>
    </Card>
  );
}

function ActionCard({ title, description, to, icon: Icon }: ActionCardProps) {
  return (
    <Link to={to} className="instructor-dashboard-action-card">
      <span className="instructor-dashboard-action-card__icon">
        <Icon size={18} />
      </span>
      <span className="instructor-dashboard-action-card__copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
    </Link>
  );
}

function getCourseDetail(courseDetails: CourseDetail[], courseId: string) {
  return courseDetails.find((course) => course.id === courseId);
}

function getLessonCount(course?: CourseDetail) {
  return course?.modules.reduce((total, module) => total + module.lessons.length, 0) ?? null;
}

export function InstructorDashboard({ instructorId, instructorName }: InstructorDashboardProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>();

  const coursesQuery = useQuery({
    queryKey: ['dashboard', 'instructor', 'courses', instructorId],
    queryFn: async () => {
      const response = await listCoursesRequest({ page: 1, limit: 50, includeDeleted: false });
      return response.data.filter((course) => !instructorId || course.instructorId === instructorId);
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  const courses = coursesQuery.data ?? [];
  const effectiveSelectedCourseId =
    selectedCourseId && courses.some((course) => course.id === selectedCourseId)
      ? selectedCourseId
      : courses[0]?.id;

  const courseDetailsQuery = useQuery({
    queryKey: ['dashboard', 'instructor', 'course-details', courses.map((course) => course.id).join(',')],
    queryFn: () => Promise.all(courses.slice(0, 12).map((course) => getCourseByIdRequest(course.id))),
    enabled: courses.length > 0,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const selectedProgressQuery = useInstructorCourseProgress(effectiveSelectedCourseId, {
    page: 1,
    pageSize: 8,
    sortBy: 'lastActivity',
    sortOrder: 'desc',
  });

  const assignmentsQuery = useQuery({
    queryKey: ['dashboard', 'instructor', 'assignments', effectiveSelectedCourseId],
    queryFn: () => listCourseAssignmentsRequest(effectiveSelectedCourseId!),
    enabled: Boolean(effectiveSelectedCourseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const quizzesQuery = useQuery({
    queryKey: ['dashboard', 'instructor', 'quizzes', effectiveSelectedCourseId],
    queryFn: () => listCourseQuizzesRequest(effectiveSelectedCourseId!),
    enabled: Boolean(effectiveSelectedCourseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const courseDetails = courseDetailsQuery.data ?? [];
  const selectedCourse = courses.find((course) => course.id === effectiveSelectedCourseId);
  const selectedCourseDetail = effectiveSelectedCourseId ? getCourseDetail(courseDetails, effectiveSelectedCourseId) : undefined;
  const loadedCourseCounts = getCourseCounts(courseDetails);
  const statusCounts = useMemo(
    () =>
      courses.reduce<Record<CourseStatus, number>>(
        (counts, course) => {
          counts[course.status] += 1;
          return counts;
        },
        { DRAFT: 0, PUBLISHED: 0, ARCHIVED: 0 },
      ),
    [courses],
  );

  const coursesNeedingLessons = courseDetails.filter((course) => getLessonCount(course) === 0);
  const unpublishedQuizzes = (quizzesQuery.data ?? []).filter((quiz) => !quiz.isPublished);
  const draftCourses = courses.filter((course) => course.status === 'DRAFT');
  const courseOptions = courses.map((course) => ({ value: course.id, label: course.title }));

  const courseLoadFailed = coursesQuery.isError;
  const detailLoadFailed = courseDetailsQuery.isError;
  const selectedCourseLoadFailed = selectedProgressQuery.isError || assignmentsQuery.isError || quizzesQuery.isError;
  const hasCourses = courses.length > 0;

  return (
    <section className="instructor-dashboard">
      <div className="instructor-dashboard-hero">
        <div className="instructor-dashboard-hero__copy">
          <Typography.Text className="instructor-dashboard__eyebrow">Instructor workspace</Typography.Text>
          <Typography.Title level={1}>Instructor Dashboard</Typography.Title>
          <Typography.Paragraph>
            Welcome back{instructorName ? `, ${instructorName}` : ''}. Review real course setup, selected-course progress,
            and the teaching workflows that need your next move.
          </Typography.Paragraph>
        </div>
        <div className="instructor-dashboard-hero__actions">
          <Button type="primary" size="large">
            <Link to="/instructor/courses">Manage Courses</Link>
          </Button>
          <Button size="large">
            <Link to="/reports/assignments">View Reports</Link>
          </Button>
        </div>
      </div>

      {courseLoadFailed ? (
        <Alert type="error" showIcon message="Unable to load instructor courses." />
      ) : null}

      {coursesQuery.isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          <Row gutter={[16, 16]} className="instructor-dashboard-summary">
            <Col xs={24} sm={12} xl={6}>
              <SummaryCard label="My Courses" value={courses.length} note="Courses assigned to your account" tone="blue" />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <SummaryCard label="Published Courses" value={statusCounts.PUBLISHED} note="Visible course shells" tone="green" />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <SummaryCard label="Draft Courses" value={statusCounts.DRAFT} note="Courses still being prepared" tone="orange" />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <SummaryCard
                label="Loaded Lessons"
                value={loadedCourseCounts.lessons}
                note={`Across ${courseDetails.length} loaded course records`}
                tone="slate"
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]} className="instructor-dashboard-layout">
            <Col xs={24} xl={15}>
              <Card className="instructor-dashboard-card instructor-dashboard-card--actions">
                <div className="instructor-dashboard-section-header">
                  <div>
                    <Typography.Text className="instructor-dashboard__eyebrow">Quick actions</Typography.Text>
                    <Typography.Title level={3}>Move directly into teaching work</Typography.Title>
                  </div>
                </div>
                <div className="instructor-dashboard-action-grid">
                  <ActionCard title="Manage courses" description="Create, publish, and maintain course shells." to="/instructor/courses" icon={FolderKanban} />
                  <ActionCard title="Build lessons & modules" description="Organize curriculum and learning materials." to="/instructor/lessons" icon={NotebookPen} />
                  <ActionCard title="Manage assessments" description="Create assignments, quizzes, and grading flows." to="/instructor/assessments" icon={ClipboardList} />
                  <ActionCard title="Track student progress" description="Review completion and learner activity." to="/instructor/progress" icon={UsersRound} />
                  <ActionCard title="Assignment reports" description="Open submission and grading reports." to="/reports/assignments" icon={FileText} />
                  <ActionCard title="Quiz reports" description="Review quiz publishing and attempts." to="/reports/quizzes" icon={BarChart3} />
                </div>
              </Card>
            </Col>

            <Col xs={24} xl={9}>
              <Card className="instructor-dashboard-card">
                <div className="instructor-dashboard-section-header">
                  <div>
                    <Typography.Text className="instructor-dashboard__eyebrow">Reports</Typography.Text>
                    <Typography.Title level={3}>Open insight pages</Typography.Title>
                  </div>
                </div>
                <div className="instructor-dashboard-report-list">
                  <Link to="/reports/assignments"><FileText size={17} /> Assignment Reports</Link>
                  <Link to="/reports/quizzes"><ClipboardList size={17} /> Quiz Reports</Link>
                  <Link to="/reports/instructor-activity"><LineChart size={17} /> Activity Reports</Link>
                </div>
              </Card>
            </Col>
          </Row>

          <Card className="instructor-dashboard-card">
            <div className="instructor-dashboard-section-header instructor-dashboard-section-header--split">
              <div>
                <Typography.Text className="instructor-dashboard__eyebrow">Course overview</Typography.Text>
                <Typography.Title level={3}>Your teaching catalog</Typography.Title>
              </div>
              <Button>
                <Link to="/instructor/courses">Open course manager</Link>
              </Button>
            </div>
            {detailLoadFailed ? (
              <Alert type="warning" showIcon message="Course list loaded, but module and lesson counts are unavailable." />
            ) : null}
            {hasCourses ? (
              <div className="instructor-dashboard-course-grid">
                {courses.slice(0, 6).map((course) => {
                  const detail = getCourseDetail(courseDetails, course.id);
                  const lessonCount = getLessonCount(detail);
                  return (
                    <article className="instructor-dashboard-course-card" key={course.id}>
                      <div className="instructor-dashboard-course-card__top">
                        <Tag color={getStatusColor(course.status)}>{getStatusLabel(course.status)}</Tag>
                        <span className="client-meta">{course.updatedAt ? `Updated ${new Date(course.updatedAt).toLocaleDateString()}` : 'Course record'}</span>
                      </div>
                      <Typography.Title level={4}>{course.title}</Typography.Title>
                      <Typography.Paragraph>{course.description || 'No course description has been added yet.'}</Typography.Paragraph>
                      <div className="instructor-dashboard-course-card__meta">
                        <span><Layers3 size={15} /> {detail ? `${detail.modules.length} modules` : 'Modules loading'}</span>
                        <span><BookOpen size={15} /> {lessonCount === null ? 'Lessons loading' : `${lessonCount} lessons`}</span>
                      </div>
                      <div className="instructor-dashboard-course-card__actions">
                        <Link to={`/instructor/courses/${course.id}`}>Manage</Link>
                        <Link to="/instructor/lessons">Lessons</Link>
                        <Link to={`/courses/${course.id}/analytics`}>Analytics</Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <Empty description="No courses are assigned to your instructor account yet.">
                <Button type="primary">
                  <Link to="/instructor/courses">Create your first course</Link>
                </Button>
              </Empty>
            )}
          </Card>

          <Row gutter={[16, 16]} className="instructor-dashboard-layout">
            <Col xs={24} xl={14}>
              <Card className="instructor-dashboard-card">
                <div className="instructor-dashboard-section-header instructor-dashboard-section-header--split">
                  <div>
                    <Typography.Text className="instructor-dashboard__eyebrow">Selected course snapshot</Typography.Text>
                    <Typography.Title level={3}>{selectedCourse?.title ?? 'Choose a course'}</Typography.Title>
                  </div>
                  {hasCourses ? (
                    <Select
                      className="instructor-dashboard-course-select"
                      value={effectiveSelectedCourseId}
                      options={courseOptions}
                      onChange={setSelectedCourseId}
                      aria-label="Select course snapshot"
                    />
                  ) : null}
                </div>
                {selectedCourseLoadFailed ? (
                  <Alert type="warning" showIcon message="Selected course snapshot is unavailable right now." />
                ) : null}
                {hasCourses ? (
                  selectedProgressQuery.isLoading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                  ) : (
                    <div className="instructor-dashboard-snapshot">
                      <div>
                        <span className="client-meta">Students</span>
                        <strong>{selectedProgressQuery.data?.course.totalStudents ?? 0}</strong>
                      </div>
                      <div>
                        <span className="client-meta">Active</span>
                        <strong>{selectedProgressQuery.data?.course.activeStudents ?? 0}</strong>
                      </div>
                      <div>
                        <span className="client-meta">Weighted progress</span>
                        <strong>{selectedProgressQuery.data?.course.averageWeightedProgress ?? 0}%</strong>
                      </div>
                      <div>
                        <span className="client-meta">Assignments</span>
                        <strong>{assignmentsQuery.data?.length ?? 0}</strong>
                      </div>
                      <div>
                        <span className="client-meta">Quizzes</span>
                        <strong>{quizzesQuery.data?.length ?? 0}</strong>
                      </div>
                      <div>
                        <span className="client-meta">Lessons</span>
                        <strong>{getLessonCount(selectedCourseDetail) ?? 0}</strong>
                      </div>
                    </div>
                  )
                ) : (
                  <Empty description="Create or assign a course to see a selected-course snapshot." />
                )}
              </Card>
            </Col>

            <Col xs={24} xl={10}>
              <Card className="instructor-dashboard-card">
                <div className="instructor-dashboard-section-header">
                  <div>
                    <Typography.Text className="instructor-dashboard__eyebrow">Teaching attention</Typography.Text>
                    <Typography.Title level={3}>Real setup signals</Typography.Title>
                  </div>
                </div>
                <div className="instructor-dashboard-attention-list">
                  {draftCourses.length ? (
                    <Link to="/instructor/courses">
                      <strong>{draftCourses.length} draft course{draftCourses.length === 1 ? '' : 's'}</strong>
                      <span>Review courses that are not published yet.</span>
                    </Link>
                  ) : null}
                  {coursesNeedingLessons.length ? (
                    <Link to="/instructor/lessons">
                      <strong>{coursesNeedingLessons.length} loaded course{coursesNeedingLessons.length === 1 ? '' : 's'} without lessons</strong>
                      <span>Add modules or lessons before students begin.</span>
                    </Link>
                  ) : null}
                  {unpublishedQuizzes.length ? (
                    <Link to="/instructor/assessments">
                      <strong>{unpublishedQuizzes.length} unpublished quiz{unpublishedQuizzes.length === 1 ? '' : 'zes'} in selected course</strong>
                      <span>Publish only when questions and answers are ready.</span>
                    </Link>
                  ) : null}
                  {!draftCourses.length && !coursesNeedingLessons.length && !unpublishedQuizzes.length ? (
                    <div className="instructor-dashboard-attention-list__empty">
                      <strong>No setup gaps from loaded data</strong>
                      <span>Use reports and progress pages for deeper review.</span>
                    </div>
                  ) : null}
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </section>
  );
}

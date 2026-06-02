import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Skeleton, Tag, Typography } from 'antd';
import {
  BookOpen,
  BookOpenCheck,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import { useAdminCourseProgressList, useAdminProgressOverview } from '../../../../hooks/useProgressOverview';
import { listUsersRequest } from '../../../../services/api/authApi';
import { listCoursesRequest } from '../../../../services/api/courseApi';
import { canAccess, PERMISSIONS } from '../../../../utils/rbac';
import { useAuth } from '../../../../context/AuthContext';
import './index.css';

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

function formatCourseLabel(title: string) {
  return title.length > 10 ? `${title.slice(0, 10)}...` : title;
}

function MiniAreaChart({ labels, values }: { labels: string[]; values: number[] }) {
  const width = 100;
  const height = 100;
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const points = values.map((value, index) => {
    const x = values.length > 1 ? (index / (values.length - 1)) * width : width / 2;
    const y = height - ((value - min) / (max - min || 1)) * (height - 10) - 4;
    return `${x},${y}`;
  });

  return (
    <>
      <svg viewBox="0 0 100 100" className="dashboard-chart dashboard-chart--area" preserveAspectRatio="none">
        <defs>
          <linearGradient id="dashboardAreaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(59,130,246,0.28)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0.03)" />
          </linearGradient>
        </defs>
        <path d={`M 0,100 L ${points.join(' L ')} L 100,100 Z`} fill="url(#dashboardAreaGradient)" />
        <polyline points={points.join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2.4" />
      </svg>
      <div className="dashboard-chart__months">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </>
  );
}

function GroupedBarChart({
  labels,
  activeValues,
  completedValues,
  droppedValues,
}: {
  labels: string[];
  activeValues: number[];
  completedValues: number[];
  droppedValues: number[];
}) {
  const chartHeight = 140;
  const max = Math.max(...activeValues, ...completedValues, ...droppedValues, 1);

  return (
    <div className="dashboard-bars" aria-hidden="true">
      {labels.map((label, index) => (
        <div key={label} className="dashboard-bars__group">
          <span
            className="dashboard-bars__bar dashboard-bars__bar--active"
            style={{ height: `${(activeValues[index] / max) * chartHeight}px` }}
          />
          <span
            className="dashboard-bars__bar dashboard-bars__bar--completed"
            style={{ height: `${(completedValues[index] / max) * chartHeight}px` }}
          />
          <span
            className="dashboard-bars__bar dashboard-bars__bar--dropped"
            style={{ height: `${(droppedValues[index] / max) * chartHeight}px` }}
          />
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const canManageUsers = canAccess(user?.role, PERMISSIONS.USER_READ);
  const canManageCourses = canAccess(user?.role, PERMISSIONS.COURSE_CREATE);
  const canManageLessons = canAccess(user?.role, PERMISSIONS.LESSON_CREATE);
  const canMonitorInstructorProgress = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';
  const canMonitorAdminProgress = user?.role === 'ADMIN';
  const overviewQuery = useAdminProgressOverview();
  const courseProgressQuery = useAdminCourseProgressList({
    page: 1,
    pageSize: 12,
    sortBy: 'progress',
    sortOrder: 'desc',
  });
  const usersQuery = useQuery({
    queryKey: ['dashboard', 'admin-users'],
    queryFn: () => listUsersRequest({ includeDeleted: true, page: 1, limit: 100 }),
    staleTime: 60 * 1000,
    retry: 1,
  });
  const coursesQuery = useQuery({
    queryKey: ['dashboard', 'admin-courses'],
    queryFn: () => listCoursesRequest({ includeDeleted: true, page: 1, limit: 100 }),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const isLoading =
    overviewQuery.isLoading ||
    courseProgressQuery.isLoading ||
    usersQuery.isLoading ||
    coursesQuery.isLoading;
  const error =
    overviewQuery.error ??
    courseProgressQuery.error ??
    usersQuery.error ??
    coursesQuery.error;

  const topCourses = useMemo(
    () => (courseProgressQuery.data?.courses ?? []).slice(0, 6),
    [courseProgressQuery.data],
  );
  const courseLabels = topCourses.map((course) => formatCourseLabel(course.courseTitle));
  const courseProgressValues = topCourses.map((course) => course.averageWeightedProgress);
  const activeValues = topCourses.map((course) => course.activeStudents);
  const completedValues = topCourses.map((course) => course.completedStudents);
  const droppedValues = topCourses.map((course) => course.droppedStudents);

  const recentCourses = useMemo(
    () =>
      [...(courseProgressQuery.data?.courses ?? [])]
        .sort((left, right) => {
          const leftValue = left.lastActivityAt ? new Date(left.lastActivityAt).getTime() : 0;
          const rightValue = right.lastActivityAt ? new Date(right.lastActivityAt).getTime() : 0;
          return rightValue - leftValue;
        })
        .slice(0, 5),
    [courseProgressQuery.data],
  );

  const userStats = useMemo(() => {
    const users = usersQuery.data?.data ?? [];
    return {
      total: usersQuery.data?.meta?.total ?? users.length,
      active: users.filter((entry) => entry.isActive && !entry.deletedAt).length,
      instructors: users.filter((entry) => entry.role === 'INSTRUCTOR' && !entry.deletedAt).length,
    };
  }, [usersQuery.data]);

  const courseStats = useMemo(() => {
    const courses = coursesQuery.data?.data ?? [];
    return {
      total: coursesQuery.data?.meta?.total ?? courses.length,
      published: courses.filter((entry) => entry.status === 'PUBLISHED' && !entry.deletedAt).length,
      draft: courses.filter((entry) => entry.status === 'DRAFT' && !entry.deletedAt).length,
      archived: courses.filter((entry) => entry.status === 'ARCHIVED' && !entry.deletedAt).length,
      lessons: (courseProgressQuery.data?.courses ?? []).reduce((sum, course) => sum + course.totalLessons, 0),
    };
  }, [coursesQuery.data, courseProgressQuery.data]);

  const adminModules = [
    canManageUsers && {
      title: 'User Management',
      description: `${userStats.active} active accounts`,
      count: `${userStats.total} users`,
      trend: `${userStats.instructors} instructors`,
      positive: true,
      icon: ShieldCheck,
    },
    canManageCourses && {
      title: 'Courses',
      description: `${courseStats.published} published`,
      count: `${courseStats.total} courses`,
      trend: `${courseStats.draft} drafts`,
      positive: true,
      icon: BookOpen,
    },
    canManageLessons && {
      title: 'Lessons',
      description: 'Content organization',
      count: `${courseStats.lessons} lessons`,
      trend: `${courseStats.archived} archived courses`,
      positive: true,
      icon: BookOpenCheck,
    },
    canMonitorAdminProgress && {
      title: 'Analytics',
      description: 'Platform progress review',
      count: `${overviewQuery.data?.summary.averageWeightedProgress ?? 0}% avg progress`,
      trend: `${overviewQuery.data?.summary.averageCompletionRate ?? 0}% completion`,
      positive: true,
      icon: TrendingUp,
    },
    canMonitorInstructorProgress && {
      title: 'Instructor Progress',
      description: 'Student monitoring',
      count: `${overviewQuery.data?.summary.totalStudents ?? 0} students`,
      trend: `${overviewQuery.data?.summary.activeStudents ?? 0} active`,
      positive: true,
      icon: UserRound,
    },
  ].filter(Boolean) as Array<{
    title: string;
    description: string;
    count: string;
    trend: string;
    positive: boolean;
    icon: typeof ShieldCheck;
  }>;

  return (
    <section className="dashboard-template" aria-label="Admin dashboard overview">
      {error ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load dashboard data"
          description={error instanceof Error ? error.message : 'Unexpected error'}
        />
      ) : null}

      <div className="dashboard-template__stats-grid">
        <Card className="dashboard-stat-card" bordered={false}>
          <div className="dashboard-stat-card__copy">
            <span className="dashboard-stat-card__label">Total Courses</span>
            <strong className="dashboard-stat-card__value">
              {isLoading ? <Skeleton.Button active size="small" block /> : courseStats.total}
            </strong>
            <span className="dashboard-stat-card__trend dashboard-stat-card__trend--neutral">
              {courseStats.published} published · {courseStats.draft} draft
            </span>
          </div>
          <span className="dashboard-stat-card__icon dashboard-stat-card__icon--green">
            <BookOpen size={18} />
          </span>
        </Card>

        <Card className="dashboard-stat-card" bordered={false}>
          <div className="dashboard-stat-card__copy">
            <span className="dashboard-stat-card__label">Tracked Students</span>
            <strong className="dashboard-stat-card__value">
              {isLoading ? <Skeleton.Button active size="small" block /> : overviewQuery.data?.summary.totalStudents ?? 0}
            </strong>
            <span className="dashboard-stat-card__trend dashboard-stat-card__trend--neutral">
              {overviewQuery.data?.summary.activeStudents ?? 0} active · {overviewQuery.data?.summary.completedStudents ?? 0} completed
            </span>
          </div>
          <span className="dashboard-stat-card__icon dashboard-stat-card__icon--mint">
            <Users size={18} />
          </span>
        </Card>

        <Card className="dashboard-stat-card" bordered={false}>
          <div className="dashboard-stat-card__copy">
            <span className="dashboard-stat-card__label">Average Progress</span>
            <strong className="dashboard-stat-card__value">
              {isLoading ? <Skeleton.Button active size="small" block /> : `${overviewQuery.data?.summary.averageWeightedProgress ?? 0}%`}
            </strong>
            <span className="dashboard-stat-card__trend dashboard-stat-card__trend--neutral">
              {overviewQuery.data?.summary.droppedStudents ?? 0} dropped enrollments
            </span>
          </div>
          <span className="dashboard-stat-card__icon dashboard-stat-card__icon--rose">
            <TrendingUp size={18} />
          </span>
        </Card>

        <Card className="dashboard-stat-card" bordered={false}>
          <div className="dashboard-stat-card__copy">
            <span className="dashboard-stat-card__label">Completion Rate</span>
            <strong className="dashboard-stat-card__value">
              {isLoading ? <Skeleton.Button active size="small" block /> : `${overviewQuery.data?.summary.averageCompletionRate ?? 0}%`}
            </strong>
            <span className="dashboard-stat-card__trend dashboard-stat-card__trend--neutral">
              Last activity {formatDate(overviewQuery.data?.summary.lastActivityAt ?? null)}
            </span>
          </div>
          <span className="dashboard-stat-card__icon dashboard-stat-card__icon--lime">
            <BookOpenCheck size={18} />
          </span>
        </Card>
      </div>

      <div className="dashboard-template__charts-grid">
        <Card className="dashboard-surface-card" bordered={false}>
          <div className="dashboard-surface-card__heading">
            <div>
              <Typography.Title level={4}>Course Progress Snapshot</Typography.Title>
              <Typography.Text type="secondary">Top courses by weighted learning progress</Typography.Text>
            </div>
            <Tag color="blue">{topCourses.length} courses</Tag>
          </div>
          {isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : <MiniAreaChart labels={courseLabels} values={courseProgressValues} />}
        </Card>

        <Card className="dashboard-surface-card" bordered={false}>
          <div className="dashboard-surface-card__heading">
            <div>
              <Typography.Title level={4}>Enrollment Status by Course</Typography.Title>
              <Typography.Text type="secondary">Active, completed, and dropped students in top courses</Typography.Text>
            </div>
            <div className="dashboard-legend">
              <span><i className="dashboard-legend__dot dashboard-legend__dot--active" />active</span>
              <span><i className="dashboard-legend__dot dashboard-legend__dot--completed" />completed</span>
              <span><i className="dashboard-legend__dot dashboard-legend__dot--dropped" />dropped</span>
            </div>
          </div>
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <GroupedBarChart
              labels={courseLabels}
              activeValues={activeValues}
              completedValues={completedValues}
              droppedValues={droppedValues}
            />
          )}
        </Card>
      </div>

      <div className="dashboard-template__lists-grid">
        <Card className="dashboard-surface-card" bordered={false}>
          <div className="dashboard-surface-card__heading">
            <div>
              <Typography.Title level={4}>Recent Course Activity</Typography.Title>
              <Typography.Text type="secondary">Courses with the latest learner activity</Typography.Text>
            </div>
            <Button type="text" disabled>
              Live data
            </Button>
          </div>
          <div className="dashboard-list">
            {(isLoading ? [] : recentCourses).map((course) => (
              <div key={course.courseId} className="dashboard-list__row">
                <div>
                  <strong>{course.courseTitle}</strong>
                  <span>{course.instructorName}</span>
                </div>
                <div className="dashboard-list__meta">
                  <strong>{course.averageWeightedProgress}%</strong>
                  <Tag color={course.status === 'PUBLISHED' ? 'blue' : course.status === 'ARCHIVED' ? 'default' : 'gold'}>
                    {formatDate(course.lastActivityAt)}
                  </Tag>
                </div>
              </div>
            ))}
            {!isLoading && !recentCourses.length ? <div className="dashboard-list__empty">No course activity yet.</div> : null}
          </div>
        </Card>

        <Card className="dashboard-surface-card" bordered={false}>
          <div className="dashboard-surface-card__heading">
            <div>
              <Typography.Title level={4}>Platform Snapshot</Typography.Title>
              <Typography.Text type="secondary">Live LMS operations summary by module</Typography.Text>
            </div>
            <Tag color="purple">{user?.role}</Tag>
          </div>
          <div className="dashboard-list">
            {adminModules.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="dashboard-list__row">
                  <div className="dashboard-list__product">
                    <span className="dashboard-list__product-icon"><Icon size={16} /></span>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </div>
                  </div>
                  <div className="dashboard-list__meta">
                    <strong>{item.count}</strong>
                    <span className={item.positive ? 'dashboard-list__trend dashboard-list__trend--positive' : 'dashboard-list__trend dashboard-list__trend--negative'}>
                      {item.trend}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </section>
  );
}


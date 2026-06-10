import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Button, Progress, Skeleton, Typography } from 'antd';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileCheck2,
  GraduationCap,
  MessageSquareText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ActivityTimeline,
  EmptyState,
  MetricCard,
  NotificationCard,
  SectionHeader,
  StatusBadge,
  type StatusTone,
} from '../../../../components/client-ui';
import { useActivityTimeline, useProgressOverview } from '../../../../hooks/useProgressOverview';
import {
  listStudentCourseAssignmentsRequest,
  type AssignmentSubmissionRecord,
  type StudentAssignmentListItem,
} from '../../../../services/api/assignmentApi';
import { getCourseByIdRequest, type CourseDetail } from '../../../../services/api/courseApi';
import { listNotificationsRequest, type NotificationItem } from '../../../../services/api/notificationApi';
import { listStudentCourseQuizzesRequest, type StudentQuizCourseItem } from '../../../../services/api/quizApi';
import type { ActivityItem, CourseProgressItem } from '../../../../types/progress';
import { getNotificationDestination, getNotificationTypeLabel } from '../../../../utils/notifications';
import './StudentDashboard.css';

function getCurrentTimestamp() {
  return Date.now();
}

type DashboardDueItem = {
  id: string;
  kind: 'assignment' | 'quiz';
  title: string;
  courseTitle: string;
  timestamp: string | null;
  relativeCopy: string;
  href: string;
  actionLabel: string;
  status: {
    tone: StatusTone;
    label: string;
  };
};

type DashboardFocusItem = {
  id: string;
  label: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

function formatRelativeDate(value: string | null, now: number) {
  if (!value) return 'Date not set';

  const target = new Date(value).getTime();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays} days`;

  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return 'No recent update';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function flattenCourseLessons(course: CourseDetail | undefined) {
  if (!course) return [];

  return course.modules
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .flatMap((module) =>
      module.lessons
        .slice()
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map((lesson) => ({ ...lesson, moduleTitle: module.title })),
    );
}

function getAssignmentStatus(
  submission: AssignmentSubmissionRecord | undefined,
  dueDate: string | null,
  now: number,
): DashboardDueItem['status'] {
  if (submission?.status === 'GRADED') return { tone: 'graded', label: 'Graded' };
  if (submission) return { tone: 'submitted', label: submission.isLate ? 'Submitted late' : 'Submitted' };

  if (dueDate && new Date(dueDate).getTime() < now) {
    return { tone: 'overdue', label: 'Overdue' };
  }

  return { tone: 'pending', label: 'Pending' };
}

function getDeadlineActionClass(item: DashboardDueItem) {
  if (item.actionLabel === 'Submit' || item.actionLabel === 'Start quiz') {
    return 'client-button client-button-primary student-dashboard__item-action';
  }

  if (item.actionLabel === 'Review') {
    return 'client-button client-button-secondary student-dashboard__item-action';
  }

  return 'client-button client-button-ghost student-dashboard__item-action';
}

function buildDeadlineItems(
  courses: CourseProgressItem[],
  assignmentsByCourse: StudentAssignmentListItem[][],
  quizzesByCourse: StudentQuizCourseItem[][],
  now: number,
): DashboardDueItem[] {
  const courseMap = new Map(courses.map((course) => [course.courseId, course]));
  const assignmentItems = assignmentsByCourse.flatMap((assignments) =>
    assignments
      .filter((assignment) => assignment.dueDate)
      .map<DashboardDueItem>((assignment) => {
        const submission = assignment.submissions[0];

        return {
          id: assignment.id,
          kind: 'assignment',
          title: assignment.title,
          courseTitle: courseMap.get(assignment.courseId ?? '')?.courseTitle ?? 'Course assignment',
          timestamp: assignment.dueDate ?? null,
          relativeCopy: formatRelativeDate(assignment.dueDate ?? null, now),
          href: `/courses/${assignment.courseId}/assignments/${assignment.id}`,
          actionLabel: submission ? 'Review' : 'Submit',
          status: getAssignmentStatus(submission, assignment.dueDate ?? null, now),
        };
      }),
  );

  const quizItems = quizzesByCourse.flatMap((quizzes) =>
    quizzes
      .filter((quiz) => quiz.attemptsRemaining > 0)
      .map<DashboardDueItem>((quiz) => ({
        id: quiz.id,
        kind: 'quiz',
        title: quiz.title,
        courseTitle: courseMap.get(quiz.courseId)?.courseTitle ?? 'Course quiz',
        timestamp: null,
        relativeCopy: `${quiz.attemptsRemaining} attempt${quiz.attemptsRemaining === 1 ? '' : 's'} remaining`,
        href: `/courses/${quiz.courseId}/quizzes/${quiz.id}`,
        actionLabel: 'Start quiz',
        status: { tone: 'pending', label: 'Pending' },
      })),
  );

  return [...assignmentItems, ...quizItems]
    .sort((left, right) => {
      if (left.timestamp && right.timestamp) return new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
      if (left.timestamp) return -1;
      if (right.timestamp) return 1;
      return left.title.localeCompare(right.title);
    })
    .slice(0, 5);
}

function getActivityPresentation(activity: ActivityItem) {
  const lowerDescription = activity.description.toLowerCase();

  if (activity.type === 'ENROLLED') return { icon: <BookOpen aria-hidden="true" />, label: 'Course' };
  if (activity.type === 'COURSE_COMPLETED') return { icon: <CheckCircle2 aria-hidden="true" />, label: 'Course' };
  if (lowerDescription.includes('discussion') || lowerDescription.includes('chat') || lowerDescription.includes('comment')) {
    return { icon: <MessageSquareText aria-hidden="true" />, label: 'Discussion' };
  }
  if (lowerDescription.includes('assignment') || lowerDescription.includes('submitted')) {
    return { icon: <FileCheck2 aria-hidden="true" />, label: 'Assignment' };
  }
  if (lowerDescription.includes('quiz')) return { icon: <GraduationCap aria-hidden="true" />, label: 'Quiz' };

  return { icon: <BookOpen aria-hidden="true" />, label: 'Lesson' };
}

function getActivityDestination(activity: ActivityItem) {
  const lowerDescription = activity.description.toLowerCase();

  if (lowerDescription.includes('discussion') || lowerDescription.includes('chat') || lowerDescription.includes('comment')) {
    return { href: `/courses/${activity.courseId}/discussion`, actionLabel: 'Open discussion' };
  }
  if (lowerDescription.includes('assignment') || lowerDescription.includes('submitted')) {
    return { href: `/courses/${activity.courseId}/assignments`, actionLabel: 'View assignments' };
  }
  if (lowerDescription.includes('quiz')) return { href: `/courses/${activity.courseId}/quizzes`, actionLabel: 'Review quiz' };

  return { href: `/courses/${activity.courseId}`, actionLabel: 'Open course' };
}

function getNotificationActionLabel(notification: NotificationItem) {
  switch (notification.type) {
    case 'ASSIGNMENT':
      return 'Open assignment';
    case 'QUIZ':
      return 'Open quiz';
    case 'CHAT':
      return notification.courseId ? 'Open discussion' : 'Open community';
    case 'COURSE':
      return 'View announcement';
    case 'SYSTEM':
    default:
      return 'Open notifications';
  }
}

export function StudentDashboard({ studentName }: { studentName: string }) {
  const [now] = useState(getCurrentTimestamp);
  const overviewQuery = useProgressOverview();
  const activityQuery = useActivityTimeline(5, 0);
  const notificationsQuery = useQuery({
    queryKey: ['dashboard', 'notifications-preview'],
    queryFn: listNotificationsRequest,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const studentCourses = overviewQuery.data?.courses ?? [];
  const activeCourses = useMemo(
    () => studentCourses.filter((course) => course.enrollmentStatus === 'ACTIVE'),
    [studentCourses],
  );
  const continueCourse = activeCourses[0] ?? null;

  const continueCourseDetailQuery = useQuery({
    queryKey: ['dashboard', 'continue-course-detail', continueCourse?.courseId],
    queryFn: () => getCourseByIdRequest(continueCourse!.courseId),
    enabled: Boolean(continueCourse?.courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const dashboardCourseIds = activeCourses.slice(0, 3).map((course) => course.courseId);
  const assignmentQueries = useQueries({
    queries: dashboardCourseIds.map((courseId) => ({
      queryKey: ['dashboard', 'assignments-preview', courseId],
      queryFn: () => listStudentCourseAssignmentsRequest(courseId),
      staleTime: 60 * 1000,
      retry: 1,
    })),
  });
  const quizQueries = useQueries({
    queries: dashboardCourseIds.map((courseId) => ({
      queryKey: ['dashboard', 'quizzes-preview', courseId],
      queryFn: () => listStudentCourseQuizzesRequest(courseId),
      staleTime: 60 * 1000,
      retry: 1,
    })),
  });

  const isLoading = overviewQuery.isLoading || activityQuery.isLoading;
  const hasCriticalError = overviewQuery.isError && !overviewQuery.data;

  const activities = activityQuery.data?.activities ?? [];
  const continueCourseLessons = flattenCourseLessons(continueCourseDetailQuery.data);
  const currentLessonIndex = continueCourse
    ? Math.min(continueCourse.lessonsCompleted, Math.max(continueCourseLessons.length - 1, 0))
    : 0;
  const currentLesson = continueCourseLessons.length ? continueCourseLessons[currentLessonIndex] : null;
  const assignmentsByCourse = assignmentQueries.map((query) => query.data ?? []);
  const quizzesByCourse = quizQueries.map((query) => query.data ?? []);
  const deadlines = buildDeadlineItems(studentCourses, assignmentsByCourse, quizzesByCourse, now);
  const previewNotifications = (notificationsQuery.data ?? []).slice(0, 3);
  const unreadAlerts = (notificationsQuery.data ?? []).filter((notification) => !notification.isRead).length;
  const pendingAssignments = assignmentsByCourse.reduce(
    (sum, assignments) => sum + assignments.filter((assignment) => assignment.dueDate && assignment.submissions.length === 0).length,
    0,
  );
  const completedLessons = studentCourses.reduce((sum, course) => sum + course.lessonsCompleted, 0);
  const dueThisWeek = deadlines.filter((item) => item.timestamp).length;
  const focusItems: DashboardFocusItem[] = [
    deadlines[0]
      ? {
          id: `deadline-${deadlines[0].id}`,
          label: 'Next deadline',
          title: deadlines[0].title,
          description: `${deadlines[0].courseTitle} - ${deadlines[0].relativeCopy}`,
          href: deadlines[0].href,
          actionLabel: deadlines[0].actionLabel,
        }
      : null,
    activities[0]
      ? {
          id: `activity-${activities[0].id}`,
          label: 'Latest activity',
          title: activities[0].courseTitle,
          description: activities[0].description,
          href: getActivityDestination(activities[0]).href,
          actionLabel: getActivityDestination(activities[0]).actionLabel,
        }
      : null,
    {
      id: 'calendar-open',
      label: 'Calendar',
      title: `${dueThisWeek} item${dueThisWeek === 1 ? '' : 's'} due this week`,
      description: dueThisWeek ? 'Review your calendar before due dates become urgent.' : 'Use your calendar to plan your study week.',
      href: '/calendar',
      actionLabel: 'Open calendar',
    },
  ].filter((item): item is DashboardFocusItem => Boolean(item));

  if (isLoading && !overviewQuery.data) {
    return (
      <div className="student-dashboard client-loading-state" aria-live="polite">
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  if (hasCriticalError) {
    return (
      <div className="student-dashboard client-error-state" role="alert">
        <Typography.Title level={3}>We could not load your dashboard right now.</Typography.Title>
        <Typography.Paragraph>
          There was a temporary problem loading your learning overview. Try again or continue from your courses.
        </Typography.Paragraph>
        <div className="student-dashboard__actions-inline">
          <Button className="client-button client-button-primary" onClick={() => overviewQuery.refetch()}>
            Try again
          </Button>
          <Link to="/courses" className="client-button client-button-secondary">
            Go to courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <header className="student-dashboard__intro">
        <div>
          <Typography.Title level={2} className="client-page-title">
            Dashboard
          </Typography.Title>
          <Typography.Paragraph className="client-body">
            {getGreeting()}, {studentName}. Continue learning, check deadlines, and review updates from one place.
          </Typography.Paragraph>
        </div>
        {overviewQuery.data?.summary.lastActivityAt ? (
          <span className="client-badge client-badge-neutral">
            Last activity {formatTimestamp(overviewQuery.data.summary.lastActivityAt)}
          </span>
        ) : null}
      </header>

      <div className="student-dashboard__layout" aria-label="Student dashboard sections">
        <main className="student-dashboard__main">
          <article className="student-dashboard__panel student-dashboard__panel--continue client-card">
            <SectionHeader
              title="Continue Learning"
              subtitle="Resume the active course that needs your next attention."
            />
            {continueCourse ? (
              <div className="student-dashboard__continue">
                <div className="student-dashboard__continue-copy">
                  <span className="client-badge client-badge-info">Active course</span>
                  <div>
                    <Typography.Title level={4} className="client-card-title">{continueCourse.courseTitle}</Typography.Title>
                    <Typography.Paragraph className="client-body">
                      {currentLesson ? `${currentLesson.moduleTitle}: ${currentLesson.title}` : 'Open the course overview to choose your next lesson.'}
                    </Typography.Paragraph>
                  </div>
                  <div className="student-dashboard__progress-summary">
                    <div className="student-dashboard__course-row">
                      <span className="client-meta">{continueCourse.lessonsCompleted}/{continueCourse.totalLessons} lessons completed</span>
                      <strong>{continueCourse.percentage}%</strong>
                    </div>
                    <Progress percent={continueCourse.percentage} showInfo={false} strokeColor="#00288e" />
                  </div>
                  <div className="student-dashboard__actions-inline">
                    <Link
                      to={currentLesson ? `/courses/${continueCourse.courseId}/learn/${currentLesson.id}` : `/courses/${continueCourse.courseId}`}
                      className="client-button client-button-primary"
                    >
                      Continue learning
                    </Link>
                    <Link to={`/courses/${continueCourse.courseId}`} className="client-button client-button-secondary">
                      View course
                    </Link>
                  </div>
                </div>
                <div className="student-dashboard__continue-meter" aria-hidden="true">
                  <Progress type="circle" percent={continueCourse.percentage} size={96} strokeColor="#00288e" />
                </div>
              </div>
            ) : (
              <EmptyState
                compact
                icon={<BookOpen size={20} aria-hidden="true" />}
                title="No active course yet."
                description="Browse courses to enroll and start tracking your learning progress."
                action={<Link to="/courses" className="client-button client-button-primary">Browse courses</Link>}
              />
            )}
          </article>

          <article className="student-dashboard__panel client-card">
            <SectionHeader
              title="Upcoming Deadlines"
              subtitle="Assignments and quizzes that need attention soon."
              action={<Link to="/calendar" className="client-button client-button-ghost">View calendar</Link>}
            />
            {deadlines.length ? (
              <div className="student-dashboard__list">
                {deadlines.map((item) => (
                  <div key={`${item.kind}-${item.id}`} className="student-dashboard__list-item">
                    <span className="student-dashboard__list-icon" aria-hidden="true">
                      {item.kind === 'assignment' ? <FileCheck2 size={16} /> : <GraduationCap size={16} />}
                    </span>
                    <div className="student-dashboard__list-copy">
                      <strong>{item.title}</strong>
                      <span className="client-meta">{item.courseTitle} - {item.relativeCopy}</span>
                    </div>
                    <div className="student-dashboard__list-meta">
                      <StatusBadge tone={item.status.tone}>{item.status.label}</StatusBadge>
                      <Link to={item.href} className={getDeadlineActionClass(item)}>
                        {item.actionLabel}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState compact icon={<CheckCircle2 size={20} aria-hidden="true" />} title="No upcoming deadlines." />
            )}
          </article>

          <article className="student-dashboard__panel client-card">
            <SectionHeader
              title="Recent Activity"
              subtitle="Latest learning actions recorded from your workspace."
            />
            {activities.length ? (
              <ActivityTimeline
                items={activities.map((item) => {
                  const presentation = getActivityPresentation(item);
                  const action = getActivityDestination(item);
                  return {
                    id: item.id,
                    icon: presentation.icon,
                    label: presentation.label,
                    title: item.courseTitle,
                    description: item.description,
                    time: formatTimestamp(item.timestamp),
                    action: (
                      <Link to={action.href} className="client-button client-button-ghost student-dashboard__timeline-action">
                        {action.actionLabel}
                      </Link>
                    ),
                  };
                })}
              />
            ) : (
              <EmptyState compact icon={<Clock3 size={20} aria-hidden="true" />} title="No recent activity yet." />
            )}
          </article>
        </main>

        <aside className="student-dashboard__aside">
          <article className="student-dashboard__panel client-card">
            <SectionHeader
              title="Learning Summary"
              action={<Link to="/progress" className="client-button client-button-secondary">View progress</Link>}
            />
            <div className="student-dashboard__metric-grid">
              <MetricCard label="Active courses" value={overviewQuery.data?.summary.activeCourses ?? 0} caption="Current workload" />
              <MetricCard label="Completed lessons" value={completedLessons} caption="Across enrolled courses" />
              <MetricCard label="Pending assignments" value={pendingAssignments} caption="Open submissions" />
              <MetricCard label="Average progress" value={`${overviewQuery.data?.summary.overallProgress ?? 0}%`} caption="Across courses" />
            </div>
          </article>

          <article className="student-dashboard__panel client-card">
            <SectionHeader
              title="Notifications"
              subtitle={unreadAlerts ? `${unreadAlerts} unread update${unreadAlerts === 1 ? '' : 's'}` : 'Latest course updates'}
              action={<Link to="/notifications" className="client-button client-button-ghost">View all</Link>}
            />
            {notificationsQuery.isLoading ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : previewNotifications.length ? (
              <div className="student-dashboard__notifications">
                {previewNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    title={getNotificationTypeLabel(notification)}
                    message={notification.message}
                    time={formatTimestamp(notification.createdAt)}
                    unread={!notification.isRead}
                    action={
                      <Link
                        to={getNotificationDestination(notification) || '/notifications'}
                        className="client-button client-button-ghost student-dashboard__notification-action"
                      >
                        {getNotificationActionLabel(notification)}
                      </Link>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState compact icon={<Bell size={20} aria-hidden="true" />} title="No notifications right now." />
            )}
          </article>

          <article className="student-dashboard__panel client-card">
            <SectionHeader
              title="Weekly Focus"
              subtitle="Small set of actions to keep the week moving."
            />
            <div className="student-dashboard__focus-list">
              {focusItems.map((item) => (
                <div key={item.id} className="student-dashboard__focus-item">
                  <div className="student-dashboard__focus-copy">
                    <span className="student-dashboard__focus-label">{item.label}</span>
                    <strong>{item.title}</strong>
                    <span className="client-meta">{item.description}</span>
                  </div>
                  <Link to={item.href} className="client-button client-button-ghost student-dashboard__focus-action">
                    {item.actionLabel}
                  </Link>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </div>
  );
}

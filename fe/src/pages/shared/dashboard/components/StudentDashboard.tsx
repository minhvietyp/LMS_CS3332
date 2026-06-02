import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Button, Progress, Skeleton, Typography } from 'antd';
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Flame,
  FileCheck2,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ActivityTimeline,
  EmptyState,
  MetricCard,
  NotificationCard,
  SectionHeader,
  StatusBadge,
} from '../../../../components/client-ui';
import { useActivityTimeline, useProgressOverview } from '../../../../hooks/useProgressOverview';
import {
  listStudentCourseAssignmentsRequest,
  type StudentAssignmentListItem,
} from '../../../../services/api/assignmentApi';
import {
  getCourseByIdRequest,
  listCoursesRequest,
  type CourseDetail,
  type PublicCourseListItem,
} from '../../../../services/api/courseApi';
import {
  listNotificationsRequest,
  type NotificationItem,
} from '../../../../services/api/notificationApi';
import {
  listStudentCourseQuizzesRequest,
  type StudentQuizCourseItem,
} from '../../../../services/api/quizApi';
import type {
  ActivityItem,
  CourseProgressItem,
} from '../../../../types/progress';
import { getNotificationDestination, getNotificationTypeLabel } from '../../../../utils/notifications';
import './StudentDashboard.css';

type DashboardDueItem = {
  id: string;
  kind: 'assignment' | 'quiz' | 'milestone';
  title: string;
  courseTitle: string;
  timestamp: string | null;
  relativeCopy: string;
  href: string;
  actionLabel: string;
};

type WeeklyFocusItem = {
  id: string;
  label: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
};

function formatRelativeDate(value: string | null) {
  if (!value) {
    return 'Date not set';
  }

  const target = new Date(value).getTime();
  const diffDays = Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays} days`;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return 'No recent update';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getDueStatus(item: DashboardDueItem) {
  if (item.timestamp) {
    const diffDays = Math.ceil((new Date(item.timestamp).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { tone: 'overdue' as const, label: 'Overdue' };
    if (diffDays <= 2) return { tone: 'due-soon' as const, label: 'Due Soon' };
    return { tone: 'in-progress' as const, label: 'Upcoming' };
  }

  if (item.actionLabel === 'Review') return { tone: 'submitted' as const, label: 'Submitted' };
  if (item.kind === 'milestone') return { tone: 'in-progress' as const, label: 'Upcoming' };
  return { tone: 'passed' as const, label: 'Available' };
}

function getDeadlineActionClass(item: DashboardDueItem) {
  if (item.actionLabel === 'Submit' || item.actionLabel === 'Start quiz' || item.actionLabel === 'Continue learning') {
    return 'client-button client-button-primary student-dashboard__item-action';
  }
  if (item.actionLabel === 'Review' || item.actionLabel === 'Continue') {
    return 'client-button client-button-secondary student-dashboard__item-action';
  }
  return 'client-button client-button-ghost student-dashboard__item-action';
}

function getSupportActionClass(actionLabel: string) {
  if (actionLabel === 'Submit' || actionLabel === 'Start quiz' || actionLabel === 'Continue learning') {
    return 'client-button client-button-primary student-dashboard__focus-action';
  }

  if (
    actionLabel === 'Review'
    || actionLabel === 'Continue'
    || actionLabel === 'Open assignment'
    || actionLabel === 'Open quiz'
    || actionLabel === 'View announcement'
  ) {
    return 'client-button client-button-secondary student-dashboard__focus-action';
  }

  return 'client-button client-button-ghost student-dashboard__focus-action';
}

function getActivityPresentation(activity: ActivityItem) {
  const lowerDescription = activity.description.toLowerCase();

  if (activity.type === 'COURSE_COMPLETED') {
    return {
      icon: <Award aria-hidden="true" />,
      label: 'Milestone',
    };
  }

  if (activity.type === 'ENROLLED') {
    return {
      icon: <Sparkles aria-hidden="true" />,
      label: 'Milestone',
    };
  }

  if (lowerDescription.includes('discussion') || lowerDescription.includes('chat') || lowerDescription.includes('comment')) {
    return {
      icon: <MessageSquareText aria-hidden="true" />,
      label: 'Discussion',
    };
  }

  if (lowerDescription.includes('assignment') || lowerDescription.includes('submitted')) {
    return {
      icon: <FileCheck2 aria-hidden="true" />,
      label: 'Assignment',
    };
  }

  if (lowerDescription.includes('quiz')) {
    return {
      icon: <GraduationCap aria-hidden="true" />,
      label: 'Quiz',
    };
  }

  return {
    icon: <BookOpen aria-hidden="true" />,
    label: 'Lesson',
  };
}

function getActivityDestination(activity: ActivityItem) {
  const lowerDescription = activity.description.toLowerCase();

  if (lowerDescription.includes('discussion') || lowerDescription.includes('chat') || lowerDescription.includes('comment')) {
    return {
      href: `/courses/${activity.courseId}/discussion`,
      actionLabel: 'Open discussion',
    };
  }

  if (lowerDescription.includes('assignment') || lowerDescription.includes('submitted')) {
    return {
      href: `/courses/${activity.courseId}/assignments`,
      actionLabel: 'View assignments',
    };
  }

  if (lowerDescription.includes('quiz')) {
    return {
      href: `/courses/${activity.courseId}/quizzes`,
      actionLabel: 'Review quiz',
    };
  }

  return {
    href: `/courses/${activity.courseId}`,
    actionLabel: activity.type === 'LESSON_COMPLETED' ? 'Open course' : 'Open course',
  };
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getStreakFromActivities(activities: ActivityItem[]) {
  const uniqueDays = [...new Set(activities.map((item) => new Date(item.timestamp).toISOString().slice(0, 10)))];
  if (!uniqueDays.length) return 0;

  const daySet = new Set(uniqueDays);
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!daySet.has(key)) {
      if (streak === 0) {
        cursor.setDate(cursor.getDate() - 1);
        const previousKey = cursor.toISOString().slice(0, 10);
        if (!daySet.has(previousKey)) {
          return 0;
        }
      } else {
        break;
      }
    }

    if (daySet.has(key)) {
      streak += 1;
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
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
        .map((lesson) => ({
          ...lesson,
          moduleTitle: module.title,
        })),
    );
}

function buildDeadlineItems(
  courses: CourseProgressItem[],
  assignmentsByCourse: StudentAssignmentListItem[][],
  quizzesByCourse: StudentQuizCourseItem[][],
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
          relativeCopy: formatRelativeDate(assignment.dueDate ?? null),
          href: `/courses/${assignment.courseId}/assignments/${assignment.id}`,
          actionLabel: submission ? 'Review' : 'Submit',
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
      })),
  );

  const milestoneItems = courses
    .filter((course) => course.enrollmentStatus === 'ACTIVE' && course.lessonsCompleted < course.totalLessons)
    .slice(0, 2)
    .map<DashboardDueItem>((course) => ({
      id: `${course.courseId}-milestone`,
      kind: 'milestone',
      title: `Next lesson in ${course.courseTitle}`,
      courseTitle: course.courseTitle,
      timestamp: null,
      relativeCopy: `${course.lessonsCompleted}/${course.totalLessons} lessons complete`,
      href: `/courses/${course.courseId}`,
      actionLabel: 'Continue',
    }));

  return [...assignmentItems, ...quizItems, ...milestoneItems]
    .sort((left, right) => {
      if (left.timestamp && right.timestamp) return new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
      if (left.timestamp) return -1;
      if (right.timestamp) return 1;
      return left.title.localeCompare(right.title);
    })
    .slice(0, 4);
}

export function StudentDashboard({ studentName }: { studentName: string }) {
  const overviewQuery = useProgressOverview();
  const activityQuery = useActivityTimeline(6, 0);
  const notificationsQuery = useQuery({
    queryKey: ['dashboard', 'notifications-preview'],
    queryFn: listNotificationsRequest,
    staleTime: 60 * 1000,
    retry: 1,
  });
  const catalogQuery = useQuery({
    queryKey: ['dashboard', 'student-catalog-preview'],
    queryFn: () => listCoursesRequest({ page: 1, limit: 8, status: 'PUBLISHED' }),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const studentCourses = overviewQuery.data?.courses ?? [];
  const activeCourses = useMemo(
    () => studentCourses.filter((course) => course.enrollmentStatus === 'ACTIVE'),
    [studentCourses],
  );
  const continueCourse = activeCourses[0] ?? studentCourses[0] ?? null;

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

  const isLoading = overviewQuery.isLoading || activityQuery.isLoading || catalogQuery.isLoading;
  const hasCriticalError = overviewQuery.isError && !overviewQuery.data;

  const activities = activityQuery.data?.activities ?? [];
  const streak = getStreakFromActivities(activities);
  const continueCourseLessons = flattenCourseLessons(continueCourseDetailQuery.data);
  const currentLesson = continueCourse
    ? continueCourseLessons[Math.min(continueCourse.lessonsCompleted, continueCourseLessons.length - 1)]
    : null;
  const nextLesson = continueCourse
    ? continueCourseLessons[Math.min(continueCourse.lessonsCompleted + 1, continueCourseLessons.length - 1)]
    : null;

  const assignmentsByCourse = assignmentQueries.map((query) => query.data ?? []);
  const quizzesByCourse = quizQueries.map((query) => query.data ?? []);
  const submittedAssignments = assignmentsByCourse.reduce(
    (sum, assignments) => sum + assignments.filter((assignment) => assignment.submissions.length > 0).length,
    0,
  );
  const availableQuizAttempts = quizzesByCourse.reduce(
    (sum, quizzes) => sum + quizzes.filter((quiz) => quiz.attemptsUsed > 0).length,
    0,
  );

  const deadlines = buildDeadlineItems(studentCourses, assignmentsByCourse, quizzesByCourse);
  const enrolledCourseIds = new Set(studentCourses.map((course) => course.courseId));
  const recommendedCourses = (catalogQuery.data?.data ?? [])
    .filter((course): course is PublicCourseListItem => !enrolledCourseIds.has(course.id))
    .slice(0, 3);
  const previewNotifications = (notificationsQuery.data ?? []).slice(0, 3);
  const unreadAlerts = (notificationsQuery.data ?? []).filter((notification) => !notification.isRead).length;
  const dueThisWeek = deadlines.filter((item) => item.timestamp).length;
  const hasSingleRecommendation = recommendedCourses.length === 1;
  const nextDeadline = deadlines[0] ?? null;
  const nextActivity = activities[0] ?? null;
  const weeklyFocusItems: WeeklyFocusItem[] = [
    nextDeadline
      ? {
          id: `deadline-${nextDeadline.id}`,
          label: 'Next deadline',
          title: nextDeadline.title,
          description: `${nextDeadline.courseTitle} · ${nextDeadline.relativeCopy}`,
          href: nextDeadline.href,
          actionLabel: nextDeadline.actionLabel,
        }
      : null,
    nextActivity
      ? {
          id: `activity-${nextActivity.id}`,
          label: 'Latest activity',
          title: nextActivity.courseTitle,
          description: nextActivity.description,
          href: getActivityDestination(nextActivity).href,
          actionLabel: getActivityDestination(nextActivity).actionLabel,
        }
      : null,
    {
      id: 'calendar-open',
      label: 'Calendar',
      title: `${dueThisWeek} item${dueThisWeek === 1 ? '' : 's'} due this week`,
      description: dueThisWeek
        ? 'Open your calendar to review due work and plan your study rhythm.'
        : 'Open your calendar to map the rest of your study week.',
      href: '/calendar',
      actionLabel: 'Open calendar',
    },
  ].filter((item): item is WeeklyFocusItem => Boolean(item));

  const quickStats = [
    {
      label: 'Open deadlines',
      value: String(deadlines.length),
      note: 'Items needing action',
    },
    {
      label: 'Unread alerts',
      value: String(unreadAlerts),
      note: 'Latest updates',
    },
    {
      label: 'Explore next',
      value: String(recommendedCourses.length),
      note: 'Public courses suggested',
    },
    {
      label: 'Weekly focus',
      value: String(dueThisWeek),
      note: 'Tasks scheduled this week',
    },
  ];

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
        <Typography.Title level={3}>We couldn&apos;t load your dashboard right now.</Typography.Title>
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

  if (!studentCourses.length) {
    return (
      <div className="student-dashboard">
        <EmptyState
          icon={<Sparkles size={28} aria-hidden="true" />}
          title="Your academic journey starts here."
          description="Browse available courses, enroll in your first subject, and this dashboard will begin tracking your progress."
          action={
            <div className="student-dashboard__actions-inline">
              <Link to="/courses" className="client-button client-button-primary">
                Browse courses
              </Link>
              <Link to="/calendar" className="client-button client-button-secondary">
                View calendar
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <section className="student-dashboard__hero" aria-labelledby="student-dashboard-welcome">
        <div className="student-dashboard__hero-copy">
          <span className="student-dashboard__eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            Learning overview
          </span>
          <Typography.Title id="student-dashboard-welcome" level={2} className="client-page-title student-dashboard__hero-title">
            {getGreeting()}, {studentName}
          </Typography.Title>
          <Typography.Paragraph className="client-body">
            Welcome back. Here is your academic overview for today.
          </Typography.Paragraph>
          {overviewQuery.data?.summary.lastActivityAt ? (
            <Typography.Text className="client-meta student-dashboard__hero-meta">
              Last activity: {formatTimestamp(overviewQuery.data.summary.lastActivityAt)}
            </Typography.Text>
          ) : null}
          <div className="student-dashboard__hero-actions">
            <Link
              to={
                continueCourse && currentLesson
                  ? `/courses/${continueCourse.courseId}/learn/${currentLesson.id}`
                  : '/courses'
              }
              className="client-button client-button-primary"
            >
              Continue learning
            </Link>
            <Link to="/courses" className="client-button client-button-secondary">
              View my courses
            </Link>
          </div>
        </div>
        <div className="student-dashboard__hero-side">
          {quickStats.map((stat) => (
            <MetricCard
              key={stat.label}
              className="student-dashboard__hero-stat"
              label={stat.label}
              value={stat.value}
              caption={stat.note}
            />
          ))}
        </div>
      </section>

      <section className="student-dashboard__grid student-dashboard__grid--feature" aria-label="Core learning dashboard sections">
        <article className="student-dashboard__section-card student-dashboard__section-card--continue client-card">
          <SectionHeader
            title="Continue Learning"
            subtitle="Resume your most active course and pick up from the next lesson."
            className="student-dashboard__section-header"
          />
          {continueCourse ? (
            <div className="student-dashboard__continue">
              <div className="student-dashboard__continue-main">
                <div className="student-dashboard__course-meta">
                  <span className="client-badge client-badge-info">Active course</span>
                </div>
                <div>
                  <Typography.Title level={4} className="client-card-title">{continueCourse.courseTitle}</Typography.Title>
                  <Typography.Paragraph className="client-body">
                    Continue your path through {continueCourse.totalLessons} lessons and keep your academic momentum consistent.
                  </Typography.Paragraph>
                </div>
                <div className="student-dashboard__mini-grid">
                  <div className="student-dashboard__mini-card">
                    <span>Current lesson</span>
                    <strong>{currentLesson?.title ?? 'Course overview'}</strong>
                  </div>
                  <div className="student-dashboard__mini-card">
                    <span>Next lesson</span>
                    <strong>{nextLesson?.title ?? 'Wrap current module'}</strong>
                  </div>
                </div>
                <div className="student-dashboard__progress-summary">
                  <div className="student-dashboard__course-row">
                    <span className="client-meta">{continueCourse.lessonsCompleted}/{continueCourse.totalLessons} lessons completed</span>
                    <strong>{continueCourse.percentage}% complete</strong>
                  </div>
                  <Progress
                    percent={continueCourse.percentage}
                    showInfo={false}
                    strokeColor={['#00288e', '#4648d4']}
                    aria-label={`${continueCourse.percentage}% complete`}
                  />
                </div>
                <div className="student-dashboard__actions-inline">
                  <Link
                    to={
                      currentLesson
                        ? `/courses/${continueCourse.courseId}/learn/${currentLesson.id}`
                        : `/courses/${continueCourse.courseId}`
                    }
                    className="client-button client-button-primary"
                  >
                    Continue learning
                  </Link>
                  <Link
                    to={`/courses/${continueCourse.courseId}`}
                    className="client-button client-button-secondary"
                  >
                    View course
                  </Link>
                </div>
              </div>
              <aside className="student-dashboard__progress-rail">
                <div className="student-dashboard__progress-ring">
                  <Progress
                    type="circle"
                    percent={continueCourse.percentage}
                    size={98}
                    strokeColor="#00288e"
                    aria-label={`${continueCourse.percentage}% course completion`}
                  />
                </div>
                <div className="student-dashboard__progress-summary-copy">
                  <Typography.Title level={5} className="client-card-title">Progress summary</Typography.Title>
                  <Typography.Paragraph className="client-meta">
                    Open the current lesson or revisit the full curriculum.
                  </Typography.Paragraph>
                </div>
              </aside>
            </div>
          ) : (
            <EmptyState
              compact
              icon={<BookOpen size={20} aria-hidden="true" />}
              title="No active course available yet."
            />
          )}
        </article>

        <aside className="student-dashboard__section-card student-dashboard__section-card--summary client-card">
          <SectionHeader
            title="Learning Progress Summary"
            action={
              <Link to="/progress" className="client-button client-button-secondary student-dashboard__section-action">
                View full progress
              </Link>
            }
            className="student-dashboard__section-header"
          />
          <div className="student-dashboard__metric-grid">
            <MetricCard
              label="Courses in Progress"
              value={String(overviewQuery.data?.summary.activeCourses ?? 0)}
              caption="Current course load"
            />
            <MetricCard
              label="Upcoming Deadlines"
              value={String(deadlines.length)}
              caption="Tasks queued"
            />
            <MetricCard
              label="Assignments Submitted"
              value={String(submittedAssignments)}
              caption="Recent course work"
            />
            <MetricCard
              label="Quiz Attempts"
              value={String(availableQuizAttempts)}
              caption="Started assessments"
            />
          </div>
        </aside>
      </section>

      <section className="student-dashboard__grid student-dashboard__grid--split">
        <article className="student-dashboard__section-card student-dashboard__section-card--deadlines client-card">
          <SectionHeader
            title="Upcoming Deadlines"
            subtitle="Due work, quiz availability, and next milestones."
            action={
              <Link to="/calendar" className="client-button client-button-ghost student-dashboard__section-action">
                Open calendar
              </Link>
            }
            className="student-dashboard__section-header"
          />
          {deadlines.length ? (
            <div className="student-dashboard__list">
              {deadlines.map((item) => {
                const status = getDueStatus(item);
                return (
                  <div key={item.id} className="student-dashboard__list-item">
                    <span className="student-dashboard__list-icon" aria-hidden="true">
                      {item.kind === 'assignment' ? <CheckCircle2 size={16} /> : item.kind === 'quiz' ? <GraduationCap size={16} /> : <Clock3 size={16} />}
                    </span>
                    <div className="student-dashboard__list-copy">
                      <strong>{item.title}</strong>
                      <span className="client-meta">
                        <span className="student-dashboard__list-type">{item.kind}</span>
                        {item.courseTitle} · {item.relativeCopy}
                      </span>
                    </div>
                    <div className="student-dashboard__list-meta">
                      <StatusBadge tone={status.tone}>
                        {status.label}
                      </StatusBadge>
                      <Link to={item.href} className={getDeadlineActionClass(item)}>
                        {item.actionLabel}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState compact icon={<CheckCircle2 size={20} aria-hidden="true" />} title="You are all caught up for now." />
          )}
        </article>

        <article className="student-dashboard__section-card student-dashboard__section-card--activity client-card">
          <SectionHeader
            title="Recent Activity Feed"
            subtitle="Your latest completed lessons, submissions, and course updates."
            className="student-dashboard__section-header"
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
      </section>

      <section className="student-dashboard__section-card student-dashboard__section-card--recommendations client-card">
        <SectionHeader
          title={hasSingleRecommendation ? 'Explore Next' : 'Recommended Courses'}
          subtitle={
            hasSingleRecommendation
              ? 'A suggested public course to explore next without leaving your dashboard.'
              : 'Public courses you can explore next without leaving your learning workspace.'
          }
          action={
            <Link to="/catalog" className="client-button client-button-ghost student-dashboard__section-action">
              View catalog
            </Link>
          }
          className="student-dashboard__section-header"
        />
        {recommendedCourses.length ? (
          <div className={`student-dashboard__cards${hasSingleRecommendation ? ' student-dashboard__cards--compact' : ''}`}>
            {recommendedCourses.map((course) => (
              <Link
                key={course.id}
                to={`/catalog/${course.id}`}
                className={`student-dashboard__course-card client-card client-card-hover${hasSingleRecommendation ? ' student-dashboard__course-card--single' : ''}`}
              >
                <div className="student-dashboard__course-image" aria-hidden="true" />
                <div className="student-dashboard__course-meta-block">
                  <span>{course.status}</span>
                  <strong>{course.title}</strong>
                  <Typography.Text type="secondary" className="client-meta">
                    {course.instructor?.name ?? 'Academic faculty'}
                  </Typography.Text>
                </div>
                <div className="student-dashboard__course-row">
                  <span className="client-meta">{course.lessonCount ?? 0} lessons</span>
                  <span className="client-button client-button-ghost student-dashboard__course-action">Open details</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState compact icon={<Sparkles size={20} aria-hidden="true" />} title="No recommendations available right now." />
        )}
      </section>

      <section className="student-dashboard__grid student-dashboard__grid--split">
        <article className="student-dashboard__section-card student-dashboard__section-card--notifications client-card">
          <SectionHeader
            title="Notifications Preview"
            subtitle="Latest important course and assignment updates."
            action={
              <Link to="/notifications" className="client-button client-button-ghost student-dashboard__section-action">
                View all
              </Link>
            }
            className="student-dashboard__section-header"
          />
          {notificationsQuery.isLoading ? (
            <Skeleton active paragraph={{ rows: 3 }} />
          ) : previewNotifications.length ? (
            <div className="student-dashboard__notifications">
              {previewNotifications.map((notification: NotificationItem) => (
                <NotificationCard
                  key={notification.id}
                  title={getNotificationTypeLabel(notification)}
                  message={notification.message}
                  time={formatTimestamp(notification.createdAt)}
                  unread={!notification.isRead}
                  action={
                    getNotificationDestination(notification) ? (
                      <Link
                        to={getNotificationDestination(notification)!}
                        className="client-button client-button-ghost student-dashboard__notification-action"
                      >
                        {getNotificationActionLabel(notification)}
                      </Link>
                    ) : (
                      <Link to="/notifications" className="client-button client-button-ghost student-dashboard__notification-action">
                        Open notifications
                      </Link>
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState compact icon={<Bell size={20} aria-hidden="true" />} title="No notifications right now." />
          )}
        </article>

        <article className="student-dashboard__section-card student-dashboard__section-card--insights client-card">
          <SectionHeader
            title="Progress Insights"
            subtitle="Compact check-in on momentum and course completion."
            className="student-dashboard__section-header"
          />
          <div className="student-dashboard__insight-grid">
            <MetricCard
              className="student-dashboard__insight"
              label="Learning streak"
              value={`${streak} day${streak === 1 ? '' : 's'}`}
              caption={<><Flame size={14} aria-hidden="true" /> Keep the momentum building</>}
            />
            <MetricCard
              className="student-dashboard__insight"
              label="Completed courses"
              value={overviewQuery.data?.summary.completedCourses ?? 0}
              caption={<><Award size={14} aria-hidden="true" /> Courses fully finished</>}
            />
            <MetricCard
              className="student-dashboard__insight"
              label="Due this week"
              value={dueThisWeek}
              caption="Tasks requiring attention"
            />
            <MetricCard
              className="student-dashboard__insight"
              label="Overall progress"
              value={`${overviewQuery.data?.summary.overallProgress ?? 0}%`}
              caption="Across active courses"
            />
          </div>
        </article>
      </section>

      <section>
        <article className="student-dashboard__section-card student-dashboard__section-card--calendar client-card">
          <SectionHeader
            title="Weekly Focus"
            subtitle="The next actions that shape your learning week."
            className="student-dashboard__section-header"
          />
          {weeklyFocusItems.length ? (
            <div className="student-dashboard__focus-list">
              {weeklyFocusItems.map((item) => (
                <div key={item.id} className="student-dashboard__focus-item">
                  <div className="student-dashboard__focus-copy">
                    <span className="student-dashboard__focus-label">{item.label}</span>
                    <strong>{item.title}</strong>
                    <span className="client-meta">{item.description}</span>
                  </div>
                  <Link to={item.href} className={getSupportActionClass(item.actionLabel)}>
                    {item.actionLabel}
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState compact icon={<Clock3 size={18} aria-hidden="true" />} title="No focus items for this week." />
          )}
        </article>
      </section>
    </div>
  );
}

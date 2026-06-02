import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { listStudentCourseAssignmentsRequest, type StudentAssignmentListItem } from '../../../services/api/assignmentApi';
import { progressService } from '../../../services/api/progressService';
import { listStudentCourseQuizzesRequest } from '../../../services/api/quizApi';
import type { ProgressHistoryItem } from '../../../types/progress';
import './StudentCalendarPage.css';

type AssignmentCalendarStatus = 'OVERDUE' | 'DUE_TODAY' | 'DUE_SOON' | 'UPCOMING' | 'SUBMITTED' | 'GRADED';
type CalendarFocusBucket = 'today' | 'tomorrow' | 'this-week';

type CalendarAssignmentItem = {
  id: string;
  courseId: string;
  title: string;
  courseTitle: string;
  dueDate: string;
  dueTime: number;
  status: AssignmentCalendarStatus;
  actionLabel: string;
  href: string;
  submittedAt: string | null;
};

type CalendarQuizItem = {
  id: string;
  courseId: string;
  title: string;
  courseTitle: string;
  attemptsUsed: number;
  attemptsRemaining: number;
  passingScore: number;
  actionLabel: string;
  href: string;
  urgency: 'info' | 'warning';
};

type CalendarMilestoneItem = {
  id: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  courseTitle: string;
  actionType: string;
  createdAt: string;
  actionLabel: string;
  href: string;
};

type CalendarDayEvent = {
  id: string;
  date: string;
  sortTime: number;
  type: 'assignment' | 'milestone';
  title: string;
  courseTitle: string;
  description: string;
  badgeLabel: string;
  badgeClassName: string;
  actionLabel: string;
  href: string;
};

type FocusItem = {
  id: string;
  bucket: CalendarFocusBucket;
  type: 'assignment' | 'quiz' | 'lesson';
  title: string;
  courseTitle: string;
  timing: string;
  badgeLabel: string;
  badgeClassName: string;
  actionLabel: string;
  href: string;
};

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function isSameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(typeof value === 'string' ? new Date(value) : value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatWeekday(value: Date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(value);
}

function formatRelativeDue(value: string) {
  const due = new Date(value);
  const now = new Date();
  const dueStart = startOfDay(due).getTime();
  const today = startOfDay(now).getTime();
  const diffDays = Math.round((dueStart - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
  }

  if (diffDays === 0) {
    return `Due today · ${formatTime(value)}`;
  }

  if (diffDays === 1) {
    return `Due tomorrow · ${formatTime(value)}`;
  }

  if (diffDays <= 7) {
    return `Due in ${diffDays} days`;
  }

  return `${formatDate(value)} · ${formatTime(value)}`;
}

function getAssignmentStatus(assignment: StudentAssignmentListItem): AssignmentCalendarStatus {
  const latestSubmission =
    [...(assignment.submissions ?? [])].sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    })[0] ?? null;

  if (latestSubmission?.grade != null || latestSubmission?.status === 'GRADED' || latestSubmission?.status === 'RETURNED') {
    return 'GRADED';
  }

  if (latestSubmission) {
    return 'SUBMITTED';
  }

  if (!assignment.dueDate) {
    return 'UPCOMING';
  }

  const diffDays = Math.round((startOfDay(new Date(assignment.dueDate)).getTime() - startOfDay(new Date()).getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'OVERDUE';
  }

  if (diffDays === 0) {
    return 'DUE_TODAY';
  }

  if (diffDays <= 7) {
    return 'DUE_SOON';
  }

  return 'UPCOMING';
}

function getAssignmentBadgeClass(status: AssignmentCalendarStatus) {
  switch (status) {
    case 'OVERDUE':
      return 'client-badge client-badge-danger';
    case 'DUE_TODAY':
    case 'DUE_SOON':
      return 'client-badge client-badge-warning';
    case 'SUBMITTED':
      return 'client-badge client-badge-info';
    case 'GRADED':
      return 'client-badge client-badge-success';
    case 'UPCOMING':
    default:
      return 'client-badge client-badge-info';
  }
}

function getAssignmentBadgeLabel(status: AssignmentCalendarStatus) {
  switch (status) {
    case 'DUE_TODAY':
      return 'Due Today';
    case 'DUE_SOON':
      return 'Due Soon';
    case 'SUBMITTED':
      return 'Submitted';
    case 'GRADED':
      return 'Graded';
    case 'OVERDUE':
      return 'Overdue';
    case 'UPCOMING':
    default:
      return 'Upcoming';
  }
}

function getAssignmentActionLabel(status: AssignmentCalendarStatus) {
  switch (status) {
    case 'GRADED':
      return 'View Details';
    case 'SUBMITTED':
      return 'Review';
    default:
      return 'Submit Assignment';
  }
}

function getMonthMatrix(baseDate: Date) {
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return day;
  });
}

export function StudentCalendarPage() {
  const navigate = useNavigate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const overviewQuery = useQuery({
    queryKey: ['calendar-workspace', 'overview'],
    queryFn: progressService.getOverview,
    staleTime: 60_000,
    retry: 1,
  });

  const historyQuery = useQuery({
    queryKey: ['calendar-workspace', 'history'],
    queryFn: () => progressService.getMyProgressHistory({ page: 1, pageSize: 12 }),
    staleTime: 60_000,
    retry: 1,
  });

  const courses = overviewQuery.data?.courses.filter((course) => course.enrollmentStatus !== 'DROPPED') ?? [];
  const activeCourses = courses.filter((course) => course.enrollmentStatus === 'ACTIVE');

  const courseDetailQueries = useQueries({
    queries: activeCourses.map((course) => ({
      queryKey: ['calendar-workspace', 'course-progress', course.courseId],
      queryFn: () => progressService.getMyCourseProgress(course.courseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const assignmentQueries = useQueries({
    queries: courses.map((course) => ({
      queryKey: ['calendar-workspace', 'assignments', course.courseId],
      queryFn: () => listStudentCourseAssignmentsRequest(course.courseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const quizQueries = useQueries({
    queries: courses.map((course) => ({
      queryKey: ['calendar-workspace', 'quizzes', course.courseId],
      queryFn: () => listStudentCourseQuizzesRequest(course.courseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const overallLoading =
    overviewQuery.isLoading ||
    historyQuery.isLoading ||
    assignmentQueries.some((query) => query.isLoading) ||
    quizQueries.some((query) => query.isLoading) ||
    courseDetailQueries.some((query) => query.isLoading);

  const assignmentsError = assignmentQueries.find((query) => query.error)?.error;
  const quizzesError = quizQueries.find((query) => query.error)?.error;
  const courseDetailError = courseDetailQueries.find((query) => query.error)?.error;
  const pageError = overviewQuery.error || historyQuery.error;

  const activeCourseDetails = useMemo(
    () =>
      activeCourses.map((course, index) => ({
        course,
        detail: courseDetailQueries[index]?.data ?? null,
      })),
    [activeCourses, courseDetailQueries],
  );

  const continueTarget = useMemo(() => {
    const sorted = [...activeCourseDetails].sort((a, b) => {
      const aTime = a.detail?.lastProgressAt ? new Date(a.detail.lastProgressAt).getTime() : 0;
      const bTime = b.detail?.lastProgressAt ? new Date(b.detail.lastProgressAt).getTime() : 0;
      return bTime - aTime;
    });
    const current = sorted.find((entry) => entry.detail) ?? null;
    const nextLesson = current?.detail?.lessons.find((lesson) => !lesson.isCompleted) ?? null;

    if (current && nextLesson) {
      return {
        label: 'Continue Learning',
        href: `/courses/${current.course.courseId}/learn/${nextLesson.lessonId}`,
        courseTitle: current.course.courseTitle,
        note: nextLesson.title,
      };
    }

    if (current) {
      return {
        label: 'View Course',
        href: `/courses/${current.course.courseId}`,
        courseTitle: current.course.courseTitle,
        note: 'Course workspace',
      };
    }

    return {
      label: 'Browse Courses',
      href: '/courses',
      courseTitle: 'No active course',
      note: 'Explore the catalog',
    };
  }, [activeCourseDetails]);

  const assignments = useMemo<CalendarAssignmentItem[]>(() => {
    return courses.flatMap((course, index) =>
      (assignmentQueries[index]?.data ?? [])
        .filter((assignment) => assignment.dueDate)
        .map((assignment) => {
          const status = getAssignmentStatus(assignment);
          return {
            id: assignment.id,
            courseId: course.courseId,
            title: assignment.title,
            courseTitle: course.courseTitle,
            dueDate: assignment.dueDate!,
            dueTime: new Date(assignment.dueDate!).getTime(),
            status,
            actionLabel: getAssignmentActionLabel(status),
            href: `/courses/${course.courseId}/assignments/${assignment.id}`,
            submittedAt:
              [...(assignment.submissions ?? [])].sort((a, b) => {
                const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
                const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
                return bTime - aTime;
              })[0]?.submittedAt ?? null,
          };
        }),
    );
  }, [assignmentQueries, courses]);

  const availableQuizzes = useMemo<CalendarQuizItem[]>(() => {
    return courses.flatMap((course, index) =>
      (quizQueries[index]?.data ?? []).map((quiz) => ({
        id: quiz.id,
        courseId: course.courseId,
        title: quiz.title,
        courseTitle: course.courseTitle,
        attemptsUsed: quiz.attemptsUsed,
        attemptsRemaining: quiz.attemptsRemaining,
        passingScore: quiz.passingScore,
        actionLabel: quiz.attemptsRemaining > 0 ? 'Start Quiz' : 'View Details',
        href: `/courses/${course.courseId}/quizzes/${quiz.id}`,
        urgency: quiz.attemptsRemaining > 0 ? 'info' : 'warning',
      })),
    );
  }, [courses, quizQueries]);

  const milestones = useMemo<CalendarMilestoneItem[]>(() => {
    return (historyQuery.data?.items ?? [])
      .filter((item) => item.createdAt)
      .map((item: ProgressHistoryItem) => ({
        id: item.id,
        courseId: item.courseId,
        lessonId: item.lessonId,
        title: item.lessonTitle || item.courseTitle,
        courseTitle: item.courseTitle,
        actionType: item.actionType,
        createdAt: item.createdAt,
        actionLabel: item.lessonId ? 'Continue Learning' : 'View Course',
        href: item.lessonId ? `/courses/${item.courseId}/learn/${item.lessonId}` : `/courses/${item.courseId}`,
      }));
  }, [historyQuery.data?.items]);

  const datedEvents = useMemo<CalendarDayEvent[]>(() => {
    const assignmentEvents = assignments.map((assignment) => ({
      id: `assignment-${assignment.id}`,
      date: assignment.dueDate,
      sortTime: assignment.dueTime,
      type: 'assignment' as const,
      title: assignment.title,
      courseTitle: assignment.courseTitle,
      description: formatRelativeDue(assignment.dueDate),
      badgeLabel: getAssignmentBadgeLabel(assignment.status),
      badgeClassName: getAssignmentBadgeClass(assignment.status),
      actionLabel: assignment.actionLabel,
      href: assignment.href,
    }));

    const milestoneEvents = milestones.map((milestone) => ({
      id: `milestone-${milestone.id}`,
      date: milestone.createdAt,
      sortTime: new Date(milestone.createdAt).getTime(),
      type: 'milestone' as const,
      title: milestone.title,
      courseTitle: milestone.courseTitle,
      description: milestone.actionType.replaceAll('_', ' '),
      badgeLabel: 'Milestone',
      badgeClassName: 'client-badge client-badge-info',
      actionLabel: milestone.actionLabel,
      href: milestone.href,
    }));

    return [...assignmentEvents, ...milestoneEvents].sort((a, b) => a.sortTime - b.sortTime);
  }, [assignments, milestones]);

  const selectedDayEvents = useMemo(
    () => datedEvents.filter((event) => isSameDay(new Date(event.date), selectedDate)),
    [datedEvents, selectedDate],
  );

  const monthMatrix = useMemo(() => getMonthMatrix(selectedDate), [selectedDate]);

  const deadlinesThisWeek = assignments.filter((assignment) => {
    const diff = Math.round((startOfDay(new Date(assignment.dueDate)).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 6 && assignment.status !== 'GRADED';
  });
  const overdueAssignments = assignments.filter((assignment) => assignment.status === 'OVERDUE');
  const dueTodayAssignments = assignments.filter((assignment) => assignment.status === 'DUE_TODAY');
  const pendingAssignments = assignments.filter((assignment) => assignment.status === 'DUE_SOON' || assignment.status === 'UPCOMING');

  const firstAssignmentsCourseId = useMemo(
    () => courses.find((_, index) => (assignmentQueries[index]?.data ?? []).length > 0)?.courseId ?? null,
    [assignmentQueries, courses],
  );

  const firstQuizzesCourseId = useMemo(
    () => courses.find((_, index) => (quizQueries[index]?.data ?? []).length > 0)?.courseId ?? null,
    [courses, quizQueries],
  );

  const heroSecondaryAction = useMemo(
    () =>
      firstAssignmentsCourseId
        ? {
            label: 'View Assignments',
            href: `/courses/${firstAssignmentsCourseId}/assignments`,
          }
        : firstQuizzesCourseId
          ? {
              label: 'View Quizzes',
              href: `/courses/${firstQuizzesCourseId}/quizzes`,
            }
          : {
              label: 'Browse Courses',
              href: '/courses',
            },
    [firstAssignmentsCourseId, firstQuizzesCourseId],
  );

  const focusItems = useMemo<FocusItem[]>(() => {
    const items: FocusItem[] = [];

    assignments
      .filter((assignment) => ['OVERDUE', 'DUE_TODAY', 'DUE_SOON', 'UPCOMING'].includes(assignment.status))
      .sort((a, b) => a.dueTime - b.dueTime)
      .forEach((assignment) => {
        const due = startOfDay(new Date(assignment.dueDate));
        const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let bucket: CalendarFocusBucket | null = null;
        if (diffDays <= 0) bucket = 'today';
        else if (diffDays === 1) bucket = 'tomorrow';
        else if (diffDays <= 6) bucket = 'this-week';
        if (!bucket) return;

        items.push({
          id: `assignment-focus-${assignment.id}`,
          bucket,
          type: 'assignment',
          title: assignment.title,
          courseTitle: assignment.courseTitle,
          timing: formatRelativeDue(assignment.dueDate),
          badgeLabel: getAssignmentBadgeLabel(assignment.status),
          badgeClassName: getAssignmentBadgeClass(assignment.status),
          actionLabel: assignment.actionLabel,
          href: assignment.href,
        });
      });

    availableQuizzes
      .filter((quiz) => quiz.attemptsRemaining > 0)
      .slice(0, 2)
      .forEach((quiz) => {
        items.push({
          id: `quiz-focus-${quiz.id}`,
          bucket: 'today',
          type: 'quiz',
          title: quiz.title,
          courseTitle: quiz.courseTitle,
          timing: `Available now · ${quiz.attemptsRemaining} attempt${quiz.attemptsRemaining === 1 ? '' : 's'} left`,
          badgeLabel: 'Available',
          badgeClassName: 'client-badge client-badge-info',
          actionLabel: quiz.actionLabel,
          href: quiz.href,
        });
      });

    if (continueTarget.href !== '/courses') {
      items.push({
        id: 'lesson-focus-current',
        bucket: 'today',
        type: 'lesson',
        title: continueTarget.note,
        courseTitle: continueTarget.courseTitle,
        timing: 'Continue your current path',
        badgeLabel: 'Continue',
        badgeClassName: 'client-badge client-badge-info',
        actionLabel: continueTarget.label,
        href: continueTarget.href,
      });
    }

    return items;
  }, [assignments, availableQuizzes, continueTarget, today]);

  const focusBuckets: Record<CalendarFocusBucket, FocusItem[]> = {
    today: focusItems.filter((item) => item.bucket === 'today').slice(0, 4),
    tomorrow: focusItems.filter((item) => item.bucket === 'tomorrow').slice(0, 3),
    'this-week': focusItems.filter((item) => item.bucket === 'this-week').slice(0, 4),
  };

  const groupedTimeline = useMemo(() => {
    const groups = {
      overdue: [] as CalendarAssignmentItem[],
      today: [] as CalendarAssignmentItem[],
      tomorrow: [] as CalendarAssignmentItem[],
      'this-week': [] as CalendarAssignmentItem[],
      later: [] as CalendarAssignmentItem[],
    };

    assignments
      .filter((assignment) => assignment.status !== 'GRADED')
      .sort((a, b) => a.dueTime - b.dueTime)
      .forEach((assignment) => {
        const diffDays = Math.round((startOfDay(new Date(assignment.dueDate)).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) groups.overdue.push(assignment);
        else if (diffDays === 0) groups.today.push(assignment);
        else if (diffDays === 1) groups.tomorrow.push(assignment);
        else if (diffDays <= 6) groups['this-week'].push(assignment);
        else groups.later.push(assignment);
      });

    return groups;
  }, [assignments, today]);

  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      issue: string;
      title: string;
      courseTitle: string;
      badgeClassName: string;
      actionLabel: string;
      href: string;
    }> = [];

    overdueAssignments.slice(0, 3).forEach((assignment) => {
      items.push({
        id: `attention-overdue-${assignment.id}`,
        issue: 'Overdue',
        title: assignment.title,
        courseTitle: assignment.courseTitle,
        badgeClassName: 'client-badge client-badge-danger',
        actionLabel: 'Submit',
        href: assignment.href,
      });
    });

    dueTodayAssignments.slice(0, 2).forEach((assignment) => {
      items.push({
        id: `attention-today-${assignment.id}`,
        issue: 'Due Today',
        title: assignment.title,
        courseTitle: assignment.courseTitle,
        badgeClassName: 'client-badge client-badge-warning',
        actionLabel: 'Submit',
        href: assignment.href,
      });
    });

    availableQuizzes
      .filter((quiz) => quiz.attemptsRemaining > 0)
      .slice(0, 2)
      .forEach((quiz) => {
        items.push({
          id: `attention-quiz-${quiz.id}`,
          issue: 'Quiz Available',
          title: quiz.title,
          courseTitle: quiz.courseTitle,
          badgeClassName: 'client-badge client-badge-info',
          actionLabel: 'Start Quiz',
          href: quiz.href,
        });
      });

    availableQuizzes
      .filter((quiz) => quiz.attemptsRemaining <= 0)
      .slice(0, 1)
      .forEach((quiz) => {
        items.push({
          id: `attention-quiz-exhausted-${quiz.id}`,
          issue: 'No Attempts Left',
          title: quiz.title,
          courseTitle: quiz.courseTitle,
          badgeClassName: 'client-badge client-badge-warning',
          actionLabel: 'View Details',
          href: quiz.href,
        });
      });

    activeCourseDetails
      .filter((entry) => entry.course.weightedPercentage < 25)
      .slice(0, 1)
      .forEach((entry) => {
        const lesson = entry.detail?.lessons.find((item) => !item.isCompleted);
        items.push({
          id: `attention-course-${entry.course.courseId}`,
          issue: 'Low Progress',
          title: entry.course.courseTitle,
          courseTitle: entry.course.instructorName || 'Instructor unavailable',
          badgeClassName: 'client-badge client-badge-warning',
          actionLabel: lesson ? 'Continue' : 'View Course',
          href: lesson ? `/courses/${entry.course.courseId}/learn/${lesson.lessonId}` : `/courses/${entry.course.courseId}`,
        });
      });

    return items.slice(0, 6);
  }, [activeCourseDetails, availableQuizzes, dueTodayAssignments, overdueAssignments]);

  const quickActions = [
    {
      label: continueTarget.label,
      href: continueTarget.href,
      primary: true,
    },
    {
      label: 'View Assignments',
      href: firstAssignmentsCourseId ? `/courses/${firstAssignmentsCourseId}/assignments` : '/courses',
      primary: false,
    },
    {
      label: 'View Quizzes',
      href: firstQuizzesCourseId ? `/courses/${firstQuizzesCourseId}/quizzes` : '/courses',
      primary: false,
    },
    {
      label: 'Open Progress Center',
      href: '/progress',
      primary: false,
    },
    {
      label: 'Browse Courses',
      href: '/courses',
      primary: false,
    },
  ];

  const mobileAgenda = datedEvents.slice(0, 6);
  const currentMonthLabel = formatMonthLabel(selectedDate);

  function selectPreviousMonth() {
    setSelectedDate((current) => startOfDay(new Date(current.getFullYear(), current.getMonth() - 1, 1)));
  }

  function selectNextMonth() {
    setSelectedDate((current) => startOfDay(new Date(current.getFullYear(), current.getMonth() + 1, 1)));
  }

  function selectToday() {
    setSelectedDate(today);
  }

  if (overallLoading) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Learning Calendar" subtitle="Plan assignments, quizzes, and current learning tasks in one academic workspace.">
          <div className="calendar-workspace calendar-workspace--loading">
            <section className="client-card calendar-workspace__hero calendar-workspace__skeleton-shell">
              <div className="calendar-workspace__skeleton-line calendar-workspace__skeleton-line--short" />
              <div className="calendar-workspace__skeleton-line calendar-workspace__skeleton-line--title" />
              <div className="calendar-workspace__skeleton-block" />
            </section>
            <div className="calendar-workspace__layout">
              <div className="calendar-workspace__main">
                <section className="client-card calendar-workspace__panel calendar-workspace__skeleton-shell">
                  <div className="calendar-workspace__skeleton-block calendar-workspace__skeleton-block--tall" />
                </section>
              </div>
              <aside className="calendar-workspace__aside">
                <section className="client-card calendar-workspace__panel calendar-workspace__skeleton-shell">
                  <div className="calendar-workspace__skeleton-block calendar-workspace__skeleton-block--tall" />
                </section>
              </aside>
            </div>
          </div>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (pageError) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Learning Calendar" subtitle="Plan assignments, quizzes, and current learning tasks in one academic workspace.">
          <section className="client-card calendar-workspace__state-card">
            <EmptyState
              title="Unable to load calendar"
              description="We could not load the learning planning workspace right now."
              action={
                <Button className="client-button client-button-primary" onClick={() => {
                  overviewQuery.refetch();
                  historyQuery.refetch();
                }}>
                  Try Again
                </Button>
              }
            />
          </section>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (!courses.length) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Learning Calendar" subtitle="Plan assignments, quizzes, and current learning tasks in one academic workspace.">
          <section className="client-card calendar-workspace__state-card">
            <EmptyState
              title="No upcoming events"
              description="Your learning schedule is clear right now. Use this time to catch up on readings or explore new courses."
              action={
                <Button className="client-button client-button-primary" onClick={() => navigate('/courses')}>
                  Browse Courses
                </Button>
              }
            />
          </section>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <ClientPageContainer title="Learning Calendar" subtitle="Plan assignments, quizzes, and current learning tasks in one academic workspace.">
        <div className="calendar-workspace">
          <section className="client-card calendar-workspace__hero">
            <div className="calendar-workspace__hero-copy">
              <Typography.Text className="client-caption">Academic planning workspace</Typography.Text>
              <Typography.Title level={1} className="client-page-title">
                Learning Calendar
              </Typography.Title>
              <Typography.Paragraph className="client-body">
                Focus on what needs action today, what is due this week, and which course path should continue next.
              </Typography.Paragraph>
                <div className="calendar-workspace__hero-actions">
                  <Button className="client-button client-button-primary" onClick={() => navigate(continueTarget.href)}>
                    {continueTarget.label}
                  </Button>
                  <Button className="client-button client-button-secondary" onClick={() => navigate(heroSecondaryAction.href)}>
                    {heroSecondaryAction.label}
                  </Button>
                </div>
            </div>
            <div className="calendar-workspace__hero-metrics">
              <div className="client-card calendar-workspace__metric-card">
                <Typography.Text className="client-meta">Deadlines This Week</Typography.Text>
                <strong>{deadlinesThisWeek.length}</strong>
              </div>
              <div className="client-card calendar-workspace__metric-card">
                <Typography.Text className="client-meta">Assignments Due</Typography.Text>
                <strong>{pendingAssignments.length + dueTodayAssignments.length + overdueAssignments.length}</strong>
              </div>
              <div className="client-card calendar-workspace__metric-card">
                <Typography.Text className="client-meta">Quizzes Available</Typography.Text>
                <strong>{availableQuizzes.filter((quiz) => quiz.attemptsRemaining > 0).length}</strong>
              </div>
              <div className="client-card calendar-workspace__metric-card">
                <Typography.Text className="client-meta">Overdue Items</Typography.Text>
                <strong>{overdueAssignments.length}</strong>
              </div>
            </div>
          </section>

          <div className="calendar-workspace__layout">
            <div className="calendar-workspace__main">
              <section className="client-card calendar-workspace__panel">
                <div className="calendar-workspace__panel-header">
                  <div className="calendar-workspace__panel-copy">
                    <Typography.Text className="client-caption">Action queue</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      Today / This Week Focus
                    </Typography.Title>
                  </div>
                </div>
                <div className="calendar-workspace__focus-grid">
                  {(['today', 'tomorrow', 'this-week'] as CalendarFocusBucket[]).map((bucket) => (
                    <div key={bucket} className="calendar-workspace__focus-column">
                      <div className="calendar-workspace__focus-heading">
                        <Typography.Text className="client-card-title">
                          {bucket === 'today' ? 'Today' : bucket === 'tomorrow' ? 'Tomorrow' : 'This Week'}
                        </Typography.Text>
                      </div>
                      {focusBuckets[bucket].length ? (
                        <div className="calendar-workspace__focus-list">
                          {focusBuckets[bucket].map((item) => (
                            <article key={item.id} className="calendar-workspace__focus-item">
                              <div className="calendar-workspace__focus-copy">
                                <div className="calendar-workspace__focus-title-row">
                                  <Typography.Text className="client-card-title">{item.title}</Typography.Text>
                                  <span className={item.badgeClassName}>{item.badgeLabel}</span>
                                </div>
                                <Typography.Text className="client-meta">{item.courseTitle}</Typography.Text>
                                <Typography.Text className="client-meta">{item.timing}</Typography.Text>
                              </div>
                              <Button
                                className={
                                  item.actionLabel === 'Submit Assignment' || item.actionLabel === 'Start Quiz' || item.actionLabel === 'Continue Learning'
                                    ? 'client-button client-button-primary'
                                    : 'client-button client-button-secondary'
                                }
                                onClick={() => navigate(item.href)}
                              >
                                {item.actionLabel}
                              </Button>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <EmptyState title="No urgent items" description="Nothing in this planning window." compact />
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="client-card calendar-workspace__panel">
                <div className="calendar-workspace__panel-header">
                  <div className="calendar-workspace__panel-copy">
                    <Typography.Text className="client-caption">Month view</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      {currentMonthLabel}
                    </Typography.Title>
                  </div>
                  <div className="calendar-workspace__month-controls">
                    <Button className="client-button client-button-ghost" onClick={selectPreviousMonth}>
                      Previous
                    </Button>
                    <Button className="client-button client-button-ghost" onClick={selectToday}>
                      Today
                    </Button>
                    <Button className="client-button client-button-ghost" onClick={selectNextMonth}>
                      Next
                    </Button>
                  </div>
                  <div className="calendar-workspace__month-legend">
                    <span className="calendar-workspace__legend-item"><span className="calendar-workspace__legend-dot calendar-workspace__legend-dot--assignment" />Assignments</span>
                    <span className="calendar-workspace__legend-item"><span className="calendar-workspace__legend-dot calendar-workspace__legend-dot--milestone" />Milestones</span>
                  </div>
                </div>

                <div className="calendar-workspace__month-grid" role="grid" aria-label="Monthly learning calendar">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="calendar-workspace__month-label">{day}</div>
                  ))}
                  {monthMatrix.map((day) => {
                    const dayEvents = datedEvents.filter((event) => isSameDay(new Date(event.date), day));
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, today);
                    const isOutside = day.getMonth() !== selectedDate.getMonth();

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        className={`calendar-workspace__day-cell${isSelected ? ' calendar-workspace__day-cell--selected' : ''}${isToday ? ' calendar-workspace__day-cell--today' : ''}${isOutside ? ' calendar-workspace__day-cell--outside' : ''}`}
                        onClick={() => setSelectedDate(startOfDay(day))}
                      >
                        <span className="calendar-workspace__day-number">{day.getDate()}</span>
                        <div className="calendar-workspace__day-events">
                          {dayEvents.slice(0, 2).map((event) => (
                            <span
                              key={event.id}
                              className={`calendar-workspace__day-pill${event.type === 'assignment' ? ' calendar-workspace__day-pill--assignment' : ' calendar-workspace__day-pill--milestone'}`}
                            >
                              {event.title}
                            </span>
                          ))}
                          {dayEvents.length > 2 ? <span className="calendar-workspace__day-more">+{dayEvents.length - 2} more</span> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="calendar-workspace__mobile-agenda">
                  {mobileAgenda.length ? (
                    mobileAgenda.map((event) => (
                      <article key={event.id} className="calendar-workspace__agenda-item">
                        <div className="calendar-workspace__agenda-date">
                          <strong>{formatWeekday(new Date(event.date))}</strong>
                          <span>{new Date(event.date).getDate()}</span>
                        </div>
                        <div className="calendar-workspace__agenda-copy">
                          <Typography.Text className="client-card-title">{event.title}</Typography.Text>
                          <Typography.Text className="client-meta">{event.courseTitle}</Typography.Text>
                          <Typography.Text className="client-meta">{event.description}</Typography.Text>
                        </div>
                        <Button className="client-button client-button-secondary" onClick={() => navigate(event.href)}>
                          {event.actionLabel}
                        </Button>
                      </article>
                    ))
                  ) : (
                    <EmptyState title="No dated events" description="No assignment deadlines or milestones are scheduled in this month." compact />
                  )}
                </div>
              </section>

              <section className="client-card calendar-workspace__panel">
                <div className="calendar-workspace__panel-header">
                  <div className="calendar-workspace__panel-copy">
                    <Typography.Text className="client-caption">Deadline order</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      Deadline Timeline
                    </Typography.Title>
                  </div>
                </div>
                {assignments.length ? (
                  <div className="calendar-workspace__timeline">
                    {([
                      ['overdue', 'Overdue'],
                      ['today', 'Today'],
                      ['tomorrow', 'Tomorrow'],
                      ['this-week', 'This Week'],
                      ['later', 'Later'],
                    ] as const).map(([key, label]) =>
                      groupedTimeline[key].length ? (
                        <div key={key} className="calendar-workspace__timeline-group">
                          <div className="calendar-workspace__timeline-heading">{label}</div>
                          <div className="calendar-workspace__timeline-list">
                            {groupedTimeline[key].map((item) => (
                              <article key={item.id} className="calendar-workspace__timeline-item">
                                <div className="calendar-workspace__timeline-copy">
                                  <div className="calendar-workspace__timeline-title-row">
                                    <Typography.Text className="client-card-title">{item.title}</Typography.Text>
                                    <span className={getAssignmentBadgeClass(item.status)}>{getAssignmentBadgeLabel(item.status)}</span>
                                  </div>
                                  <Typography.Text className="client-meta">{item.courseTitle}</Typography.Text>
                                  <Typography.Text className="client-meta">{formatRelativeDue(item.dueDate)}</Typography.Text>
                                </div>
                                <Button
                                  className={item.status === 'OVERDUE' || item.status === 'DUE_TODAY' ? 'client-button client-button-primary' : 'client-button client-button-secondary'}
                                  onClick={() => navigate(item.href)}
                                >
                                  {item.actionLabel}
                                </Button>
                              </article>
                            ))}
                          </div>
                        </div>
                      ) : null,
                    )}
                  </div>
                ) : (
                  <EmptyState title="No deadlines" description="There are no assignment deadlines to organize right now." compact />
                )}
              </section>
            </div>

            <aside className="calendar-workspace__aside">
              <section className="client-card calendar-workspace__panel">
                <div className="calendar-workspace__panel-header">
                  <div className="calendar-workspace__panel-copy">
                    <Typography.Text className="client-caption">Selected day</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      {formatDate(selectedDate)}
                    </Typography.Title>
                  </div>
                </div>
                {selectedDayEvents.length ? (
                  <div className="calendar-workspace__detail-list">
                    {selectedDayEvents.map((event) => (
                      <article key={event.id} className="calendar-workspace__detail-item">
                        <div className="calendar-workspace__detail-copy">
                          <span className={event.badgeClassName}>{event.badgeLabel}</span>
                          <Typography.Text className="client-card-title">{event.title}</Typography.Text>
                          <Typography.Text className="client-meta">{event.courseTitle}</Typography.Text>
                          <Typography.Text className="client-meta">{event.description}</Typography.Text>
                        </div>
                        <Button
                          className={event.actionLabel === 'Submit Assignment' || event.actionLabel === 'Continue Learning' ? 'client-button client-button-primary' : 'client-button client-button-secondary'}
                          onClick={() => navigate(event.href)}
                        >
                          {event.actionLabel}
                        </Button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No scheduled items" description="No dated assignments or milestones are attached to this day." compact />
                )}
              </section>

              <section className="client-card calendar-workspace__panel calendar-workspace__panel--attention">
                <div className="calendar-workspace__panel-header">
                  <div className="calendar-workspace__panel-copy">
                    <Typography.Text className="client-caption">Needs attention</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      Needs Attention
                    </Typography.Title>
                  </div>
                </div>
                {attentionItems.length ? (
                  <div className="calendar-workspace__attention-list">
                    {attentionItems.map((item) => (
                      <article key={item.id} className="calendar-workspace__attention-item">
                        <div className="calendar-workspace__attention-copy">
                          <span className={item.badgeClassName}>{item.issue}</span>
                          <Typography.Text className="client-card-title">{item.title}</Typography.Text>
                          <Typography.Text className="client-meta">{item.courseTitle}</Typography.Text>
                        </div>
                        <Button
                          className={item.badgeClassName.includes('danger') ? 'client-button client-button-primary' : 'client-button client-button-secondary'}
                          onClick={() => navigate(item.href)}
                        >
                          {item.actionLabel}
                        </Button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="All caught up" description="No urgent assignments, quizzes, or low-progress courses need action right now." compact />
                )}
              </section>

              <section className="client-card calendar-workspace__panel">
                <div className="calendar-workspace__panel-header">
                  <div className="calendar-workspace__panel-copy">
                    <Typography.Text className="client-caption">Quick actions</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      Quick Actions
                    </Typography.Title>
                  </div>
                </div>
                <div className="calendar-workspace__quick-actions">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      className={action.primary ? 'client-button client-button-primary' : 'client-button client-button-secondary'}
                      onClick={() => navigate(action.href)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
                {quizzesError || assignmentsError || courseDetailError ? (
                  <div className="calendar-workspace__partial-note">
                    <Typography.Text className="client-meta">
                      Some calendar support data is unavailable right now. Existing deadlines and routes remain visible.
                    </Typography.Text>
                  </div>
                ) : null}
              </section>
            </aside>
          </div>
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}

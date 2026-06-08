import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ClipboardList, Clock3, FileQuestion, Filter, SearchX, TimerReset } from 'lucide-react';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import {
  listStudentCourseAssignmentsRequest,
  type AssignmentSubmissionRecord,
  type StudentAssignmentListItem,
} from '../../../services/api/assignmentApi';
import {
  listMyQuizAttemptsRequest,
  listStudentCourseQuizzesRequest,
  type StudentQuizAttempt,
  type StudentQuizCourseItem,
} from '../../../services/api/quizApi';
import { progressService } from '../../../services/api/progressService';
import type { CourseProgressItem } from '../../../types/progress';
import './StudentCalendarPage.css';

type DeadlineType = 'assignment' | 'quiz';
type DeadlineStatus = 'PENDING' | 'SUBMITTED' | 'GRADED' | 'COMPLETED' | 'OVERDUE' | 'NOT_AVAILABLE';
type DeadlineWindow = 'today' | 'week' | 'upcoming' | 'no-date';
type TypeFilter = 'all' | 'assignment' | 'quiz';
type StatusFilter = 'all' | 'pending' | 'overdue' | 'completed';

type CalendarDeadline = {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  type: DeadlineType;
  dueDate: string | null;
  dueTime: number | null;
  status: DeadlineStatus;
  actionLabel: string;
  href: string;
  detail: string;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const typeFilters: Array<{ key: TypeFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'assignment', label: 'Assignments' },
  { key: 'quiz', label: 'Quizzes' },
];

const statusFilters: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: 'All statuses' },
  { key: 'pending', label: 'Pending' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'completed', label: 'Completed/Submitted' },
];

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getDayKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function dayDifference(value: string, baseDate: Date) {
  return Math.floor((startOfDay(new Date(value)).getTime() - startOfDay(baseDate).getTime()) / MS_PER_DAY);
}

function formatDateTime(value: string | null) {
  if (!value) return 'No due date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatMonth(value: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(value);
}

function getLatestSubmission(submissions: AssignmentSubmissionRecord[] = []) {
  return [...submissions].sort((left, right) => {
    const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : 0;
    const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : 0;
    return rightTime - leftTime;
  })[0] ?? null;
}

function getLatestQuizAttempt(attempts: StudentQuizAttempt[] = []) {
  return [...attempts].sort((left, right) => {
    const leftTime = left.submittedAt || left.updatedAt || left.createdAt || '';
    const rightTime = right.submittedAt || right.updatedAt || right.createdAt || '';
    return new Date(rightTime).getTime() - new Date(leftTime).getTime();
  })[0] ?? null;
}

function getAssignmentStatus(assignment: StudentAssignmentListItem, now: Date): DeadlineStatus {
  const latestSubmission = getLatestSubmission(assignment.submissions);

  if (latestSubmission?.grade != null || latestSubmission?.status === 'GRADED' || latestSubmission?.status === 'RETURNED') {
    return 'GRADED';
  }

  if (latestSubmission) {
    return 'SUBMITTED';
  }

  if (assignment.dueDate && new Date(assignment.dueDate).getTime() < now.getTime()) {
    return 'OVERDUE';
  }

  return 'PENDING';
}

function getQuizStatus(quiz: StudentQuizCourseItem, attempts: StudentQuizAttempt[]): DeadlineStatus {
  if (!quiz.isPublished) return 'NOT_AVAILABLE';

  const latestAttempt = getLatestQuizAttempt(attempts);
  if (latestAttempt?.score != null || latestAttempt?.isPassed != null || latestAttempt?.status === 'PASSED' || latestAttempt?.status === 'FAILED') {
    return 'COMPLETED';
  }

  if (quiz.attemptsRemaining <= 0 && quiz.attemptsUsed > 0) {
    return 'SUBMITTED';
  }

  return 'PENDING';
}

function getStatusLabel(status: DeadlineStatus) {
  switch (status) {
    case 'SUBMITTED':
      return 'Submitted';
    case 'GRADED':
      return 'Graded';
    case 'COMPLETED':
      return 'Completed';
    case 'OVERDUE':
      return 'Overdue';
    case 'NOT_AVAILABLE':
      return 'Not available';
    case 'PENDING':
    default:
      return 'Pending';
  }
}

function getStatusClass(status: DeadlineStatus) {
  switch (status) {
    case 'OVERDUE':
      return 'client-badge client-badge-danger';
    case 'SUBMITTED':
      return 'client-badge client-badge-info';
    case 'GRADED':
    case 'COMPLETED':
      return 'client-badge client-badge-success';
    case 'NOT_AVAILABLE':
      return 'client-badge';
    case 'PENDING':
    default:
      return 'client-badge client-badge-warning';
  }
}

function getWindow(deadline: CalendarDeadline, now: Date): DeadlineWindow {
  if (!deadline.dueDate) return 'no-date';

  const diff = dayDifference(deadline.dueDate, now);
  if (diff === 0) return 'today';
  if (diff > 0 && diff <= 6) return 'week';
  return 'upcoming';
}

function getRelativeDueCopy(deadline: CalendarDeadline, now: Date) {
  if (!deadline.dueDate) return 'No due date published';

  const diff = dayDifference(deadline.dueDate, now);
  if (deadline.status === 'OVERDUE') {
    const days = Math.abs(diff);
    return `Overdue by ${days || 1} day${days === 1 ? '' : 's'}`;
  }
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff > 1 && diff <= 6) return `Due in ${diff} days`;
  return `Due ${formatDateTime(deadline.dueDate)}`;
}

function buildAssignmentDeadline(assignment: StudentAssignmentListItem, course: CourseProgressItem, now: Date): CalendarDeadline {
  const status = getAssignmentStatus(assignment, now);
  const latestSubmission = getLatestSubmission(assignment.submissions);
  return {
    id: `assignment-${assignment.id}`,
    courseId: course.courseId,
    courseTitle: course.courseTitle,
    title: assignment.title,
    type: 'assignment',
    dueDate: assignment.dueDate ?? null,
    dueTime: assignment.dueDate ? new Date(assignment.dueDate).getTime() : null,
    status,
    actionLabel: status === 'GRADED' || status === 'SUBMITTED' ? 'View submission' : 'Open assignment',
    href: `/courses/${course.courseId}/assignments/${assignment.id}`,
    detail: latestSubmission?.submittedAt ? `Submitted ${formatDateTime(latestSubmission.submittedAt)}` : 'Assignment deadline',
  };
}

function buildQuizDeadline(
  quiz: StudentQuizCourseItem,
  course: CourseProgressItem,
  attempts: StudentQuizAttempt[],
): CalendarDeadline {
  const status = getQuizStatus(quiz, attempts);
  const latestAttempt = getLatestQuizAttempt(attempts);
  const resultHref = latestAttempt?.id ? `/courses/${course.courseId}/quizzes/${quiz.id}/results/${latestAttempt.id}` : `/courses/${course.courseId}/quizzes/${quiz.id}`;

  return {
    id: `quiz-${quiz.id}`,
    courseId: course.courseId,
    courseTitle: course.courseTitle,
    title: quiz.title,
    type: 'quiz',
    dueDate: null,
    dueTime: null,
    status,
    actionLabel: status === 'COMPLETED' || status === 'SUBMITTED' ? 'View result' : 'Open quiz',
    href: status === 'COMPLETED' || status === 'SUBMITTED' ? resultHref : `/courses/${course.courseId}/quizzes/${quiz.id}`,
    detail: `${quiz.attemptsRemaining} attempt${quiz.attemptsRemaining === 1 ? '' : 's'} remaining`,
  };
}

function getMonthDays(baseDate: Date) {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const daysInMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => new Date(start.getFullYear(), start.getMonth(), index + 1));
}

function DeadlineRow({ deadline, now }: { deadline: CalendarDeadline; now: Date }) {
  const Icon = deadline.type === 'assignment' ? ClipboardList : FileQuestion;

  return (
    <article className={`calendar-page__deadline-row calendar-page__deadline-row--${deadline.status.toLowerCase()}`}>
      <div className="calendar-page__deadline-icon" aria-hidden="true">
        <Icon size={18} />
      </div>
      <div className="calendar-page__deadline-copy">
        <div className="calendar-page__deadline-title-row">
          <Typography.Text className="client-card-title">{deadline.title}</Typography.Text>
          <span className={getStatusClass(deadline.status)}>{getStatusLabel(deadline.status)}</span>
        </div>
        <Typography.Text className="client-meta">{deadline.courseTitle}</Typography.Text>
        <Typography.Text className="client-meta">
          {deadline.type === 'assignment' ? 'Assignment' : 'Quiz'} - {formatDateTime(deadline.dueDate)} - {getRelativeDueCopy(deadline, now)}
        </Typography.Text>
        <Typography.Text className="client-meta">{deadline.detail}</Typography.Text>
      </div>
      <Link className="client-button client-button-secondary calendar-page__deadline-action" to={deadline.href}>
        {deadline.actionLabel}
      </Link>
    </article>
  );
}

function DeadlineSection({
  title,
  description,
  deadlines,
  now,
}: {
  title: string;
  description: string;
  deadlines: CalendarDeadline[];
  now: Date;
}) {
  return (
    <section className="client-card calendar-page__section">
      <div className="calendar-page__section-header">
        <div>
          <Typography.Title level={3} className="client-section-title">
            {title}
          </Typography.Title>
          <Typography.Text className="client-meta">{description}</Typography.Text>
        </div>
        <span className="calendar-page__section-count">{deadlines.length}</span>
      </div>
      {deadlines.length ? (
        <div className="calendar-page__deadline-list">
          {deadlines.map((deadline) => (
            <DeadlineRow key={deadline.id} deadline={deadline} now={now} />
          ))}
        </div>
      ) : (
        <EmptyState compact title={title === 'Upcoming' ? 'No upcoming deadlines.' : 'No deadlines in this group.'} description="Real due dates will appear here when instructors publish them." />
      )}
    </section>
  );
}

export function StudentCalendarPage() {
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [courseFilter, setCourseFilter] = useState('all');

  const overviewQuery = useQuery({
    queryKey: ['student-calendar', 'overview'],
    queryFn: progressService.getOverview,
    staleTime: 60_000,
    retry: 1,
  });

  const courses = useMemo(
    () => (overviewQuery.data?.courses ?? []).filter((course) => course.enrollmentStatus !== 'DROPPED'),
    [overviewQuery.data?.courses],
  );

  const assignmentQueries = useQueries({
    queries: courses.map((course) => ({
      queryKey: ['student-calendar', 'assignments', course.courseId],
      queryFn: () => listStudentCourseAssignmentsRequest(course.courseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const quizQueries = useQueries({
    queries: courses.map((course) => ({
      queryKey: ['student-calendar', 'quizzes', course.courseId],
      queryFn: () => listStudentCourseQuizzesRequest(course.courseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const quizRecords = useMemo(
    () =>
      courses.flatMap((course, courseIndex) =>
        (quizQueries[courseIndex]?.data ?? []).map((quiz) => ({
          course,
          quiz,
        })),
      ),
    [courses, quizQueries],
  );

  const quizAttemptQueries = useQueries({
    queries: quizRecords.map(({ quiz }) => ({
      queryKey: ['student-calendar', 'quiz-attempts', quiz.id],
      queryFn: () => listMyQuizAttemptsRequest(quiz.id),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const isLoading =
    overviewQuery.isLoading ||
    assignmentQueries.some((query) => query.isLoading) ||
    quizQueries.some((query) => query.isLoading) ||
    quizAttemptQueries.some((query) => query.isLoading);

  const pageError = overviewQuery.error;
  const supportError =
    assignmentQueries.find((query) => query.error)?.error ||
    quizQueries.find((query) => query.error)?.error ||
    quizAttemptQueries.find((query) => query.error)?.error;

  const deadlines = useMemo<CalendarDeadline[]>(() => {
    const assignmentDeadlines = courses.flatMap((course, courseIndex) =>
      (assignmentQueries[courseIndex]?.data ?? []).map((assignment) => buildAssignmentDeadline(assignment, course, now)),
    );

    const quizDeadlines = quizRecords.map(({ course, quiz }, index) => buildQuizDeadline(quiz, course, quizAttemptQueries[index]?.data ?? []));

    return [...assignmentDeadlines, ...quizDeadlines].sort((left, right) => {
      if (left.dueTime == null && right.dueTime == null) return left.title.localeCompare(right.title);
      if (left.dueTime == null) return 1;
      if (right.dueTime == null) return -1;
      return left.dueTime - right.dueTime;
    });
  }, [assignmentQueries, courses, now, quizAttemptQueries, quizRecords]);

  const filteredDeadlines = useMemo(() => {
    return deadlines.filter((deadline) => {
      const matchesType = typeFilter === 'all' || deadline.type === typeFilter;
      const matchesCourse = courseFilter === 'all' || deadline.courseId === courseFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && deadline.status === 'PENDING') ||
        (statusFilter === 'overdue' && deadline.status === 'OVERDUE') ||
        (statusFilter === 'completed' && ['SUBMITTED', 'GRADED', 'COMPLETED'].includes(deadline.status));

      return matchesType && matchesCourse && matchesStatus;
    });
  }, [courseFilter, deadlines, statusFilter, typeFilter]);

  const groupedDeadlines = useMemo(() => {
    return {
      today: filteredDeadlines.filter((deadline) => getWindow(deadline, now) === 'today'),
      week: filteredDeadlines.filter((deadline) => getWindow(deadline, now) === 'week'),
      upcoming: filteredDeadlines.filter((deadline) => getWindow(deadline, now) === 'upcoming'),
      noDate: filteredDeadlines.filter((deadline) => getWindow(deadline, now) === 'no-date'),
    };
  }, [filteredDeadlines, now]);

  const summary = useMemo(() => {
    const dated = deadlines.filter((deadline) => deadline.dueDate);
    return {
      dueToday: dated.filter((deadline) => getWindow(deadline, now) === 'today' && !['SUBMITTED', 'GRADED', 'COMPLETED'].includes(deadline.status)).length,
      dueThisWeek: dated.filter((deadline) => {
        const diff = deadline.dueDate ? dayDifference(deadline.dueDate, now) : 999;
        return diff >= 0 && diff <= 6 && !['SUBMITTED', 'GRADED', 'COMPLETED'].includes(deadline.status);
      }).length,
      overdue: dated.filter((deadline) => deadline.status === 'OVERDUE').length,
      completed: deadlines.filter((deadline) => ['SUBMITTED', 'GRADED', 'COMPLETED'].includes(deadline.status)).length,
    };
  }, [deadlines, now]);

  const monthDays = useMemo(() => getMonthDays(now), [now]);
  const datedDeadlineCounts = useMemo(() => {
    const counts = new Map<string, number>();
    deadlines.forEach((deadline) => {
      if (!deadline.dueDate) return;
      const key = getDayKey(new Date(deadline.dueDate));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [deadlines]);
  const selectedDateDeadlines = useMemo(
    () =>
      filteredDeadlines.filter(
        (deadline) => deadline.dueDate && getDayKey(new Date(deadline.dueDate)) === getDayKey(selectedDate),
      ),
    [filteredDeadlines, selectedDate],
  );

  if (isLoading) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Calendar" subtitle="Track upcoming assignments, quizzes, and course deadlines.">
          <div className="calendar-page calendar-page--loading">
            <section className="client-card calendar-page__hero calendar-page__skeleton-shell">
              <div className="calendar-page__skeleton-line calendar-page__skeleton-line--short" />
              <div className="calendar-page__skeleton-line calendar-page__skeleton-line--title" />
              <div className="calendar-page__skeleton-block" />
            </section>
            <section className="client-card calendar-page__section calendar-page__skeleton-shell">
              <div className="calendar-page__skeleton-block calendar-page__skeleton-block--tall" />
            </section>
          </div>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (pageError) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Calendar" subtitle="Track upcoming assignments, quizzes, and course deadlines.">
          <section className="client-card calendar-page__state-card">
            <EmptyState
              icon={<SearchX size={24} aria-hidden="true" />}
              title="Unable to load calendar"
              description={pageError instanceof Error ? pageError.message : 'Calendar data is unavailable right now.'}
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

  if (!courses.length) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Calendar" subtitle="Track upcoming assignments, quizzes, and course deadlines.">
          <section className="client-card calendar-page__state-card">
            <EmptyState
              icon={<CalendarDays size={24} aria-hidden="true" />}
              title="No upcoming deadlines."
              description="Enroll in a course to see assignment due dates and quiz availability."
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

  const hasAnyFilteredDeadline = filteredDeadlines.length > 0;

  return (
    <ClientLayout>
      <ClientPageContainer title="Calendar" subtitle="Track upcoming assignments, quizzes, and course deadlines.">
        <div className="calendar-page">
          <section className="client-card calendar-page__hero">
            <div className="calendar-page__hero-copy">
              <Typography.Text className="client-caption">Deadline planner</Typography.Text>
              <Typography.Title level={1} className="client-page-title">
                Calendar
              </Typography.Title>
              <Typography.Paragraph className="client-body">
                Track upcoming assignments, quizzes, and course deadlines.
              </Typography.Paragraph>
            </div>
            <div className="calendar-page__summary-grid" aria-label="Deadline summary">
              <div className="client-card calendar-page__summary-card">
                <Clock3 size={18} aria-hidden="true" />
                <Typography.Text className="client-meta">Due today</Typography.Text>
                <strong>{summary.dueToday}</strong>
              </div>
              <div className="client-card calendar-page__summary-card">
                <CalendarDays size={18} aria-hidden="true" />
                <Typography.Text className="client-meta">Due this week</Typography.Text>
                <strong>{summary.dueThisWeek}</strong>
              </div>
              <div className="client-card calendar-page__summary-card">
                <TimerReset size={18} aria-hidden="true" />
                <Typography.Text className="client-meta">Overdue</Typography.Text>
                <strong>{summary.overdue}</strong>
              </div>
              <div className="client-card calendar-page__summary-card">
                <CheckCircle2 size={18} aria-hidden="true" />
                <Typography.Text className="client-meta">Completed/submitted</Typography.Text>
                <strong>{summary.completed}</strong>
              </div>
            </div>
          </section>

          <div className="calendar-page__layout">
            <main className="calendar-page__main">
              {!hasAnyFilteredDeadline ? (
                <section className="client-card calendar-page__section">
                  <EmptyState
                    compact
                    icon={<SearchX size={22} aria-hidden="true" />}
                    title={deadlines.length ? 'No deadlines match your filters.' : 'No upcoming deadlines.'}
                    description="Adjust the filters or check back after instructors publish due dates."
                  />
                </section>
              ) : (
                <>
                  <DeadlineSection
                    title={startOfDay(selectedDate).getTime() === startOfDay(now).getTime() ? 'Selected Day: Today' : `Selected Day: ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(selectedDate)}`}
                    description="Assignments and real quiz due dates scheduled for the selected calendar day."
                    deadlines={selectedDateDeadlines}
                    now={now}
                  />
                  <DeadlineSection title="Today" description="Deadlines due before the end of today." deadlines={groupedDeadlines.today} now={now} />
                  <DeadlineSection title="This Week" description="Upcoming dated work within the next six days." deadlines={groupedDeadlines.week} now={now} />
                  <DeadlineSection title="Upcoming" description="Later due dates and overdue dated work that still needs review." deadlines={groupedDeadlines.upcoming} now={now} />
                  {groupedDeadlines.noDate.length ? (
                    <DeadlineSection title="No Due Date" description="Published items without a real due date. These are not counted as upcoming deadlines." deadlines={groupedDeadlines.noDate} now={now} />
                  ) : null}
                </>
              )}
            </main>

            <aside className="calendar-page__aside">
              <section className="client-card calendar-page__section">
                <div className="calendar-page__section-header">
                  <div>
                    <Typography.Text className="client-caption">Filters</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      Deadline Filters
                    </Typography.Title>
                  </div>
                  <Filter size={18} aria-hidden="true" />
                </div>

                <div className="calendar-page__filter-group" aria-label="Type filter">
                  {typeFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      className={`calendar-page__filter-button${typeFilter === filter.key ? ' calendar-page__filter-button--active' : ''}`}
                      onClick={() => setTypeFilter(filter.key)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="calendar-page__filter-group" aria-label="Status filter">
                  {statusFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      className={`calendar-page__filter-button${statusFilter === filter.key ? ' calendar-page__filter-button--active' : ''}`}
                      onClick={() => setStatusFilter(filter.key)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <label className="calendar-page__course-filter">
                  <span>Course</span>
                  <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
                    <option value="all">All courses</option>
                    {courses.map((course) => (
                      <option key={course.courseId} value={course.courseId}>
                        {course.courseTitle}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="client-card calendar-page__section">
                <div className="calendar-page__section-header">
                  <div>
                    <Typography.Text className="client-caption">Month markers</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      {formatMonth(now)}
                    </Typography.Title>
                  </div>
                </div>
                <div className="calendar-page__mini-month" aria-label="Current month deadline markers">
                  {monthDays.map((day) => {
                    const count = datedDeadlineCounts.get(getDayKey(day)) ?? 0;
                    const isToday = startOfDay(day).getTime() === startOfDay(now).getTime();
                    const isSelected = startOfDay(day).getTime() === startOfDay(selectedDate).getTime();
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        className={`calendar-page__mini-day${isToday ? ' calendar-page__mini-day--today' : ''}${isSelected ? ' calendar-page__mini-day--selected' : ''}${count ? ' calendar-page__mini-day--marked' : ''}`}
                        onClick={() => setSelectedDate(startOfDay(day))}
                        aria-pressed={isSelected}
                      >
                        <span>{day.getDate()}</span>
                        {count ? <strong>{count}</strong> : null}
                      </button>
                    );
                  })}
                </div>
                <Typography.Text className="client-meta">Click a date to review real assignment due dates. Quizzes only appear here when the API provides a due date.</Typography.Text>
              </section>

              {supportError ? (
                <section className="client-card calendar-page__section calendar-page__support-note">
                  <Typography.Text className="client-card-title">Partial data unavailable</Typography.Text>
                  <Typography.Text className="client-meta">
                    Some assignment, quiz, or attempt data could not be loaded. Available deadlines remain visible.
                  </Typography.Text>
                </section>
              ) : null}

              <section className="client-card calendar-page__section">
                <Typography.Text className="client-caption">Quick routes</Typography.Text>
                <div className="calendar-page__quick-routes">
                  <Button className="client-button client-button-secondary" onClick={() => navigate('/courses')}>
                    Browse courses
                  </Button>
                  {courses[0] ? (
                    <>
                      <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courses[0].courseId}/assignments`)}>
                        Assignments
                      </Button>
                      <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courses[0].courseId}/quizzes`)}>
                        Quizzes
                      </Button>
                    </>
                  ) : null}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Target,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActivityTimeline, EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { listStudentCourseAssignmentsRequest, type StudentAssignmentListItem } from '../../../services/api/assignmentApi';
import { progressService } from '../../../services/api/progressService';
import { listMyQuizAttemptsRequest, listStudentCourseQuizzesRequest, type StudentQuizAttempt, type StudentQuizCourseItem } from '../../../services/api/quizApi';
import { useActivityTimeline, useProgressOverview } from '../../../hooks/useProgressOverview';
import type { CourseProgressItem } from '../../../types/progress';
import './StudentProgressPage.css';

type QuizBundle = {
  course: CourseProgressItem;
  quiz: StudentQuizCourseItem;
};

type AssignmentTrackerStatus = 'PENDING' | 'SUBMITTED' | 'OVERDUE' | 'GRADED';

type AssignmentTrackerItem = {
  id: string;
  courseId: string;
  title: string;
  courseTitle: string;
  dueDate: string | null;
  status: AssignmentTrackerStatus;
  submittedAt: string | null;
  grade: number | null;
  allowLateSubmission: boolean;
};

type QuizTrackerStatus = 'PASSED' | 'FAILED' | 'AVAILABLE' | 'NO_ATTEMPTS_LEFT';

type QuizTrackerItem = {
  id: string;
  courseId: string;
  title: string;
  courseTitle: string;
  passingScore: number;
  attemptsUsed: number;
  maxAttempts: number;
  attemptsRemaining: number;
  status: QuizTrackerStatus;
  latestScore: number | null;
  latestAttemptId: string | null;
  latestSubmittedAt: string | null;
};

type TimelineEvent = {
  id: string;
  label: string;
  title: string;
  description: string;
  time: string;
  sortTime: number;
  actionLabel?: string;
  href?: string;
  icon: ReactNode;
};

type AttentionItem = {
  id: string;
  issue: string;
  title: string;
  courseTitle: string;
  urgency: 'danger' | 'warning' | 'info';
  actionLabel: string;
  href: string;
};

function formatDate(value?: string | null) {
  if (!value) {
    return 'No date available';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
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

function formatRelativeDue(value?: string | null) {
  if (!value) {
    return 'No due date';
  }

  const dueTime = new Date(value).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
  }

  if (diffDays === 0) {
    return 'Due today';
  }

  if (diffDays === 1) {
    return 'Due tomorrow';
  }

  return `Due in ${diffDays} days`;
}

function getCourseProgressState(course: CourseProgressItem) {
  if (course.enrollmentStatus === 'COMPLETED' || course.weightedPercentage >= 100) {
    return { label: 'Completed', badgeClassName: 'client-badge client-badge-success', actionLabel: 'Review Course' as const };
  }

  if (course.weightedPercentage >= 85) {
    return { label: 'Almost Complete', badgeClassName: 'client-badge client-badge-success', actionLabel: 'Continue Learning' as const };
  }

  if (course.weightedPercentage > 0 || course.lessonsCompleted > 0) {
    return { label: 'In Progress', badgeClassName: 'client-badge client-badge-info', actionLabel: 'Continue Learning' as const };
  }

  return { label: 'Not Started', badgeClassName: 'client-badge', actionLabel: 'View Course' as const };
}

function getAssignmentTrackerItem(course: CourseProgressItem, assignment: StudentAssignmentListItem): AssignmentTrackerItem {
  const latestSubmission =
    [...(assignment.submissions ?? [])].sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    })[0] ?? null;
  const dueTime = assignment.dueDate ? new Date(assignment.dueDate).getTime() : null;
  const isOverdue = latestSubmission == null && dueTime != null && dueTime < Date.now();

  let status: AssignmentTrackerStatus = 'PENDING';
  if (latestSubmission?.grade != null || latestSubmission?.status === 'GRADED' || latestSubmission?.status === 'RETURNED') {
    status = 'GRADED';
  } else if (latestSubmission) {
    status = isOverdue || latestSubmission.isLate ? 'SUBMITTED' : 'SUBMITTED';
  } else if (isOverdue) {
    status = 'OVERDUE';
  }

  return {
    id: assignment.id,
    courseId: course.courseId,
    title: assignment.title,
    courseTitle: course.courseTitle,
    dueDate: assignment.dueDate ?? null,
    status,
    submittedAt: latestSubmission?.submittedAt ?? null,
    grade: latestSubmission?.grade ?? null,
    allowLateSubmission: assignment.allowLateSubmission,
  };
}

function getAssignmentBadgeClass(status: AssignmentTrackerStatus) {
  switch (status) {
    case 'OVERDUE':
      return 'client-badge client-badge-danger';
    case 'PENDING':
      return 'client-badge client-badge-warning';
    case 'SUBMITTED':
      return 'client-badge client-badge-info';
    case 'GRADED':
      return 'client-badge client-badge-success';
    default:
      return 'client-badge';
  }
}

function getAssignmentActionLabel(item: AssignmentTrackerItem) {
  switch (item.status) {
    case 'GRADED':
      return 'View Feedback';
    case 'SUBMITTED':
      return 'Review';
    default:
      return 'Submit';
  }
}

function getQuizTrackerItem(course: CourseProgressItem, quiz: StudentQuizCourseItem, attempts: StudentQuizAttempt[]): QuizTrackerItem {
  const latestCompletedAttempt =
    [...attempts]
      .filter((attempt) => attempt.score != null)
      .sort((a, b) => {
        const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return bTime - aTime;
      })[0] ?? null;

  let status: QuizTrackerStatus = 'AVAILABLE';
  if (latestCompletedAttempt?.isPassed) {
    status = 'PASSED';
  } else if (latestCompletedAttempt && quiz.attemptsRemaining <= 0) {
    status = 'NO_ATTEMPTS_LEFT';
  } else if (latestCompletedAttempt) {
    status = 'FAILED';
  } else if (quiz.attemptsRemaining <= 0) {
    status = 'NO_ATTEMPTS_LEFT';
  }

  return {
    id: quiz.id,
    courseId: course.courseId,
    title: quiz.title,
    courseTitle: course.courseTitle,
    passingScore: quiz.passingScore,
    attemptsUsed: quiz.attemptsUsed,
    maxAttempts: quiz.maxAttempts,
    attemptsRemaining: quiz.attemptsRemaining,
    status,
    latestScore: latestCompletedAttempt?.score ?? null,
    latestAttemptId: latestCompletedAttempt?.id ?? null,
    latestSubmittedAt: latestCompletedAttempt?.submittedAt ?? null,
  };
}

function getQuizBadgeClass(status: QuizTrackerStatus) {
  switch (status) {
    case 'PASSED':
      return 'client-badge client-badge-success';
    case 'FAILED':
      return 'client-badge client-badge-danger';
    case 'NO_ATTEMPTS_LEFT':
      return 'client-badge client-badge-warning';
    case 'AVAILABLE':
    default:
      return 'client-badge client-badge-info';
  }
}

function getQuizActionLabel(item: QuizTrackerItem) {
  switch (item.status) {
    case 'PASSED':
    case 'FAILED':
      return item.attemptsRemaining > 0 ? 'Retake Quiz' : 'Review Result';
    case 'NO_ATTEMPTS_LEFT':
      return item.latestAttemptId ? 'Review Result' : 'View Details';
    case 'AVAILABLE':
    default:
      return item.attemptsUsed > 0 ? 'Retake Quiz' : 'Start Quiz';
  }
}

function getQuizActionHref(item: QuizTrackerItem) {
  if ((item.status === 'PASSED' || item.status === 'FAILED' || item.status === 'NO_ATTEMPTS_LEFT') && item.latestAttemptId) {
    return `/courses/${item.courseId}/quizzes/${item.id}/results/${item.latestAttemptId}`;
  }

  return `/courses/${item.courseId}/quizzes/${item.id}`;
}

function buildProgressSkeleton() {
  return (
    <div className="progress-center progress-center--loading">
      <section className="client-card progress-center__hero progress-center__skeleton-shell">
        <div className="progress-center__skeleton-line progress-center__skeleton-line--short" />
        <div className="progress-center__skeleton-line progress-center__skeleton-line--title" />
        <div className="progress-center__skeleton-block" />
      </section>
      <section className="progress-center__metrics progress-center__metrics--loading">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="client-card progress-center__metric-card progress-center__skeleton-shell">
            <div className="progress-center__skeleton-line progress-center__skeleton-line--short" />
            <div className="progress-center__skeleton-line progress-center__skeleton-line--title" />
          </div>
        ))}
      </section>
      <div className="progress-center__layout">
        <div className="progress-center__main">
          <section className="client-card progress-center__section progress-center__skeleton-shell">
            <div className="progress-center__skeleton-block progress-center__skeleton-block--tall" />
          </section>
          <section className="client-card progress-center__section progress-center__skeleton-shell">
            <div className="progress-center__skeleton-block progress-center__skeleton-block--tall" />
          </section>
        </div>
        <aside className="progress-center__aside">
          <section className="client-card progress-center__section progress-center__skeleton-shell">
            <div className="progress-center__skeleton-block progress-center__skeleton-block--tall" />
          </section>
        </aside>
      </div>
    </div>
  );
}

export function StudentProgressPage() {
  const navigate = useNavigate();
  const overviewQuery = useProgressOverview();
  const timelineQuery = useActivityTimeline(6, 0);

  const courses = overviewQuery.data?.courses ?? [];
  const trackedCourses = courses.filter((course) => course.enrollmentStatus !== 'DROPPED');
  const activeCourses = trackedCourses.filter((course) => course.enrollmentStatus === 'ACTIVE');
  const completedCourses = trackedCourses.filter((course) => course.enrollmentStatus === 'COMPLETED');

  const courseDetailQueries = useQueries({
    queries: activeCourses.map((course) => ({
      queryKey: ['progress-center', 'course-detail', course.courseId],
      queryFn: () => progressService.getMyCourseProgress(course.courseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const assignmentQueries = useQueries({
    queries: trackedCourses.map((course) => ({
      queryKey: ['progress-center', 'assignments', course.courseId],
      queryFn: () => listStudentCourseAssignmentsRequest(course.courseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const quizListQueries = useQueries({
    queries: trackedCourses.map((course) => ({
      queryKey: ['progress-center', 'quizzes', course.courseId],
      queryFn: () => listStudentCourseQuizzesRequest(course.courseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const quizzesWithCourse = useMemo<QuizBundle[]>(
    () =>
      trackedCourses.flatMap((course, index) =>
        (quizListQueries[index]?.data ?? []).map((quiz) => ({
          course,
          quiz,
        })),
      ),
    [trackedCourses, quizListQueries],
  );

  const quizAttemptQueries = useQueries({
    queries: quizzesWithCourse.map(({ quiz }) => ({
      queryKey: ['progress-center', 'quiz-attempts', quiz.id],
      queryFn: () => listMyQuizAttemptsRequest(quiz.id),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const courseDetails = useMemo(
    () =>
      activeCourses.map((course, index) => ({
        course,
        detail: courseDetailQueries[index]?.data ?? null,
      })),
    [activeCourses, courseDetailQueries],
  );

  const activeCourseForHero = useMemo(() => {
    return [...courseDetails]
      .sort((a, b) => {
        const aTime = a.detail?.lastProgressAt ? new Date(a.detail.lastProgressAt).getTime() : 0;
        const bTime = b.detail?.lastProgressAt ? new Date(b.detail.lastProgressAt).getTime() : 0;
        return bTime - aTime;
      })
      .find((entry) => entry.detail != null) ?? null;
  }, [courseDetails]);

  const nextLesson = useMemo(() => {
    const lessons = activeCourseForHero?.detail?.lessons ?? [];
    return lessons.find((lesson) => !lesson.isCompleted) ?? null;
  }, [activeCourseForHero]);

  const assignmentTrackerItems = useMemo<AssignmentTrackerItem[]>(
    () =>
      trackedCourses.flatMap((course, index) =>
        (assignmentQueries[index]?.data ?? []).map((assignment) => getAssignmentTrackerItem(course, assignment)),
      ),
    [trackedCourses, assignmentQueries],
  );

  const quizTrackerItems = useMemo<QuizTrackerItem[]>(
    () =>
      quizzesWithCourse.map((bundle, index) =>
        getQuizTrackerItem(bundle.course, bundle.quiz, quizAttemptQueries[index]?.data ?? []),
      ),
    [quizzesWithCourse, quizAttemptQueries],
  );

  const summaryMetrics = useMemo(() => {
    const gradedAssignments = assignmentTrackerItems.filter((item) => item.status === 'GRADED').length;
    const submittedAssignments = assignmentTrackerItems.filter((item) => item.status === 'SUBMITTED' || item.status === 'GRADED').length;
    const completedQuizzes = quizTrackerItems.filter((item) => item.latestScore != null).length;
    const passedQuizzes = quizTrackerItems.filter((item) => item.status === 'PASSED').length;
    const latestQuizScores = quizTrackerItems.filter((item) => item.latestScore != null).map((item) => item.latestScore!);
    const averageQuizScore = latestQuizScores.length
      ? Math.round(latestQuizScores.reduce((sum, value) => sum + value, 0) / latestQuizScores.length)
      : null;

    return {
      overallProgress: overviewQuery.data?.summary.overallProgress ?? 0,
      activeCourses: overviewQuery.data?.summary.activeCourses ?? 0,
      completedCourses: overviewQuery.data?.summary.completedCourses ?? 0,
      assignmentsSubmitted: submittedAssignments,
      quizzesCompleted: completedQuizzes,
      averageQuizScore,
      gradedAssignments,
      passedQuizzes,
    };
  }, [assignmentTrackerItems, overviewQuery.data?.summary, quizTrackerItems]);

  const courseRows = useMemo(
    () =>
      trackedCourses
        .map((course) => {
          const detail = courseDetails.find((entry) => entry.course.courseId === course.courseId)?.detail ?? null;
          const nextIncompleteLesson = detail?.lessons.find((lesson) => !lesson.isCompleted) ?? null;
          return {
            course,
            detail,
            nextIncompleteLesson,
            state: getCourseProgressState(course),
          };
        })
        .sort((a, b) => {
          if (a.course.enrollmentStatus === 'ACTIVE' && b.course.enrollmentStatus !== 'ACTIVE') return -1;
          if (a.course.enrollmentStatus !== 'ACTIVE' && b.course.enrollmentStatus === 'ACTIVE') return 1;
          return b.course.weightedPercentage - a.course.weightedPercentage;
        }),
    [courseDetails, trackedCourses],
  );

  const assignmentSummary = useMemo(
    () => ({
      pending: assignmentTrackerItems.filter((item) => item.status === 'PENDING').length,
      submitted: assignmentTrackerItems.filter((item) => item.status === 'SUBMITTED').length,
      overdue: assignmentTrackerItems.filter((item) => item.status === 'OVERDUE').length,
      graded: assignmentTrackerItems.filter((item) => item.status === 'GRADED').length,
    }),
    [assignmentTrackerItems],
  );

  const sortedAssignments = useMemo(
    () =>
      [...assignmentTrackerItems].sort((a, b) => {
        const rank = { OVERDUE: 0, PENDING: 1, SUBMITTED: 2, GRADED: 3 } as const;
        const rankDiff = rank[a.status] - rank[b.status];
        if (rankDiff !== 0) return rankDiff;
        const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      }),
    [assignmentTrackerItems],
  );

  const quizSummary = useMemo(
    () => ({
      completed: quizTrackerItems.filter((item) => item.latestScore != null).length,
      passed: quizTrackerItems.filter((item) => item.status === 'PASSED').length,
      failed: quizTrackerItems.filter((item) => item.status === 'FAILED').length,
      attemptsRemaining: quizTrackerItems.reduce((sum, item) => sum + item.attemptsRemaining, 0),
    }),
    [quizTrackerItems],
  );

  const sortedQuizzes = useMemo(
    () =>
      [...quizTrackerItems].sort((a, b) => {
        const rank = { FAILED: 0, AVAILABLE: 1, PASSED: 2, NO_ATTEMPTS_LEFT: 3 } as const;
        const rankDiff = rank[a.status] - rank[b.status];
        if (rankDiff !== 0) return rankDiff;
        return a.title.localeCompare(b.title);
      }),
    [quizTrackerItems],
  );

  const timelineItems = useMemo<TimelineEvent[]>(() => {
    const progressItems =
      timelineQuery.data?.activities.map((activity) => ({
        id: `progress-${activity.id}`,
        label: activity.type.replaceAll('_', ' '),
        title: activity.courseTitle,
        description: activity.description,
        time: formatDateTime(activity.timestamp),
        sortTime: activity.timestamp ? new Date(activity.timestamp).getTime() : 0,
        actionLabel: 'View Course',
        href: `/courses/${activity.courseId}`,
        icon:
          activity.type === 'LESSON_COMPLETED' ? <CheckCircle2 size={14} /> : activity.type === 'COURSE_COMPLETED' ? <GraduationCap size={14} /> : <BookOpen size={14} />,
      })) ?? [];

    const assignmentEvents = assignmentTrackerItems
      .filter((item) => item.submittedAt)
      .map((item) => ({
        id: `assignment-${item.id}`,
        label: 'Assignment submitted',
        title: item.title,
        description: `${item.courseTitle}`,
        time: formatDateTime(item.submittedAt),
        sortTime: item.submittedAt ? new Date(item.submittedAt).getTime() : 0,
        actionLabel: item.status === 'GRADED' ? 'View Feedback' : 'View Submission',
        href: `/courses/${item.courseId}/assignments/${item.id}`,
        icon: <ClipboardCheck size={14} />,
      }));

    const quizEvents = quizTrackerItems
      .filter((item) => item.latestAttemptId && item.latestScore != null)
      .map((item) => ({
        id: `quiz-${item.id}`,
        label: 'Quiz completed',
        title: item.title,
        description: `${item.courseTitle} · Score ${item.latestScore}%`,
        time: formatDateTime(item.latestSubmittedAt),
        sortTime: item.latestSubmittedAt ? new Date(item.latestSubmittedAt).getTime() : 0,
        actionLabel: 'Review Result',
        href: `/courses/${item.courseId}/quizzes/${item.id}/results/${item.latestAttemptId}`,
        icon: <Target size={14} />,
      }));

    return [...progressItems, ...assignmentEvents, ...quizEvents]
      .sort((a, b) => b.sortTime - a.sortTime)
      .slice(0, 8);
  }, [assignmentTrackerItems, quizTrackerItems, timelineQuery.data?.activities]);

  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    sortedAssignments
      .filter((item) => item.status === 'OVERDUE')
      .slice(0, 3)
      .forEach((item) => {
        items.push({
          id: `assignment-overdue-${item.id}`,
          issue: 'Overdue assignment',
          title: item.title,
          courseTitle: item.courseTitle,
          urgency: 'danger',
          actionLabel: 'Submit',
          href: `/courses/${item.courseId}/assignments/${item.id}`,
        });
      });

    sortedQuizzes
      .filter((item) => item.status === 'NO_ATTEMPTS_LEFT')
      .slice(0, 2)
      .forEach((item) => {
        items.push({
          id: `quiz-exhausted-${item.id}`,
          issue: 'No attempts left',
          title: item.title,
          courseTitle: item.courseTitle,
          urgency: 'warning',
          actionLabel: item.latestAttemptId ? 'View Details' : 'Start Quiz',
          href: getQuizActionHref(item),
        });
      });

    courseRows
      .filter((item) => item.course.enrollmentStatus === 'ACTIVE' && item.course.weightedPercentage < 25)
      .slice(0, 2)
      .forEach((item) => {
        items.push({
          id: `course-low-${item.course.courseId}`,
          issue: 'Low progress',
          title: item.course.courseTitle,
          courseTitle: item.course.instructorName,
          urgency: 'info',
          actionLabel: item.nextIncompleteLesson ? 'Continue Learning' : 'View Course',
          href: item.nextIncompleteLesson
            ? `/courses/${item.course.courseId}/learn/${item.nextIncompleteLesson.lessonId}`
            : `/courses/${item.course.courseId}`,
        });
      });

    return items.slice(0, 5);
  }, [courseRows, sortedAssignments, sortedQuizzes]);

  const certificatesAvailable = completedCourses.length > 0;

  const assignmentsError = assignmentQueries.find((query) => query.error)?.error;
  const quizzesError =
    quizListQueries.find((query) => query.error)?.error ??
    quizAttemptQueries.find((query) => query.error)?.error;
  const detailsError = courseDetailQueries.find((query) => query.error)?.error;

  const overallLoading =
    overviewQuery.isLoading ||
    courseDetailQueries.some((query) => query.isLoading) ||
    assignmentQueries.some((query) => query.isLoading) ||
    quizListQueries.some((query) => query.isLoading) ||
    quizAttemptQueries.some((query) => query.isLoading);

  const continueHref = nextLesson
    ? `/courses/${activeCourseForHero?.course.courseId}/learn/${nextLesson.lessonId}`
    : activeCourseForHero
      ? `/courses/${activeCourseForHero.course.courseId}`
      : '/courses';

  if (overallLoading) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Learning Progress" subtitle="Track your current courses, academic tasks, and recent learning progress.">
          {buildProgressSkeleton()}
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (overviewQuery.error) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Learning Progress" subtitle="Track your current courses, academic tasks, and recent learning progress.">
          <section className="client-card progress-center__state-card">
            <EmptyState
              title="Unable to load progress"
              description={overviewQuery.error instanceof Error ? overviewQuery.error.message : 'We could not load the progress workspace right now.'}
              action={
                <Button className="client-button client-button-primary" onClick={() => overviewQuery.refetch()}>
                  Try Again
                </Button>
              }
            />
          </section>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (!trackedCourses.length) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Learning Progress" subtitle="Track your current courses, academic tasks, and recent learning progress.">
          <section className="client-card progress-center__state-card">
            <EmptyState
              title="Start tracking your learning progress"
              description="Enroll in a course and complete lessons to see your progress here."
              action={
                <Button className="client-button client-button-primary" onClick={() => navigate('/courses')}>
                  Browse Courses
                </Button>
              }
            />
          </section>

          <section className="progress-center__preview-grid">
            <div className="client-card progress-center__preview-card">
              <Typography.Text className="client-card-title">Assignment Progress</Typography.Text>
              <Typography.Text className="client-meta">No assignments yet.</Typography.Text>
            </div>
            <div className="client-card progress-center__preview-card">
              <Typography.Text className="client-card-title">Quiz Performance</Typography.Text>
              <Typography.Text className="client-meta">No quizzes available yet.</Typography.Text>
            </div>
            <div className="client-card progress-center__preview-card">
              <Typography.Text className="client-card-title">Certificates</Typography.Text>
              <Typography.Text className="client-meta">No certificates earned yet.</Typography.Text>
            </div>
          </section>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Learning Progress"
        subtitle="Track your current courses, academic tasks, and recent learning progress."
        actions={
          <div className="progress-center__page-actions">
            <Button className="client-button client-button-secondary" onClick={() => navigate('/grades')}>
              View Grades
            </Button>
            <Button className="client-button client-button-secondary" onClick={() => navigate('/certificates')}>
              View Certificates
            </Button>
          </div>
        }
      >
        <div className="progress-center">
          <section className="client-card progress-center__hero">
            <div className="progress-center__hero-copy">
              <Typography.Text className="client-caption">Academic excellence system</Typography.Text>
              <Typography.Title level={1} className="client-page-title">
                Learning Progress
              </Typography.Title>
              <Typography.Paragraph className="client-body">
                Track your courses, assignments, quizzes, and certificates from one focused progress workspace.
              </Typography.Paragraph>
              <div className="progress-center__hero-alert">
                <Typography.Text className="client-body">
                  {activeCourseForHero
                    ? `Continue ${activeCourseForHero.course.courseTitle}${nextLesson ? ` with ${nextLesson.title}` : ''}.`
                    : 'Your next learning action will appear here when a course is active.'}
                </Typography.Text>
              </div>
              <div className="progress-center__action-row">
                <Button className="client-button client-button-primary" onClick={() => navigate(continueHref)}>
                  Continue Learning
                </Button>
                <Button className="client-button client-button-secondary" onClick={() => navigate('/courses')}>
                  View Courses
                </Button>
              </div>
            </div>
            <div className="progress-center__hero-summary">
              <div className="progress-center__hero-progress">
                <div className="progress-center__hero-ring">
                  <span>{summaryMetrics.overallProgress}%</span>
                </div>
                <div>
                  <Typography.Text className="client-meta">Overall completion</Typography.Text>
                  <Typography.Text className="client-card-title">
                    {activeCourseForHero ? activeCourseForHero.course.courseTitle : 'No active course selected'}
                  </Typography.Text>
                  <Typography.Text className="client-meta">
                    {nextLesson ? `Next lesson: ${nextLesson.title}` : 'Course progress detail will appear here when a lesson is ready.'}
                  </Typography.Text>
                </div>
              </div>
              <div className="progress-center__metric-grid">
                <div className="client-card progress-center__metric-card">
                  <Typography.Text className="client-meta">Courses In Progress</Typography.Text>
                  <strong>{summaryMetrics.activeCourses}</strong>
                </div>
                <div className="client-card progress-center__metric-card">
                  <Typography.Text className="client-meta">Completed Courses</Typography.Text>
                  <strong>{summaryMetrics.completedCourses}</strong>
                </div>
                <div className="client-card progress-center__metric-card">
                  <Typography.Text className="client-meta">Assignments Submitted</Typography.Text>
                  <strong>{summaryMetrics.assignmentsSubmitted}</strong>
                </div>
                <div className="client-card progress-center__metric-card">
                  <Typography.Text className="client-meta">Quizzes Completed</Typography.Text>
                  <strong>{summaryMetrics.quizzesCompleted}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="progress-center__metrics">
            <div className="client-card progress-center__metric-card">
              <Typography.Text className="client-meta">Overall Progress</Typography.Text>
              <strong>{summaryMetrics.overallProgress}%</strong>
            </div>
            <div className="client-card progress-center__metric-card">
              <Typography.Text className="client-meta">Courses In Progress</Typography.Text>
              <strong>{summaryMetrics.activeCourses}</strong>
            </div>
            <div className="client-card progress-center__metric-card">
              <Typography.Text className="client-meta">Completed Courses</Typography.Text>
              <strong>{summaryMetrics.completedCourses}</strong>
            </div>
            <div className="client-card progress-center__metric-card">
              <Typography.Text className="client-meta">Assignments Submitted</Typography.Text>
              <strong>{summaryMetrics.assignmentsSubmitted}</strong>
            </div>
            <div className="client-card progress-center__metric-card">
              <Typography.Text className="client-meta">Quizzes Completed</Typography.Text>
              <strong>{summaryMetrics.quizzesCompleted}</strong>
            </div>
            {summaryMetrics.averageQuizScore != null ? (
              <div className="client-card progress-center__metric-card">
                <Typography.Text className="client-meta">Average Quiz Score</Typography.Text>
                <strong>{summaryMetrics.averageQuizScore}%</strong>
              </div>
            ) : null}
          </section>

          <div className="progress-center__layout">
            <div className="progress-center__main">
              <section className="client-card progress-center__section">
                <div className="progress-center__section-header">
                  <div className="progress-center__section-copy">
                    <Typography.Text className="client-caption">Core learning path</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      Course Progress List
                    </Typography.Title>
                  </div>
                  <Button className="client-button client-button-ghost" onClick={() => navigate('/courses')}>
                    View Courses
                  </Button>
                </div>
                <div className="progress-center__course-list">
                  {courseRows.map(({ course, nextIncompleteLesson, state }) => (
                    <article key={course.courseId} className="progress-center__course-row">
                      <div className="progress-center__course-main">
                        <div className="progress-center__course-title-row">
                          <Typography.Text className="client-card-title">{course.courseTitle}</Typography.Text>
                          <span className={state.badgeClassName}>{state.label}</span>
                        </div>
                        <Typography.Text className="client-meta">
                          {course.instructorName || 'Instructor unavailable'}
                        </Typography.Text>
                        <div className="progress-center__progress-row">
                          <div className="progress-center__progress-track">
                            <span className="progress-center__progress-fill" style={{ width: `${Math.max(0, Math.min(100, course.weightedPercentage))}%` }} />
                          </div>
                          <Typography.Text className="client-meta">{course.weightedPercentage}%</Typography.Text>
                        </div>
                        <div className="progress-center__course-meta">
                          <Typography.Text className="client-meta">
                            {course.lessonsCompleted}/{course.totalLessons} lessons completed
                          </Typography.Text>
                          <Typography.Text className="client-meta">
                            {nextIncompleteLesson ? `Next lesson: ${nextIncompleteLesson.title}` : course.completedAt ? `Completed ${formatDate(course.completedAt)}` : 'Course detail available inside the course workspace'}
                          </Typography.Text>
                        </div>
                      </div>
                      <div className="progress-center__course-actions">
                        <Button
                          className={state.actionLabel === 'Continue Learning' ? 'client-button client-button-primary' : 'client-button client-button-secondary'}
                          onClick={() =>
                            navigate(
                              nextIncompleteLesson
                                ? `/courses/${course.courseId}/learn/${nextIncompleteLesson.lessonId}`
                                : `/courses/${course.courseId}`,
                            )
                          }
                        >
                          {state.actionLabel}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
                {detailsError ? (
                  <div className="progress-center__partial-state">
                    <Typography.Text className="client-meta">
                      Some course lesson detail is unavailable right now. Course progress remains visible.
                    </Typography.Text>
                  </div>
                ) : null}
              </section>

              <div className="progress-center__split-grid">
                <section className="client-card progress-center__section">
                  <div className="progress-center__section-header">
                    <div className="progress-center__section-copy">
                      <Typography.Text className="client-caption">Assignments</Typography.Text>
                      <Typography.Title level={3} className="client-section-title">
                        Assignment Progress Tracker
                      </Typography.Title>
                    </div>
                  </div>
                  <div className="progress-center__mini-metrics">
                    <div className="progress-center__mini-metric"><Typography.Text className="client-meta">Pending</Typography.Text><strong>{assignmentSummary.pending}</strong></div>
                    <div className="progress-center__mini-metric"><Typography.Text className="client-meta">Submitted</Typography.Text><strong>{assignmentSummary.submitted}</strong></div>
                    <div className="progress-center__mini-metric"><Typography.Text className="client-meta">Overdue</Typography.Text><strong>{assignmentSummary.overdue}</strong></div>
                    <div className="progress-center__mini-metric"><Typography.Text className="client-meta">Graded</Typography.Text><strong>{assignmentSummary.graded}</strong></div>
                  </div>
                  {assignmentsError ? (
                    <EmptyState title="Assignment progress unavailable" description="We could not load the assignment tracker right now." compact />
                  ) : sortedAssignments.length ? (
                    <div className="progress-center__tracker-list">
                      {sortedAssignments.slice(0, 5).map((item) => (
                        <article key={item.id} className="progress-center__tracker-item">
                          <div className="progress-center__tracker-copy">
                            <div className="progress-center__tracker-title-row">
                              <Typography.Text className="client-card-title">{item.title}</Typography.Text>
                              <span className={getAssignmentBadgeClass(item.status)}>{item.status.replace('_', ' ')}</span>
                            </div>
                            <Typography.Text className="client-meta">{item.courseTitle}</Typography.Text>
                            <Typography.Text className="client-meta">
                              {item.status === 'SUBMITTED' && item.submittedAt ? `Submitted ${formatDate(item.submittedAt)}` : formatRelativeDue(item.dueDate)}
                            </Typography.Text>
                          </div>
                          <div className="progress-center__tracker-actions">
                            {item.grade != null ? <Typography.Text className="client-meta">{item.grade}%</Typography.Text> : null}
                            <Button
                              className={item.status === 'OVERDUE' || item.status === 'PENDING' ? 'client-button client-button-primary' : 'client-button client-button-secondary'}
                              onClick={() => navigate(`/courses/${item.courseId}/assignments/${item.id}`)}
                            >
                              {getAssignmentActionLabel(item)}
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No assignments" description="Assignment activity will appear here when course work is available." compact />
                  )}
                </section>

                <section className="client-card progress-center__section">
                  <div className="progress-center__section-header">
                    <div className="progress-center__section-copy">
                      <Typography.Text className="client-caption">Quizzes</Typography.Text>
                      <Typography.Title level={3} className="client-section-title">
                        Quiz Performance Tracker
                      </Typography.Title>
                    </div>
                  </div>
                  <div className="progress-center__mini-metrics">
                    <div className="progress-center__mini-metric"><Typography.Text className="client-meta">Completed</Typography.Text><strong>{quizSummary.completed}</strong></div>
                    <div className="progress-center__mini-metric"><Typography.Text className="client-meta">Passed</Typography.Text><strong>{quizSummary.passed}</strong></div>
                    <div className="progress-center__mini-metric"><Typography.Text className="client-meta">Failed</Typography.Text><strong>{quizSummary.failed}</strong></div>
                    <div className="progress-center__mini-metric"><Typography.Text className="client-meta">Attempts Left</Typography.Text><strong>{quizSummary.attemptsRemaining}</strong></div>
                  </div>
                  {quizzesError ? (
                    <EmptyState title="Quiz performance unavailable" description="We could not load the quiz tracker right now." compact />
                  ) : sortedQuizzes.length ? (
                    <div className="progress-center__tracker-list">
                      {sortedQuizzes.slice(0, 5).map((item) => (
                        <article key={item.id} className="progress-center__tracker-item">
                          <div className="progress-center__tracker-copy">
                            <div className="progress-center__tracker-title-row">
                              <Typography.Text className="client-card-title">{item.title}</Typography.Text>
                              <span className={getQuizBadgeClass(item.status)}>{item.status.replaceAll('_', ' ')}</span>
                            </div>
                            <Typography.Text className="client-meta">{item.courseTitle}</Typography.Text>
                            <Typography.Text className="client-meta">
                              Passing score {item.passingScore}% · {item.attemptsUsed}/{item.maxAttempts} attempts used
                            </Typography.Text>
                          </div>
                          <div className="progress-center__tracker-actions">
                            {item.latestScore != null ? <Typography.Text className="client-meta">{item.latestScore}%</Typography.Text> : null}
                            <Button
                              className={item.status === 'AVAILABLE' ? 'client-button client-button-primary' : 'client-button client-button-secondary'}
                              onClick={() => navigate(getQuizActionHref(item))}
                            >
                              {getQuizActionLabel(item)}
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="No quizzes" description="Quiz performance will appear here when quizzes are available." compact />
                  )}
                </section>
              </div>

              <section className="client-card progress-center__section">
                <div className="progress-center__section-header">
                  <div className="progress-center__section-copy">
                    <Typography.Text className="client-caption">Academic history</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      Learning Timeline
                    </Typography.Title>
                  </div>
                  <Button className="client-button client-button-ghost" onClick={() => navigate('/reports/student-progress')}>
                    Open Timeline
                  </Button>
                </div>
                {timelineItems.length ? (
                  <ActivityTimeline
                    items={timelineItems.map((item) => ({
                      id: item.id,
                      label: item.label,
                      title: item.title,
                      description: item.description,
                      time: item.time,
                      icon: item.icon,
                      action: item.href ? (
                        <Button className="client-button client-button-ghost" onClick={() => navigate(item.href!)}>
                          {item.actionLabel ?? 'View Details'}
                        </Button>
                      ) : undefined,
                    }))}
                  />
                ) : (
                  <EmptyState title="No recent learning activity" description="Your lesson, assignment, and quiz history will appear here." compact />
                )}
              </section>
            </div>

            <aside className="progress-center__aside">
              <section className="client-card progress-center__section progress-center__section--attention">
                <div className="progress-center__section-header">
                  <div className="progress-center__section-copy">
                    <Typography.Text className="client-caption">Immediate risks</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      Needs Attention
                    </Typography.Title>
                  </div>
                </div>
                {attentionItems.length ? (
                  <div className="progress-center__attention-list">
                    {attentionItems.map((item) => (
                      <article key={item.id} className="progress-center__attention-item">
                        <div className="progress-center__attention-copy">
                          <span className={`client-badge ${item.urgency === 'danger' ? 'client-badge-danger' : item.urgency === 'warning' ? 'client-badge-warning' : 'client-badge-info'}`}>
                            {item.issue}
                          </span>
                          <Typography.Text className="client-card-title">{item.title}</Typography.Text>
                          <Typography.Text className="client-meta">{item.courseTitle}</Typography.Text>
                        </div>
                        <Button
                          className={item.urgency === 'danger' ? 'client-button client-button-primary' : 'client-button client-button-secondary'}
                          onClick={() => navigate(item.href)}
                        >
                          {item.actionLabel}
                        </Button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No urgent issues" description="Nothing critical needs attention right now." compact />
                )}
              </section>

              <section className="client-card progress-center__section">
                <div className="progress-center__section-header">
                  <div className="progress-center__section-copy">
                    <Typography.Text className="client-caption">Certificates</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      Certificates & Achievements
                    </Typography.Title>
                  </div>
                  <Button className="client-button client-button-secondary" onClick={() => navigate('/certificates')}>
                    View Certificates
                  </Button>
                </div>
                {certificatesAvailable ? (
                  <div className="progress-center__certificate-card">
                    <div className="progress-center__certificate-stat">
                      <Award size={18} />
                      <div>
                        <Typography.Text className="client-card-title">Completed courses</Typography.Text>
                        <Typography.Text className="client-meta">
                          {completedCourses.length} course{completedCourses.length === 1 ? '' : 's'} completed
                        </Typography.Text>
                      </div>
                    </div>
                    <Typography.Text className="client-meta">
                      Certificate issuance is still unavailable. Completed courses are tracked and ready for certificate support when the backend is restored.
                    </Typography.Text>
                  </div>
                ) : (
                  <EmptyState
                    title="No certificates yet."
                    description="Complete a course to earn your first certificate."
                    compact
                  />
                )}
              </section>
            </aside>
          </div>
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}

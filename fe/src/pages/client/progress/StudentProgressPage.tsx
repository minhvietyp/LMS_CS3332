import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import { BookOpen, CheckCircle2, Clock3, GraduationCap, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { EmptyState, StatusBadge, type StatusTone } from '../../../components/client-ui';
import { progressService, type StudentCourseProgressDetail } from '../../../services/api/progressService';
import { useActivityTimeline, useProgressOverview } from '../../../hooks/useProgressOverview';
import type { ActivityItem, CourseProgressItem } from '../../../types/progress';
import './StudentProgressPage.css';

type CourseProgressRow = {
  course: CourseProgressItem;
  detail: StudentCourseProgressDetail | null;
  percentage: number;
  completedLessons: number;
  totalLessons: number;
  remainingLessons: number;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
  lastActivityAt: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return 'No recent activity';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No recent activity';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getCourseStatus(row: CourseProgressRow): { label: string; tone: StatusTone; actionLabel: string } {
  if (row.course.enrollmentStatus === 'COMPLETED' || row.percentage >= 100) {
    return { label: 'Completed', tone: 'completed', actionLabel: 'Review' };
  }

  if (row.percentage > 0 || row.completedLessons > 0) {
    return { label: 'In progress', tone: 'in-progress', actionLabel: 'Continue' };
  }

  return { label: 'Not started', tone: 'pending', actionLabel: 'Start' };
}

function getActivityPresentation(activity: ActivityItem): { label: string; tone: StatusTone } {
  switch (activity.type) {
    case 'LESSON_COMPLETED':
      return { label: 'Lesson completed', tone: 'completed' };
    case 'COURSE_COMPLETED':
      return { label: 'Course completed', tone: 'completed' };
    case 'ENROLLED':
      return { label: 'Enrolled', tone: 'active' };
    case 'DROPPED':
      return { label: 'Dropped', tone: 'locked' };
    default:
      return { label: 'Progress updated', tone: 'in-progress' };
  }
}

function buildProgressSkeleton() {
  return (
    <div className="progress-page progress-page--loading">
      <section className="progress-page__summary-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="client-card progress-page__summary-card">
            <span className="client-skeleton-block progress-page__skeleton-label" />
            <span className="client-skeleton-block progress-page__skeleton-value" />
          </article>
        ))}
      </section>
      <section className="client-card progress-page__panel">
        <span className="client-skeleton-block progress-page__skeleton-title" />
        <span className="client-skeleton-block progress-page__skeleton-row" />
        <span className="client-skeleton-block progress-page__skeleton-row" />
        <span className="client-skeleton-block progress-page__skeleton-row" />
      </section>
    </div>
  );
}

export function StudentProgressPage() {
  const navigate = useNavigate();
  const overviewQuery = useProgressOverview();
  const timelineQuery = useActivityTimeline(8, 0);

  const trackedCourses = useMemo(
    () => (overviewQuery.data?.courses ?? []).filter((course) => course.enrollmentStatus !== 'DROPPED'),
    [overviewQuery.data?.courses],
  );
  const activeCourses = trackedCourses.filter((course) => course.enrollmentStatus === 'ACTIVE');

  const courseDetailQueries = useQueries({
    queries: trackedCourses.map((course) => ({
      queryKey: ['progress-page', 'course-detail', course.courseId],
      queryFn: () => progressService.getMyCourseProgress(course.courseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const courseRows = useMemo<CourseProgressRow[]>(
    () =>
      trackedCourses
        .map((course, index) => {
          const detail = courseDetailQueries[index]?.data ?? null;
          const percentage = clampPercent(detail?.percentage ?? course.percentage ?? course.weightedPercentage ?? 0);
          const completedLessons = detail?.completedLessons ?? course.lessonsCompleted;
          const totalLessons = detail?.totalLessons ?? course.totalLessons;
          const nextLesson = detail?.lessons.find((lesson) => !lesson.isCompleted) ?? null;

          return {
            course,
            detail,
            percentage,
            completedLessons,
            totalLessons,
            remainingLessons: Math.max(totalLessons - completedLessons, 0),
            nextLessonId: nextLesson?.lessonId ?? null,
            nextLessonTitle: nextLesson?.title ?? null,
            lastActivityAt: detail?.lastProgressAt ?? course.completedAt ?? null,
          };
        })
        .sort((left, right) => {
          if (left.course.enrollmentStatus === 'ACTIVE' && right.course.enrollmentStatus !== 'ACTIVE') return -1;
          if (left.course.enrollmentStatus !== 'ACTIVE' && right.course.enrollmentStatus === 'ACTIVE') return 1;
          return right.percentage - left.percentage;
        }),
    [courseDetailQueries, trackedCourses],
  );

  const totalCompletedLessons = courseRows.reduce((sum, row) => sum + row.completedLessons, 0);
  const totalLessons = courseRows.reduce((sum, row) => sum + row.totalLessons, 0);
  const pendingLessons = Math.max(totalLessons - totalCompletedLessons, 0);
  const overallProgress = overviewQuery.data?.summary.overallProgress ?? (
    courseRows.length
      ? Math.round(courseRows.reduce((sum, row) => sum + row.percentage, 0) / courseRows.length)
      : 0
  );
  const nextCourse = courseRows.find((row) => row.course.enrollmentStatus === 'ACTIVE' && row.percentage < 100) ?? null;
  const detailsError = courseDetailQueries.some((query) => query.error);
  const isLoading = overviewQuery.isLoading || courseDetailQueries.some((query) => query.isLoading);
  const error = overviewQuery.error;
  const activities = timelineQuery.data?.activities ?? [];

  if (isLoading) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Progress" subtitle="Track your course progress, completed lessons, and recent learning activity.">
          {buildProgressSkeleton()}
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Progress" subtitle="Track your course progress, completed lessons, and recent learning activity.">
          <section className="client-card progress-page__state-card">
            <EmptyState
              title="Unable to load progress"
              description="We could not load your course progress right now."
              action={
                <Button className="client-button client-button-primary" onClick={() => overviewQuery.refetch()}>
                  Try again
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
      <ClientPageContainer title="Progress" subtitle="Track your course progress, completed lessons, and recent learning activity.">
        <div className="progress-page">
          <section className="progress-page__summary-grid" aria-label="Progress summary">
            <article className="client-card progress-page__summary-card">
              <Typography.Text className="client-meta">Overall progress</Typography.Text>
              <strong>{clampPercent(overallProgress)}%</strong>
              <Typography.Text className="client-meta">From progress overview</Typography.Text>
            </article>
            <article className="client-card progress-page__summary-card">
              <Typography.Text className="client-meta">Active courses</Typography.Text>
              <strong>{activeCourses.length}</strong>
              <Typography.Text className="client-meta">Currently in progress</Typography.Text>
            </article>
            <article className="client-card progress-page__summary-card">
              <Typography.Text className="client-meta">Completed lessons</Typography.Text>
              <strong>{totalCompletedLessons}</strong>
              <Typography.Text className="client-meta">{totalLessons ? `${totalLessons} total lessons` : 'No lesson totals yet'}</Typography.Text>
            </article>
            <article className="client-card progress-page__summary-card">
              <Typography.Text className="client-meta">Pending lessons</Typography.Text>
              <strong>{pendingLessons}</strong>
              <Typography.Text className="client-meta">Remaining across courses</Typography.Text>
            </article>
          </section>

          <div className="progress-page__layout">
            <main className="progress-page__main">
              <section className="client-card progress-page__panel">
                <div className="progress-page__section-header">
                  <div>
                    <Typography.Title level={3} className="client-section-title">Course Progress</Typography.Title>
                    <Typography.Paragraph className="client-meta">Continue from the course that needs your next action.</Typography.Paragraph>
                  </div>
                  <Button className="client-button client-button-secondary" onClick={() => navigate('/courses')}>
                    View courses
                  </Button>
                </div>

                {courseRows.length ? (
                  <div className="progress-page__course-list">
                    {courseRows.map((row) => {
                      const status = getCourseStatus(row);
                      const actionTarget = row.nextLessonId
                        ? `/courses/${row.course.courseId}/learn/${row.nextLessonId}`
                        : `/courses/${row.course.courseId}`;

                      return (
                        <article key={row.course.courseId} className="progress-page__course-row">
                          <div className="progress-page__course-copy">
                            <div className="progress-page__course-title-row">
                              <Typography.Text className="client-card-title">{row.course.courseTitle}</Typography.Text>
                              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                            </div>
                            <Typography.Text className="client-meta">
                              {row.course.instructorName || 'Instructor unavailable'}
                            </Typography.Text>
                            <div className="progress-page__progress-row">
                              <div
                                className="progress-page__progress-track"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={row.percentage}
                                aria-label={`${row.course.courseTitle} progress ${row.percentage} percent`}
                              >
                                <span className="progress-page__progress-fill" style={{ width: `${row.percentage}%` }} />
                              </div>
                              <strong>{row.percentage}%</strong>
                            </div>
                            <div className="progress-page__course-meta">
                              {row.totalLessons > 0 ? (
                                <Typography.Text className="client-meta">
                                  {row.completedLessons}/{row.totalLessons} lessons completed
                                </Typography.Text>
                              ) : null}
                              <Typography.Text className="client-meta">
                                Last activity: {formatDateTime(row.lastActivityAt)}
                              </Typography.Text>
                              {row.nextLessonTitle ? (
                                <Typography.Text className="client-meta">Next: {row.nextLessonTitle}</Typography.Text>
                              ) : null}
                            </div>
                          </div>
                          <div className="progress-page__course-action">
                            <Button
                              className={`client-button ${status.actionLabel === 'Continue' ? 'client-button-primary' : 'client-button-secondary'}`}
                              onClick={() => navigate(actionTarget)}
                            >
                              {status.actionLabel}
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState title="No course progress yet." description="Enrolled courses will appear here when progress data is available." compact />
                )}

                {detailsError ? (
                  <div className="progress-page__partial-note">
                    <Typography.Text className="client-meta">
                      Some course lesson detail is unavailable. Overview progress is still shown.
                    </Typography.Text>
                  </div>
                ) : null}
              </section>

              <section className="client-card progress-page__panel">
                <div className="progress-page__section-header">
                  <div>
                    <Typography.Title level={3} className="client-section-title">Recent Learning History</Typography.Title>
                    <Typography.Paragraph className="client-meta">Latest course and lesson activity from your learning timeline.</Typography.Paragraph>
                  </div>
                </div>

                {timelineQuery.error ? (
                  <EmptyState title="Learning activity unavailable" description="Recent activity could not be loaded right now." compact />
                ) : activities.length ? (
                  <div className="progress-page__activity-list">
                    {activities.map((activity) => {
                      const presentation = getActivityPresentation(activity);

                      return (
                        <article key={activity.id} className="progress-page__activity-row">
                          <span className="progress-page__activity-icon" aria-hidden="true">
                            {activity.type === 'LESSON_COMPLETED' ? <CheckCircle2 size={16} /> : activity.type === 'COURSE_COMPLETED' ? <GraduationCap size={16} /> : <BookOpen size={16} />}
                          </span>
                          <div className="progress-page__activity-copy">
                            <Typography.Text strong>{activity.courseTitle}</Typography.Text>
                            <Typography.Text className="client-meta">{activity.description}</Typography.Text>
                            <Typography.Text className="client-meta">{formatDateTime(activity.timestamp)}</Typography.Text>
                          </div>
                          <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
                          <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${activity.courseId}`)}>
                            View
                          </Button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState title="No learning activity yet." description="Completed lessons and course updates will appear here." compact />
                )}
              </section>
            </main>

            <aside className="progress-page__aside">
              <section className="client-card progress-page__panel progress-page__continue-panel">
                <Typography.Title level={4} className="client-card-title">Continue next</Typography.Title>
                {nextCourse ? (
                  <>
                    <div className="progress-page__continue-course">
                      <PlayCircle size={18} />
                      <div>
                        <Typography.Text strong>{nextCourse.course.courseTitle}</Typography.Text>
                        <Typography.Text className="client-meta">
                          {nextCourse.nextLessonTitle ?? `${nextCourse.remainingLessons} lessons remaining`}
                        </Typography.Text>
                      </div>
                    </div>
                    <Button
                      className="client-button client-button-primary"
                      onClick={() =>
                        navigate(
                          nextCourse.nextLessonId
                            ? `/courses/${nextCourse.course.courseId}/learn/${nextCourse.nextLessonId}`
                            : `/courses/${nextCourse.course.courseId}`,
                        )
                      }
                    >
                      Continue
                    </Button>
                  </>
                ) : (
                  <EmptyState title="No course to continue." description="Active courses will appear here." compact />
                )}
              </section>

              <section className="client-card progress-page__panel">
                <Typography.Title level={4} className="client-card-title">Lesson balance</Typography.Title>
                <div className="progress-page__balance-grid">
                  <div>
                    <CheckCircle2 size={16} />
                    <span className="client-meta">Completed</span>
                    <strong>{totalCompletedLessons}</strong>
                  </div>
                  <div>
                    <Clock3 size={16} />
                    <span className="client-meta">Remaining</span>
                    <strong>{pendingLessons}</strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  MessageSquareText,
  PlayCircle,
  UserRound,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { EmptyState, StatusBadge, type StatusTone } from '../../../components/client-ui';
import { useAuth } from '../../../context/AuthContext';
import {
  listStudentCourseAssignmentsRequest,
  type StudentAssignmentListItem,
} from '../../../services/api/assignmentApi';
import {
  getCourseByIdRequest,
  listPublishedCourseModulesRequest,
  type CourseDetail,
  type CourseLessonItem,
  type CourseModuleItem,
} from '../../../services/api/courseApi';
import { progressService, type StudentLessonProgressItem } from '../../../services/api/progressService';
import {
  listStudentCourseQuizzesRequest,
  type StudentQuizCourseItem,
} from '../../../services/api/quizApi';
import { CourseDetailSkeleton } from './components/CourseDetailSkeleton';
import { CourseDetailStatePanel } from './components/CourseDetailStatePanel';
import './ClientCourseDetailPage.css';

function getCurrentTimestamp() {
  return Date.now();
}

type LessonState = 'completed' | 'in-progress' | 'not-started' | 'locked';
type CourseState = 'available' | 'enrolled' | 'in-progress' | 'completed' | 'draft' | 'archived';

type AssessmentTone = {
  label: string;
  tone: StatusTone;
  actionLabel: string;
};

function sortModules(modules: CourseModuleItem[]) {
  return [...modules].sort((left, right) => left.orderIndex - right.orderIndex);
}

function sortLessons(lessons: CourseLessonItem[]) {
  return [...lessons].sort((left, right) => left.orderIndex - right.orderIndex);
}

function formatDate(value?: string | null) {
  if (!value) return 'No due date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No due date';
  return parsed.toLocaleDateString();
}

function getCourseState(course: CourseDetail | null | undefined, percentage: number | null): CourseState {
  if ((percentage ?? 0) >= 100) return 'completed';
  if ((percentage ?? 0) > 0) return 'in-progress';
  if (percentage !== null) return 'enrolled';
  if (course?.status === 'DRAFT') return 'draft';
  if (course?.status === 'ARCHIVED') return 'archived';
  return 'available';
}

function getCourseStatusPresentation(state: CourseState): { label: string; tone: StatusTone } {
  switch (state) {
    case 'completed':
      return { label: 'Completed', tone: 'completed' };
    case 'in-progress':
      return { label: 'In progress', tone: 'in-progress' };
    case 'enrolled':
      return { label: 'Enrolled', tone: 'active' };
    case 'draft':
      return { label: 'Draft', tone: 'draft' };
    case 'archived':
      return { label: 'Archived', tone: 'locked' };
    default:
      return { label: 'Available', tone: 'published' };
  }
}

function getPrimaryActionLabel(state: CourseState) {
  if (state === 'completed') return 'Review course';
  if (state === 'in-progress') return 'Continue learning';
  if (state === 'enrolled') return 'Start course';
  return 'View course';
}

function getLessonState(
  lesson: CourseLessonItem,
  progress: StudentLessonProgressItem | undefined,
  nextLessonId: string | null,
  isStudent: boolean,
): LessonState {
  if (isStudent && !lesson.isPublished) return 'locked';
  if (progress?.isCompleted) return 'completed';
  if (lesson.id === nextLessonId) return 'in-progress';
  return 'not-started';
}

function getLessonPresentation(state: LessonState): { label: string; tone: StatusTone; actionLabel: string } {
  switch (state) {
    case 'completed':
      return { label: 'Completed', tone: 'completed', actionLabel: 'Review' };
    case 'in-progress':
      return { label: 'In progress', tone: 'in-progress', actionLabel: 'Continue' };
    case 'locked':
      return { label: 'Locked', tone: 'locked', actionLabel: 'Locked' };
    default:
      return { label: 'Not started', tone: 'pending', actionLabel: 'Start' };
  }
}

function getAssignmentPresentation(assignment: StudentAssignmentListItem, now: number): AssessmentTone {
  const latestSubmission = assignment.submissions[0] ?? null;
  const dueTime = assignment.dueDate ? new Date(assignment.dueDate).getTime() : null;
  const isOverdue = dueTime !== null && dueTime < now && !latestSubmission;

  if (latestSubmission?.status === 'GRADED' || latestSubmission?.status === 'RETURNED') {
    return {
      label: latestSubmission.grade != null ? `Graded ${latestSubmission.grade}` : 'Graded',
      tone: 'graded',
      actionLabel: 'Review',
    };
  }

  if (latestSubmission) {
    return { label: 'Submitted', tone: 'submitted', actionLabel: 'Review' };
  }

  if (isOverdue) {
    return { label: 'Overdue', tone: 'overdue', actionLabel: 'View' };
  }

  return { label: 'Not submitted', tone: 'pending', actionLabel: 'Submit' };
}

function getQuizPresentation(quiz: StudentQuizCourseItem): AssessmentTone {
  if (quiz.attemptsRemaining <= 0 && quiz.attemptsUsed > 0) {
    return { label: 'No attempts left', tone: 'locked', actionLabel: 'Review' };
  }

  if (quiz.attemptsUsed > 0) {
    return { label: 'Attempts remaining', tone: 'in-progress', actionLabel: 'Continue' };
  }

  return { label: 'Available', tone: 'published', actionLabel: 'Start quiz' };
}

export function ClientCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const [now] = useState(getCurrentTimestamp);

  const courseQuery = useQuery({
    queryKey: ['courses', 'client-detail', courseId],
    queryFn: () => getCourseByIdRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const modulesQuery = useQuery({
    queryKey: ['courses', 'client-modules', courseId],
    queryFn: () => listPublishedCourseModulesRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const progressQuery = useQuery({
    queryKey: ['courses', 'client-progress', courseId],
    queryFn: () => progressService.getMyCourseProgress(courseId!),
    enabled: Boolean(courseId) && isStudent,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const assignmentsQuery = useQuery({
    queryKey: ['courses', 'client-assignments', courseId],
    queryFn: () => listStudentCourseAssignmentsRequest(courseId!),
    enabled: Boolean(courseId) && isStudent,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const quizzesQuery = useQuery({
    queryKey: ['courses', 'client-quizzes', courseId],
    queryFn: () => listStudentCourseQuizzesRequest(courseId!),
    enabled: Boolean(courseId) && isStudent,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const course = courseQuery.data ?? null;
  const modules = useMemo(() => sortModules(modulesQuery.data ?? course?.modules ?? []), [course?.modules, modulesQuery.data]);
  const allLessons = useMemo(() => modules.flatMap((module) => sortLessons(module.lessons)), [modules]);
  const progressByLessonId = useMemo(
    () => new Map((progressQuery.data?.lessons ?? []).map((lesson) => [lesson.lessonId, lesson])),
    [progressQuery.data?.lessons],
  );
  const nextLesson = allLessons.find((lesson) => !progressByLessonId.get(lesson.id)?.isCompleted) ?? allLessons[0] ?? null;
  const progressPercent = isStudent && progressQuery.data
    ? Math.max(0, Math.min(100, Math.round(progressQuery.data.percentage ?? 0)))
    : null;
  const completedLessons = progressQuery.data?.completedLessons ?? 0;
  const totalLessons = progressQuery.data?.totalLessons ?? allLessons.length;
  const courseState = getCourseState(course, progressPercent);
  const courseStatus = getCourseStatusPresentation(courseState);
  const submittedAssignments = (assignmentsQuery.data ?? []).filter((assignment) => assignment.submissions.length > 0).length;
  const attemptedQuizzes = (quizzesQuery.data ?? []).filter((quiz) => quiz.attemptsUsed > 0).length;
  const upcomingAssignment = (assignmentsQuery.data ?? [])
    .filter((assignment) => assignment.dueDate && assignment.submissions.length === 0)
    .sort((left, right) => new Date(left.dueDate!).getTime() - new Date(right.dueDate!).getTime())[0] ?? null;
  const isLoading = courseQuery.isLoading || modulesQuery.isLoading;

  const handlePrimaryAction = () => {
    if (nextLesson) {
      navigate(`/courses/${courseId}/learn/${nextLesson.id}`);
      return;
    }

    document.getElementById('course-modules')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const retryPage = () => {
    void courseQuery.refetch();
    void modulesQuery.refetch();
    if (isStudent) {
      void progressQuery.refetch();
      void assignmentsQuery.refetch();
      void quizzesQuery.refetch();
    }
  };

  return (
    <ClientLayout>
      <ClientPageContainer title="Course Detail" subtitle={course?.title ?? 'Open course overview, modules, and course work.'}>
        {isLoading ? <CourseDetailSkeleton /> : null}

        {!isLoading && courseQuery.error ? (
          <CourseDetailStatePanel
            title="Unable to load course"
            description="Course details could not be loaded right now."
            primaryActionLabel="Retry"
            onPrimaryAction={retryPage}
            secondaryActionLabel="Back to courses"
            onSecondaryAction={() => navigate('/courses')}
          />
        ) : null}

        {!isLoading && !courseQuery.error && !course ? (
          <CourseDetailStatePanel
            title="Course not found"
            description="The requested course is not available in your workspace."
            primaryActionLabel="Back to courses"
            onPrimaryAction={() => navigate('/courses')}
          />
        ) : null}

        {!isLoading && course ? (
          <div className="course-detail-shell">
            <section className="client-card course-detail-shell__header">
              <div className="course-detail-shell__header-copy">
                <Button className="client-button client-button-ghost course-detail-shell__back-button" onClick={() => navigate('/courses')}>
                  <ArrowLeft size={16} />
                  Courses
                </Button>
                <div className="course-detail-shell__title-block">
                  <StatusBadge tone={courseStatus.tone}>{courseStatus.label}</StatusBadge>
                  <Typography.Title level={2} className="client-page-title course-detail-shell__title">
                    {course.title}
                  </Typography.Title>
                  <Typography.Paragraph className="client-body course-detail-shell__description">
                    {course.description || 'Course description has not been added yet.'}
                  </Typography.Paragraph>
                </div>
                <div className="course-detail-shell__instructor">
                  <UserRound size={16} />
                  <span>{course.instructor?.name ?? 'Instructor unavailable'}</span>
                </div>
              </div>

              <div className="course-detail-shell__header-action">
                {progressPercent !== null ? (
                  <div className="course-detail-shell__header-progress">
                    <div className="course-detail-shell__progress-copy">
                      <span className="client-meta">Course progress</span>
                      <strong>{progressPercent}%</strong>
                    </div>
                    <div
                      className="course-detail-shell__progress-track"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progressPercent}
                      aria-label={`Course progress ${progressPercent} percent`}
                    >
                      <span className="course-detail-shell__progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                ) : null}
                <Button
                  className="client-button client-button-primary course-detail-shell__primary-action"
                  disabled={!nextLesson}
                  onClick={handlePrimaryAction}
                >
                  {getPrimaryActionLabel(courseState)}
                </Button>
              </div>
            </section>

            <div className="course-detail-shell__layout">
              <main className="course-detail-shell__main">
                <section id="course-overview" className="client-card course-detail-shell__section">
                  <div className="course-detail-shell__section-header">
                    <Typography.Title level={3} className="client-section-title">Overview</Typography.Title>
                    <Typography.Paragraph className="client-meta">Course summary and learning metadata.</Typography.Paragraph>
                  </div>
                  <div className="course-detail-shell__overview-grid">
                    <article className="course-detail-shell__overview-panel">
                      <Typography.Title level={4} className="client-card-title">About this course</Typography.Title>
                      <Typography.Paragraph className="client-body">
                        {course.description || 'No detailed course description is available yet.'}
                      </Typography.Paragraph>
                    </article>
                    <article className="course-detail-shell__overview-panel course-detail-shell__overview-panel--meta">
                      <div><span className="client-meta">Instructor</span><strong>{course.instructor?.name ?? 'Unavailable'}</strong></div>
                      <div><span className="client-meta">Modules</span><strong>{modules.length}</strong></div>
                      <div><span className="client-meta">Lessons</span><strong>{totalLessons}</strong></div>
                      {progressPercent !== null ? (
                        <div><span className="client-meta">Progress</span><strong>{progressPercent}%</strong></div>
                      ) : null}
                    </article>
                  </div>
                </section>

                <section id="course-modules" className="client-card course-detail-shell__section">
                  <div className="course-detail-shell__section-header">
                    <Typography.Title level={3} className="client-section-title">Modules</Typography.Title>
                    <Typography.Paragraph className="client-meta">Move through lessons in course order.</Typography.Paragraph>
                  </div>

                  {modulesQuery.error && !modules.length ? (
                    <EmptyState title="Modules unavailable" description="The module list could not be loaded right now." compact />
                  ) : null}
                  {!modulesQuery.error && !modules.length ? (
                    <EmptyState title="No modules available yet." description="Course modules will appear here when they are published." compact />
                  ) : null}
                  {modules.length ? (
                    <div className="course-detail-shell__module-list">
                      {modules.map((module) => {
                        const lessons = sortLessons(module.lessons);
                        const moduleCompletedLessons = lessons.filter((lesson) => progressByLessonId.get(lesson.id)?.isCompleted).length;
                        const moduleProgress = lessons.length ? Math.round((moduleCompletedLessons / lessons.length) * 100) : 0;

                        return (
                          <article key={module.id} className="course-detail-shell__module-card">
                            <div className="course-detail-shell__module-header">
                              <div>
                                <Typography.Title level={4} className="client-card-title">{module.title}</Typography.Title>
                                <Typography.Text className="client-meta">
                                  {lessons.length} lesson{lessons.length === 1 ? '' : 's'}
                                </Typography.Text>
                              </div>
                              {progressPercent !== null ? (
                                <span className="client-meta">{moduleProgress}% complete</span>
                              ) : null}
                            </div>

                            {lessons.length ? (
                              <div className="course-detail-shell__lesson-list">
                                {lessons.map((lesson) => {
                                  const lessonProgress = progressByLessonId.get(lesson.id);
                                  const lessonState = getLessonState(lesson, lessonProgress, nextLesson?.id ?? null, isStudent);
                                  const lessonPresentation = getLessonPresentation(lessonState);
                                  const canOpenLesson = lessonState !== 'locked';

                                  return (
                                    <article key={lesson.id} className="course-detail-shell__lesson-row">
                                      <div className="course-detail-shell__lesson-icon" aria-hidden="true">
                                        {lessonState === 'completed' ? <CheckCircle2 size={18} /> : <PlayCircle size={18} />}
                                      </div>
                                      <div className="course-detail-shell__lesson-copy">
                                        <Typography.Text strong>{lesson.title}</Typography.Text>
                                        <Typography.Text className="client-meta">
                                          {lesson.videoUrl ? 'Video lesson' : 'Lesson workspace'}
                                        </Typography.Text>
                                      </div>
                                      <StatusBadge tone={lessonPresentation.tone}>{lessonPresentation.label}</StatusBadge>
                                      <Button
                                        className={`client-button ${lessonState === 'in-progress' ? 'client-button-primary' : 'client-button-secondary'} course-detail-shell__lesson-action`}
                                        disabled={!canOpenLesson}
                                        onClick={() => navigate(`/courses/${courseId}/learn/${lesson.id}`)}
                                      >
                                        {lessonPresentation.actionLabel}
                                      </Button>
                                    </article>
                                  );
                                })}
                              </div>
                            ) : (
                              <EmptyState title="No lessons in this module yet." compact />
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </section>

                <section id="course-assignments" className="client-card course-detail-shell__section">
                  <div className="course-detail-shell__section-header">
                    <Typography.Title level={3} className="client-section-title">Assignments</Typography.Title>
                    <Typography.Paragraph className="client-meta">Course assignments and submission status.</Typography.Paragraph>
                  </div>
                  {assignmentsQuery.isLoading ? <div className="client-skeleton-block course-detail-shell__list-skeleton" /> : null}
                  {assignmentsQuery.error && !(assignmentsQuery.data ?? []).length ? (
                    <EmptyState title="Assignments unavailable" description="Assignments could not be loaded right now." compact />
                  ) : null}
                  {!assignmentsQuery.isLoading && !assignmentsQuery.error && !(assignmentsQuery.data ?? []).length ? (
                    <EmptyState title="No assignments for this course yet." compact />
                  ) : null}
                  {(assignmentsQuery.data ?? []).length ? (
                    <div className="course-detail-shell__work-list">
                      {(assignmentsQuery.data ?? []).map((assignment) => {
                        const presentation = getAssignmentPresentation(assignment, now);
                        const latestSubmission = assignment.submissions[0] ?? null;

                        return (
                          <article key={assignment.id} className="course-detail-shell__work-row">
                            <ClipboardList size={18} />
                            <div className="course-detail-shell__work-copy">
                              <Typography.Text strong>{assignment.title}</Typography.Text>
                              <Typography.Text className="client-meta">Due {formatDate(assignment.dueDate)}</Typography.Text>
                            </div>
                            <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
                            {latestSubmission?.grade != null ? <span className="client-meta">Score {latestSubmission.grade}</span> : null}
                            <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}/assignments/${assignment.id}`)}>
                              {presentation.actionLabel}
                            </Button>
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </section>

                <section id="course-quizzes" className="client-card course-detail-shell__section">
                  <div className="course-detail-shell__section-header">
                    <Typography.Title level={3} className="client-section-title">Quizzes</Typography.Title>
                    <Typography.Paragraph className="client-meta">Quiz attempts and passing requirements.</Typography.Paragraph>
                  </div>
                  {quizzesQuery.isLoading ? <div className="client-skeleton-block course-detail-shell__list-skeleton" /> : null}
                  {quizzesQuery.error && !(quizzesQuery.data ?? []).length ? (
                    <EmptyState title="Quizzes unavailable" description="Quizzes could not be loaded right now." compact />
                  ) : null}
                  {!quizzesQuery.isLoading && !quizzesQuery.error && !(quizzesQuery.data ?? []).length ? (
                    <EmptyState title="No quizzes for this course yet." compact />
                  ) : null}
                  {(quizzesQuery.data ?? []).length ? (
                    <div className="course-detail-shell__work-list">
                      {(quizzesQuery.data ?? []).map((quiz) => {
                        const presentation = getQuizPresentation(quiz);

                        return (
                          <article key={quiz.id} className="course-detail-shell__work-row">
                            <BookOpen size={18} />
                            <div className="course-detail-shell__work-copy">
                              <Typography.Text strong>{quiz.title}</Typography.Text>
                              <Typography.Text className="client-meta">
                                {quiz.questionCount} question{quiz.questionCount === 1 ? '' : 's'} - Passing score {quiz.passingScore}%
                              </Typography.Text>
                            </div>
                            <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
                            <span className="client-meta">{quiz.attemptsUsed}/{quiz.maxAttempts} attempts</span>
                            <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}/quizzes/${quiz.id}`)}>
                              {presentation.actionLabel}
                            </Button>
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </section>

                <section id="course-discussion" className="client-card course-detail-shell__section">
                  <div className="course-detail-shell__section-header">
                    <Typography.Title level={3} className="client-section-title">Discussion</Typography.Title>
                    <Typography.Paragraph className="client-meta">Open the course discussion space when you need help or context.</Typography.Paragraph>
                  </div>
                  <div className="course-detail-shell__discussion-panel">
                    <MessageSquareText size={22} />
                    <div>
                      <Typography.Text className="client-card-title">Course discussion is available.</Typography.Text>
                      <Typography.Paragraph className="client-meta">
                        Recent discussion preview is not included in the current course detail data.
                      </Typography.Paragraph>
                    </div>
                    <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}/discussion`)}>
                      Open discussion
                    </Button>
                  </div>
                </section>
              </main>

              <aside className="course-detail-shell__sidebar">
                <section className="client-card course-detail-shell__sidebar-card">
                  <Typography.Title level={4} className="client-card-title">Progress</Typography.Title>
                  {progressPercent !== null ? (
                    <>
                      <div className="course-detail-shell__sidebar-progress-value">{progressPercent}%</div>
                      <div className="course-detail-shell__progress-track">
                        <span className="course-detail-shell__progress-fill" style={{ width: `${progressPercent}%` }} />
                      </div>
                      <Typography.Text className="client-meta">
                        {completedLessons} of {totalLessons} lessons completed
                      </Typography.Text>
                    </>
                  ) : (
                    <Typography.Text className="client-meta">
                      Progress appears here when student progress data is available.
                    </Typography.Text>
                  )}
                </section>

                <section className="client-card course-detail-shell__sidebar-card">
                  <Typography.Title level={4} className="client-card-title">Next lesson</Typography.Title>
                  {nextLesson ? (
                    <>
                      <Typography.Text strong>{nextLesson.title}</Typography.Text>
                      <Button className="client-button client-button-primary" onClick={() => navigate(`/courses/${courseId}/learn/${nextLesson.id}`)}>
                        {progressPercent && progressPercent > 0 ? 'Continue' : 'Start'}
                      </Button>
                    </>
                  ) : (
                    <Typography.Text className="client-meta">No lessons available yet.</Typography.Text>
                  )}
                </section>

                <section className="client-card course-detail-shell__sidebar-card">
                  <Typography.Title level={4} className="client-card-title">Course work</Typography.Title>
                  <div className="course-detail-shell__sidebar-metrics">
                    <div><span className="client-meta">Assignments</span><strong>{submittedAssignments}/{assignmentsQuery.data?.length ?? 0}</strong></div>
                    <div><span className="client-meta">Quizzes</span><strong>{attemptedQuizzes}/{quizzesQuery.data?.length ?? 0}</strong></div>
                  </div>
                  {upcomingAssignment ? (
                    <div className="course-detail-shell__sidebar-note">
                      <CalendarDays size={16} />
                      <span>{upcomingAssignment.title} - Due {formatDate(upcomingAssignment.dueDate)}</span>
                    </div>
                  ) : (
                    <Typography.Text className="client-meta">No upcoming assignment due dates.</Typography.Text>
                  )}
                </section>
              </aside>
            </div>
          </div>
        ) : null}
      </ClientPageContainer>
    </ClientLayout>
  );
}

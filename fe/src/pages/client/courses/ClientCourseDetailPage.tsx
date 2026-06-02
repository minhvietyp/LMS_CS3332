import { useQuery } from '@tanstack/react-query';
import { Button, Collapse, Space, Typography } from 'antd';
import { ArrowLeft, ArrowRight, Clock3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { useAuth } from '../../../context/AuthContext';
import { CourseDetailSkeleton } from './components/CourseDetailSkeleton';
import { CourseDetailStatePanel } from './components/CourseDetailStatePanel';
import { listStudentCourseAssignmentsRequest } from '../../../services/api/assignmentApi';
import { listCourseResourcesRequest, listCoursesRequest, listPublishedCourseModulesRequest } from '../../../services/api/courseApi';
import { progressService } from '../../../services/api/progressService';
import { listStudentCourseQuizzesRequest } from '../../../services/api/quizApi';
import './ClientCourseDetailPage.css';

type CurriculumLessonState = 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'UNAVAILABLE';
type AssessmentState = 'AVAILABLE' | 'DUE_SOON' | 'OVERDUE' | 'SUBMITTED' | 'GRADED' | 'ATTEMPTS_REMAINING' | 'NO_ATTEMPTS_LEFT';

function getInstructorInitials(name?: string | null) {
  if (!name) return 'IU';

  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getCourseCategory(title: string, description?: string | null) {
  const source = `${title} ${description ?? ''}`.toLowerCase();

  if (source.includes('react') || source.includes('frontend') || source.includes('ui')) return 'Frontend';
  if (source.includes('api') || source.includes('backend') || source.includes('server')) return 'Backend';
  if (source.includes('data') || source.includes('analytics')) return 'Data';
  if (source.includes('design') || source.includes('ux')) return 'Design';
  if (source.includes('cloud') || source.includes('architecture') || source.includes('distributed')) return 'Architecture';

  return 'General';
}

function getCourseLevel(title: string, description?: string | null) {
  const source = `${title} ${description ?? ''}`.toLowerCase();

  if (source.includes('advanced') || source.includes('expert') || source.includes('architecture')) return 'Advanced';
  if (source.includes('foundation') || source.includes('intro') || source.includes('beginner')) return 'Beginner';

  return 'All Levels';
}

function getCourseLearningOutcomes(category: string, title: string, description?: string | null) {
  const source = `${title} ${description ?? ''}`.toLowerCase();
  const outcomes = new Set<string>();

  outcomes.add(`Understand the core ${category.toLowerCase()} concepts introduced throughout this course.`);
  outcomes.add('Move through structured modules and lessons with a clear learning path.');
  outcomes.add('Apply key ideas through course assessments, guided practice, or review activities.');

  if (source.includes('project') || source.includes('build') || source.includes('practical')) {
    outcomes.add('Translate the material into practical course work and applied learning tasks.');
  } else {
    outcomes.add('Build confidence with the material by revisiting lessons and tracking progress over time.');
  }

  if (source.includes('architecture') || source.includes('system') || source.includes('distributed')) {
    outcomes.add('Connect individual lessons to broader system thinking and structured technical decision-making.');
  }

  return Array.from(outcomes).slice(0, 5);
}

function getAudienceSummary(level: string) {
  if (level === 'Beginner') {
    return 'Designed for learners who want a clear starting point and a guided introduction to the subject.';
  }

  if (level === 'Advanced') {
    return 'Best suited for learners who already know the fundamentals and want deeper, more applied course work.';
  }

  return 'Suitable for general learners who want a structured course path and steady progress through the material.';
}

function getCurriculumLessonState(
  isStudent: boolean,
  lesson: { id: string; isPublished: boolean },
  progressItem?: { isCompleted?: boolean },
  nextLearningLessonId?: string | null,
): CurriculumLessonState {
  if (isStudent && !lesson.isPublished) return 'UNAVAILABLE';
  if (progressItem?.isCompleted) return 'COMPLETED';
  if (nextLearningLessonId && lesson.id === nextLearningLessonId) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

function getCurriculumLessonPresentation(state: CurriculumLessonState) {
  switch (state) {
    case 'COMPLETED':
      return {
        label: 'Completed',
        badgeClassName: 'course-detail-shell__lesson-status course-detail-shell__lesson-status--completed',
        actionLabel: 'Review',
        actionClassName: 'client-button client-button-ghost',
      };
    case 'IN_PROGRESS':
      return {
        label: 'In Progress',
        badgeClassName: 'course-detail-shell__lesson-status course-detail-shell__lesson-status--progress',
        actionLabel: 'Continue',
        actionClassName: 'client-button client-button-primary',
      };
    case 'UNAVAILABLE':
      return {
        label: 'Unavailable',
        badgeClassName: 'course-detail-shell__lesson-status course-detail-shell__lesson-status--unavailable',
        actionLabel: 'Locked',
        actionClassName: 'client-button client-button-ghost',
      };
    default:
      return {
        label: 'Not Started',
        badgeClassName: 'course-detail-shell__lesson-status course-detail-shell__lesson-status--not-started',
        actionLabel: 'Start',
        actionClassName: 'client-button client-button-secondary',
      };
  }
}

function getAssessmentBadgeClassName(state: AssessmentState) {
  switch (state) {
    case 'GRADED':
      return 'course-detail-shell__assessment-status course-detail-shell__assessment-status--graded';
    case 'SUBMITTED':
      return 'course-detail-shell__assessment-status course-detail-shell__assessment-status--submitted';
    case 'DUE_SOON':
      return 'course-detail-shell__assessment-status course-detail-shell__assessment-status--due-soon';
    case 'OVERDUE':
      return 'course-detail-shell__assessment-status course-detail-shell__assessment-status--overdue';
    case 'ATTEMPTS_REMAINING':
      return 'course-detail-shell__assessment-status course-detail-shell__assessment-status--progress';
    case 'NO_ATTEMPTS_LEFT':
      return 'course-detail-shell__assessment-status course-detail-shell__assessment-status--muted';
    default:
      return 'course-detail-shell__assessment-status course-detail-shell__assessment-status--available';
  }
}

function getCourseStatusBadgeClassName(statusLabel: string) {
  switch (statusLabel) {
    case 'Completed':
      return 'client-badge client-badge-success';
    case 'In Progress':
      return 'client-badge client-badge-info';
    case 'Draft':
      return 'client-badge client-badge-warning';
    case 'Archived':
      return 'client-badge';
    default:
      return 'client-badge client-badge-info';
  }
}

function getAssignmentPreviewPresentation(assignment: {
  dueDate?: string | null;
  allowLateSubmission: boolean;
  submissions: Array<{ status: string; isLate: boolean; grade?: number | null }>;
}) {
  const latestSubmission = assignment.submissions[0] ?? null;
  const dueTime = assignment.dueDate ? new Date(assignment.dueDate).getTime() : null;
  const now = Date.now();
  const isOverdue = dueTime != null && dueTime < now && !assignment.allowLateSubmission && !latestSubmission;
  const isDueSoon = dueTime != null && dueTime >= now && dueTime - now <= 1000 * 60 * 60 * 72 && !latestSubmission;

  if (latestSubmission?.status === 'GRADED' || latestSubmission?.status === 'RETURNED') {
    return {
      state: 'GRADED' as const,
      label: latestSubmission.grade != null ? `Graded ${latestSubmission.grade}%` : 'Graded',
      actionLabel: 'Review',
    };
  }

  if (latestSubmission) {
    return {
      state: 'SUBMITTED' as const,
      label: 'Submitted',
      actionLabel: 'Review',
    };
  }

  if (isOverdue) {
    return {
      state: 'OVERDUE' as const,
      label: 'Overdue',
      actionLabel: 'View Details',
    };
  }

  if (isDueSoon) {
    return {
      state: 'DUE_SOON' as const,
      label: 'Due Soon',
      actionLabel: 'Submit',
    };
  }

  if (assignment.dueDate) {
    return {
      state: 'AVAILABLE' as const,
      label: 'Not Submitted',
      actionLabel: 'Submit',
    };
  }

  return {
    state: 'AVAILABLE' as const,
    label: 'Available',
    actionLabel: 'Submit',
  };
}

function getQuizPreviewPresentation(quiz: { attemptsUsed: number; attemptsRemaining: number }) {
  if (quiz.attemptsRemaining <= 0 && quiz.attemptsUsed > 0) {
    return {
      state: 'NO_ATTEMPTS_LEFT' as const,
      label: 'No Attempts Left',
      actionLabel: 'Review Result',
    };
  }

  if (quiz.attemptsUsed > 0 && quiz.attemptsRemaining > 0) {
    return {
      state: 'ATTEMPTS_REMAINING' as const,
      label: 'Attempts Remaining',
      actionLabel: 'Continue',
    };
  }

  if (quiz.attemptsRemaining > 0) {
    return {
      state: 'AVAILABLE' as const,
      label: 'Available',
      actionLabel: 'Start Quiz',
    };
  }

  return {
    state: 'NO_ATTEMPTS_LEFT' as const,
    label: 'View Details',
    actionLabel: 'View Details',
  };
}

function getProgressRingStyle(percentage: number): CSSProperties {
  return {
    ['--course-progress' as string]: `${percentage}%`,
  };
}

function getRelativeDeadlineLabel(date: string) {
  const now = Date.now();
  const target = new Date(date).getTime();
  const diffMs = target - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Past due';
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `Due in ${diffDays} days`;
}

export function ClientCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const courseQuery = useQuery({
    queryKey: ['courses', 'client-detail', courseId],
    queryFn: async () => {
      const response = await listCoursesRequest({ page: 1, limit: 100 });
      return response.data.find((course) => course.id === courseId) ?? null;
    },
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });
  const course = courseQuery.data;

  const modulesQuery = useQuery({
    queryKey: ['courses', 'client-modules', courseId],
    queryFn: () => listPublishedCourseModulesRequest(courseId!),
    enabled: Boolean(course?.id),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const quizzesQuery = useQuery({
    queryKey: ['courses', 'client-quizzes', courseId],
    queryFn: () => listStudentCourseQuizzesRequest(courseId!),
    enabled: Boolean(course?.id) && user?.role === 'STUDENT',
    staleTime: 60 * 1000,
    retry: 1,
  });

  const assignmentsQuery = useQuery({
    queryKey: ['courses', 'client-assignments', courseId],
    queryFn: () => listStudentCourseAssignmentsRequest(courseId!),
    enabled: Boolean(course?.id) && user?.role === 'STUDENT',
    staleTime: 60 * 1000,
    retry: 1,
  });

  const progressQuery = useQuery({
    queryKey: ['courses', 'client-progress', courseId],
    queryFn: () => progressService.getMyCourseProgress(courseId!),
    enabled: Boolean(course?.id) && user?.role === 'STUDENT',
    staleTime: 30 * 1000,
    retry: 1,
  });

  const resourcesQuery = useQuery({
    queryKey: ['courses', 'client-resources', courseId],
    queryFn: () => listCourseResourcesRequest(courseId!),
    enabled: Boolean(course?.id),
    staleTime: 60 * 1000,
    retry: 1,
  });
  const modules = modulesQuery.data ?? [];
  const quizzes = quizzesQuery.data ?? [];
  const assignments = assignmentsQuery.data ?? [];
  const allLessons = (modulesQuery.data ?? []).flatMap((module) => module.lessons);
  const progressByLessonId = new Map((progressQuery.data?.lessons ?? []).map((lesson) => [lesson.lessonId, lesson]));
  const nextLearningLesson = allLessons.find((lesson) => !progressByLessonId.get(lesson.id)?.isCompleted) ?? allLessons[0] ?? null;
  const currentLessonIndex = nextLearningLesson ? allLessons.findIndex((lesson) => lesson.id === nextLearningLesson.id) : -1;
  const followingLesson = currentLessonIndex >= 0 ? allLessons[currentLessonIndex + 1] ?? null : null;
  const completionPercent = progressQuery.data?.totalLessons
    ? Math.round((progressQuery.data.completedLessons / progressQuery.data.totalLessons) * 100)
    : 0;
  const completedLessonsCount = progressQuery.data?.completedLessons ?? 0;
  const totalLessonsCount = progressQuery.data?.totalLessons ?? allLessons.length;
  const remainingLessonsCount = Math.max(totalLessonsCount - completedLessonsCount, 0);
  const completedModulesCount = modules.filter(
    (module) => module.lessons.length > 0 && module.lessons.every((lesson) => progressByLessonId.get(lesson.id)?.isCompleted),
  ).length;
  const nextMilestoneModule = modules.find(
    (module) =>
      module.lessons.length > 0 && module.lessons.some((lesson) => !progressByLessonId.get(lesson.id)?.isCompleted),
  );
  const currentRoadmapModuleId = nextMilestoneModule?.id ?? null;
  const moduleCompletionLabel = modules.length ? `${completedModulesCount} of ${modules.length} modules complete` : 'No modules available yet';
  const milestoneLabel = nextMilestoneModule
    ? `Finish Module ${nextMilestoneModule.orderIndex + 1}`
    : modules.length
      ? 'All modules completed'
      : 'Curriculum will be available soon';
  const category = course ? getCourseCategory(course.title, course.description) : 'General';
  const level = course ? getCourseLevel(course.title, course.description) : 'All Levels';
  const learningOutcomes = course ? getCourseLearningOutcomes(category, course.title, course.description) : [];
  const isStudent = user?.role === 'STUDENT';
  const hasProgress = user?.role === 'STUDENT' && progressQuery.data && progressQuery.data.totalLessons > 0;
  const isCompleted = Boolean(hasProgress && completionPercent >= 100);
  const courseStatusLabel = isCompleted
    ? 'Completed'
    : hasProgress && completionPercent > 0
      ? 'In Progress'
      : course?.status === 'ARCHIVED'
        ? 'Archived'
        : course?.status === 'DRAFT'
          ? 'Draft'
          : 'Available';
  const primaryActionLabel = hasProgress && completionPercent > 0 ? 'Continue Learning' : 'Start Learning';
  const canViewInstructor = Boolean(course?.instructor?.id);
  const submittedAssignmentsCount = assignments.filter((assignment) => assignment.submissions.length > 0).length;
  const attemptedQuizzesCount = quizzes.filter((quiz) => quiz.attemptsUsed > 0).length;
  const courseMaterials = resourcesQuery.data?.materials ?? [];
  const hasPublishedMaterials = courseMaterials.length > 0 && !resourcesQuery.error;
  const resourceDeadlineItems = [
    ...assignments
      .filter((assignment) => Boolean(assignment.dueDate))
      .map((assignment) => {
        const presentation = getAssignmentPreviewPresentation(assignment);
        return {
          id: `assignment-${assignment.id}`,
          kind: 'Assignment',
          title: assignment.title,
          detail: assignment.dueDate ? getRelativeDeadlineLabel(assignment.dueDate) : 'No due date',
          badgeLabel: presentation.label,
          badgeClassName: getAssessmentBadgeClassName(presentation.state),
          actionLabel: 'View Assignment',
          onClick: () => navigate(`/courses/${courseId}/assignments/${assignment.id}`),
          sortValue: assignment.dueDate ? new Date(assignment.dueDate).getTime() : Number.MAX_SAFE_INTEGER,
        };
      }),
    ...quizzes
      .filter((quiz) => quiz.attemptsRemaining > 0)
      .map((quiz) => {
        const presentation = getQuizPreviewPresentation(quiz);
        return {
          id: `quiz-${quiz.id}`,
          kind: 'Quiz',
          title: quiz.title,
          detail: 'Available now',
          badgeLabel: presentation.label,
          badgeClassName: getAssessmentBadgeClassName(presentation.state),
          actionLabel: 'Open Quiz',
          onClick: () => navigate(`/courses/${courseId}/quizzes/${quiz.id}`),
          sortValue: Number.MAX_SAFE_INTEGER - 1,
        };
      }),
  ]
    .sort((left, right) => left.sortValue - right.sortValue)
    .slice(0, 4);
  const nextAssessmentItem = resourceDeadlineItems[0] ?? null;
  const nextModuleLabel = nextMilestoneModule
    ? `Module ${nextMilestoneModule.orderIndex + 1}: ${nextMilestoneModule.title}`
    : modules.length
      ? 'All modules complete'
      : 'Curriculum coming soon';
  const [expandedModuleKeys, setExpandedModuleKeys] = useState<string[]>([]);
  const [courseToolsExpandedKeys, setCourseToolsExpandedKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!currentRoadmapModuleId) {
      return;
    }

    setExpandedModuleKeys((currentKeys) => (currentKeys.length ? currentKeys : [currentRoadmapModuleId]));
  }, [currentRoadmapModuleId]);
  const getCollapseKeys = (keys: string | string[] | number | number[] | undefined) => {
    if (Array.isArray(keys)) {
      return keys.map(String);
    }

    if (keys == null) {
      return [];
    }

    return [String(keys)];
  };
  const courseToolsCollapseItems = useMemo(
    () => [
      {
        key: 'course-tools',
        label: (
          <div className="course-detail-shell__accordion-label">
            <div className="course-detail-shell__accordion-heading">
              <Typography.Title level={4} className="client-card-title">
                Course Tools
              </Typography.Title>
              <Typography.Text className="client-meta">
                Open the core course routes only when you need them.
              </Typography.Text>
            </div>
          </div>
        ),
        children: (
          <div className="course-detail-shell__sidebar-action-grid">
            <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}/assignments`)}>
              Assignments
            </Button>
            <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}/quizzes`)}>
              Quizzes
            </Button>
            <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}/announcements`)}>
              Announcements
            </Button>
            <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}/discussion`)}>
              Discussion
            </Button>
          </div>
        ),
      },
    ],
    [courseId, navigate],
  );

  const roadmapCollapseItems = useMemo(
    () =>
      modules.map((module) => {
        const completedModuleLessons = module.lessons.filter((lesson) => progressByLessonId.get(lesson.id)?.isCompleted).length;
        const moduleProgressPercent = module.lessons.length
          ? Math.round((completedModuleLessons / module.lessons.length) * 100)
          : 0;

        return {
          key: module.id,
          className: `course-detail-shell__module-card${currentRoadmapModuleId === module.id ? ' course-detail-shell__module-card--current' : ''}`,
          label: (
            <div className="course-detail-shell__accordion-label course-detail-shell__accordion-label--module">
              <div className="course-detail-shell__module-heading">
                <Typography.Text className="client-caption course-detail-shell__module-index">
                  Module {module.orderIndex + 1}
                </Typography.Text>
                <Typography.Title level={4} className="client-card-title">
                  {module.title}
                </Typography.Title>
              </div>
              <div className="course-detail-shell__module-summary">
                <span className="course-detail-shell__module-summary-item">
                  <span className="client-meta">Lessons:</span>
                  <strong>{module.lessons.length}</strong>
                </span>
                <span className="course-detail-shell__module-summary-item">
                  <span className="client-meta">Completed:</span>
                  <strong>
                    {completedModuleLessons}/{module.lessons.length}
                  </strong>
                </span>
                <span className="course-detail-shell__module-summary-item">
                  <span className="client-meta">Progress:</span>
                  <strong>{moduleProgressPercent}%</strong>
                </span>
              </div>
            </div>
          ),
          children: (
            <div className="course-detail-shell__lesson-list">
              {module.lessons.map((lesson) => {
                const lessonProgress = progressByLessonId.get(lesson.id);
                const lessonState = getCurriculumLessonState(isStudent, lesson, lessonProgress, nextLearningLesson?.id ?? null);
                const lessonPresentation = getCurriculumLessonPresentation(lessonState);
                const isCurrentLesson = Boolean(nextLearningLesson && lesson.id === nextLearningLesson.id && lessonState !== 'COMPLETED');
                const lessonTypeLabel = lesson.videoUrl ? 'Video lesson' : 'Lesson workspace';

                return (
                  <article
                    key={lesson.id}
                    className={`course-detail-shell__lesson-row${isCurrentLesson ? ' course-detail-shell__lesson-row--current' : ''}${lessonState === 'UNAVAILABLE' ? ' course-detail-shell__lesson-row--unavailable' : ''}`}
                  >
                    <div className={`course-detail-shell__lesson-indicator course-detail-shell__lesson-indicator--${lessonState.toLowerCase().replace('_', '-')}`}>
                      <span className="course-detail-shell__lesson-indicator-dot" aria-hidden="true" />
                    </div>
                    <div className="course-detail-shell__lesson-main">
                      <div className="course-detail-shell__lesson-heading">
                        <Typography.Text strong>{lesson.title}</Typography.Text>
                        {isCurrentLesson ? <span className="client-badge client-badge-info">Current lesson</span> : null}
                      </div>
                      <div className="course-detail-shell__lesson-meta-row">
                        <Typography.Text className="client-meta">{lessonTypeLabel}</Typography.Text>
                        <span className={lessonPresentation.badgeClassName}>{lessonPresentation.label}</span>
                        {!lesson.isPublished ? (
                          <Typography.Text className="client-meta">Published access required</Typography.Text>
                        ) : null}
                      </div>
                    </div>
                    <div className="course-detail-shell__lesson-actions">
                      {isStudent ? (
                        <Button
                          className={lessonPresentation.actionClassName}
                          disabled={lessonState === 'UNAVAILABLE'}
                          onClick={() => navigate(`/courses/${courseId}/learn/${lesson.id}`)}
                          aria-label={`${lessonPresentation.actionLabel} ${lesson.title}`}
                        >
                          {lessonPresentation.actionLabel}
                        </Button>
                      ) : (
                        <Typography.Text className="client-meta">{lesson.isPublished ? 'Published lesson' : 'Draft lesson'}</Typography.Text>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ),
        };
      }),
    [courseId, currentRoadmapModuleId, isStudent, modules, navigate, nextLearningLesson, progressByLessonId],
  );
  const isInitialLoading = courseQuery.isLoading;
  const isCourseNotFound = !isInitialLoading && !courseQuery.error && !course;
  const isEmptyCourse =
    Boolean(course) &&
    !course?.title?.trim() &&
    !course?.description?.trim() &&
    !course?.instructor?.name &&
    modules.length === 0;
  const hasCurriculum = modules.length > 0;
  const assessmentsLoading = user?.role === 'STUDENT' && (assignmentsQuery.isLoading || quizzesQuery.isLoading);
  const hasAssessments = assignments.length > 0 || quizzes.length > 0;
  const curriculumUnavailable = Boolean(modulesQuery.error) && !hasCurriculum;
  const assessmentsUnavailable = user?.role === 'STUDENT' && Boolean(assignmentsQuery.error || quizzesQuery.error) && !hasAssessments;
  const showMaterialFallback = !courseMaterials.length || Boolean(resourcesQuery.error);
  const progressUnavailable = user?.role === 'STUDENT' && Boolean(progressQuery.error) && !progressQuery.data;
  const retryPage = () => {
    void courseQuery.refetch();
    void modulesQuery.refetch();
    void resourcesQuery.refetch();
    if (user?.role === 'STUDENT') {
      void quizzesQuery.refetch();
      void assignmentsQuery.refetch();
      void progressQuery.refetch();
    }
  };

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Course Detail"
        subtitle="Review the course structure and jump back into learning."
        actions={
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back to Catalog
          </Button>
        }
      >
        {isInitialLoading ? <CourseDetailSkeleton /> : null}
        {courseQuery.error ? (
          <CourseDetailStatePanel
            title="Course unavailable"
            description="We couldn't load this course right now."
            primaryActionLabel="Retry"
            onPrimaryAction={retryPage}
            secondaryActionLabel="Back to Catalog"
            onSecondaryAction={() => navigate('/courses')}
          />
        ) : null}
        {isCourseNotFound ? (
          <CourseDetailStatePanel
            title="Course not found"
            description="The course may have been removed or is no longer available."
            primaryActionLabel="Browse Courses"
            onPrimaryAction={() => navigate('/courses')}
            secondaryActionLabel="Back"
            onSecondaryAction={() => navigate(-1)}
          />
        ) : null}
        {isEmptyCourse ? (
          <CourseDetailStatePanel
            title="Course information is not available."
            description="This course exists, but the published course information is currently incomplete."
            primaryActionLabel="Browse Courses"
            onPrimaryAction={() => navigate('/courses')}
            secondaryActionLabel="Return to Dashboard"
            onSecondaryAction={() => navigate('/dashboard')}
          />
        ) : null}

        {course && !isEmptyCourse ? (
          <div className="client-section course-detail-shell">
            <section className="client-card client-section course-detail-shell__hero">
              <div className="course-detail-shell__hero-copy">
                <div className="course-detail-shell__hero-meta">
                  <Typography.Text className="client-caption course-detail-shell__eyebrow">
                    Course workspace
                  </Typography.Text>
                  <Space wrap className="course-detail-shell__hero-badges">
                    <span className="client-badge client-badge-info">{category}</span>
                    <span className="client-badge">{level}</span>
                    <span className={getCourseStatusBadgeClassName(courseStatusLabel)}>{courseStatusLabel}</span>
                  </Space>
                </div>
                <Typography.Title level={1} className="client-page-title course-detail-shell__hero-title">
                  {course.title}
                </Typography.Title>
                <Typography.Paragraph className="client-body">
                  {course.description || 'Review this course structure, reconnect with the material, and move into the next lesson with confidence.'}
                </Typography.Paragraph>
                <div className="course-detail-shell__hero-instructor">
                  <span className="course-detail-shell__hero-instructor-avatar" aria-hidden="true">
                    {getInstructorInitials(course.instructor?.name)}
                  </span>
                  <div className="course-detail-shell__hero-instructor-copy">
                    <Typography.Text className="client-meta">Taught by</Typography.Text>
                    <Typography.Text strong>{course.instructor?.name ?? 'Instructor unavailable'}</Typography.Text>
                  </div>
                </div>
                <div className="course-detail-shell__hero-workspace">
                  <div className="course-detail-shell__hero-workspace-card">
                    <span className="client-meta">Current progress</span>
                    <strong>{hasProgress ? `${completionPercent}% complete` : 'Ready to begin'}</strong>
                    <Typography.Text className="client-meta">
                      {completedLessonsCount} of {totalLessonsCount} lessons completed
                    </Typography.Text>
                  </div>
                  <div className="course-detail-shell__hero-workspace-card">
                    <span className="client-meta">Next lesson</span>
                    <strong>{nextLearningLesson?.title ?? 'Curriculum will appear soon'}</strong>
                    <Typography.Text className="client-meta">
                      {followingLesson ? `Then ${followingLesson.title}` : 'Return directly to the next lesson from here.'}
                    </Typography.Text>
                  </div>
                </div>
                <div className="course-detail-shell__hero-actions">
                  <Button
                    type="primary"
                    className="client-button client-button-primary"
                    onClick={() => {
                      if (nextLearningLesson) {
                        navigate(`/courses/${courseId}/learn/${nextLearningLesson.id}`);
                        return;
                      }

                      const curriculumTarget = document.getElementById('course-curriculum');
                      curriculumTarget?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    {primaryActionLabel}
                  </Button>
                  <Button
                    className="client-button client-button-secondary"
                    onClick={() => {
                      const curriculumTarget = document.getElementById('course-curriculum');
                      curriculumTarget?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    View Curriculum
                  </Button>
                  <Button
                    className="client-button client-button-ghost"
                    onClick={() => navigate('/courses')}
                  >
                    Back to Catalog
                  </Button>
                </div>
              </div>
              <div className="course-detail-shell__hero-summary">
                <div className="course-detail-shell__hero-summary-card">
                  <div className="course-detail-shell__hero-summary-header">
                    <Typography.Text className="client-caption">Continue from here</Typography.Text>
                    <Typography.Text className="client-card-title">
                      {nextLearningLesson ? nextLearningLesson.title : 'Start with the first published lesson'}
                    </Typography.Text>
                  </div>
                  <div className="course-detail-shell__hero-progress">
                    <div className="course-detail-shell__hero-progress-copy">
                      <Typography.Text className="client-meta">
                        {hasProgress ? `${completionPercent}% complete` : 'Progress begins with your first lesson'}
                      </Typography.Text>
                      <Typography.Text strong>
                        {progressQuery.data?.completedLessons ?? 0}/{progressQuery.data?.totalLessons ?? allLessons.length} lessons
                      </Typography.Text>
                    </div>
                    <div className="course-detail-shell__progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercent}>
                      <span className="course-detail-shell__progress-fill" style={{ width: `${completionPercent}%` }} />
                    </div>
                  </div>
                  <div className="course-detail-shell__hero-summary-list">
                    {nextAssessmentItem ? (
                      <span className="course-detail-shell__hero-summary-item">
                        <Clock3 size={15} />
                        Next assessment: {nextAssessmentItem.title}
                      </span>
                    ) : null}
                    <span className="course-detail-shell__hero-summary-item">
                      <Clock3 size={15} />
                      Updated {new Date(course.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="course-detail-shell__hero-next">
                    <Typography.Text className="client-meta">Next milestone</Typography.Text>
                    <Typography.Text strong>{nextModuleLabel}</Typography.Text>
                  </div>
                  <Button
                    type="primary"
                    className="client-button client-button-primary"
                    onClick={() => {
                      if (nextLearningLesson) {
                        navigate(`/courses/${courseId}/learn/${nextLearningLesson.id}`);
                        return;
                      }

                      navigate('/courses');
                    }}
                  >
                    {primaryActionLabel}
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            </section>

            <div className="course-detail-shell__layout">
              <main className="course-detail-shell__main">
                <section className="client-card client-section course-detail-shell__section course-detail-shell__section--overview">
                  <div className="client-section-header course-detail-shell__section-header">
                    <Typography.Title level={3} className="client-section-title">
                      Course Overview
                    </Typography.Title>
                    <Typography.Paragraph className="client-meta">
                      Reference information for the course content, expected outcomes, and learner fit.
                    </Typography.Paragraph>
                  </div>
                  <div className="course-detail-shell__overview-grid">
                    <div className="course-detail-shell__overview-column">
                      <div className="course-detail-shell__overview-panel">
                        <Typography.Title level={4} className="client-card-title">
                          Course description
                        </Typography.Title>
                        <Typography.Paragraph className="client-body">
                          {course.description || 'A detailed course description will be available here as the course content expands.'}
                        </Typography.Paragraph>
                      </div>

                      <div className="course-detail-shell__overview-panel">
                        <Typography.Title level={4} className="client-card-title">
                          What you will learn
                        </Typography.Title>
                        {learningOutcomes.length ? (
                          <ul className="course-detail-shell__overview-list">
                            {learningOutcomes.map((outcome) => (
                              <li key={outcome} className="course-detail-shell__overview-list-item">
                                <span className="course-detail-shell__overview-list-marker" aria-hidden="true">•</span>
                                <span>{outcome}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <Typography.Text className="client-meta">
                            Learning outcomes will be available soon.
                          </Typography.Text>
                        )}
                      </div>
                    </div>

                    <div className="course-detail-shell__overview-column">
                      <div className="course-detail-shell__overview-panel">
                        <Typography.Title level={4} className="client-card-title">
                          Prerequisites
                        </Typography.Title>
                        <Typography.Text className="client-body">
                          No prerequisites required.
                        </Typography.Text>
                      </div>

                      <div className="course-detail-shell__overview-panel">
                        <Typography.Title level={4} className="client-card-title">
                          Who this course is for
                        </Typography.Title>
                        <Typography.Paragraph className="client-meta">
                          {getAudienceSummary(level)}
                        </Typography.Paragraph>
                      </div>

                      <div className="course-detail-shell__overview-panel course-detail-shell__overview-panel--compact">
                        <div className="course-detail-shell__overview-reference">
                          <span className="client-meta">Modules</span>
                          <strong>{modules.length}</strong>
                        </div>
                        <div className="course-detail-shell__overview-reference">
                          <span className="client-meta">Lessons</span>
                          <strong>{allLessons.length}</strong>
                        </div>
                        <div className="course-detail-shell__overview-reference">
                          <span className="client-meta">Assignments</span>
                          <strong>{assignments.length}</strong>
                        </div>
                        <div className="course-detail-shell__overview-reference">
                          <span className="client-meta">Quizzes</span>
                          <strong>{quizzes.length}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section id="course-curriculum" className="client-card client-section course-detail-shell__section course-detail-shell__section--curriculum">
                  <div className="client-section-header course-detail-shell__section-header">
                    <Typography.Title level={3} className="client-section-title">
                      Course Roadmap
                    </Typography.Title>
                    <Typography.Paragraph className="client-meta">
                      Move through each module in order, return to the current lesson, and review completed work when needed.
                    </Typography.Paragraph>
                  </div>

                  {modulesQuery.isLoading && !hasCurriculum ? (
                    <div className="course-detail-shell__curriculum-list" aria-live="polite">
                      {[0, 1].map((moduleIndex) => (
                        <article key={moduleIndex} className="course-detail-shell__module-card course-detail-shell__module-card--loading">
                          <span className="client-skeleton-block course-detail-shell__skeleton-section-title" />
                          <span className="client-skeleton-block course-detail-shell__skeleton-body" />
                          <div className="course-detail-shell__lesson-list">
                            {[0, 1, 2].map((lessonIndex) => (
                              <span key={lessonIndex} className="client-skeleton-block course-detail-shell__skeleton-lesson-row" />
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}

                  {!modulesQuery.isLoading && curriculumUnavailable ? (
                    <EmptyState
                      title="Curriculum unavailable"
                      description="Course lessons couldn't be loaded right now. Try again in a moment."
                      compact
                      className="course-detail-shell__section-empty"
                    />
                  ) : null}
                  {!modulesQuery.isLoading && !curriculumUnavailable && !hasCurriculum ? (
                    <EmptyState
                      title="Curriculum coming soon."
                      description="Course lessons have not been published yet."
                      compact
                      className="course-detail-shell__section-empty"
                    />
                  ) : null}

                  {hasCurriculum ? (
                    <Collapse
                      className="course-detail-shell__curriculum-accordion"
                      ghost
                      activeKey={expandedModuleKeys}
                      onChange={(keys) => setExpandedModuleKeys(getCollapseKeys(keys))}
                      items={roadmapCollapseItems}
                    />
                  ) : null}
                </section>

                <section className="client-card client-section course-detail-shell__section course-detail-shell__section--instructor">
                  <div className="client-section-header course-detail-shell__section-header">
                    <Typography.Title level={3} className="client-section-title">
                      Instructor
                    </Typography.Title>
                    <Typography.Paragraph className="client-meta">
                      Meet the instructor responsible for the course guidance and teaching direction.
                    </Typography.Paragraph>
                  </div>
                  {course.instructor?.name ? (
                    <div className="course-detail-shell__instructor-layout">
                      <article className="course-detail-shell__instructor-card">
                        <div className="course-detail-shell__instructor-identity">
                          {course.instructor.avatarUrl ? (
                            <img
                              src={course.instructor.avatarUrl}
                              alt={`${course.instructor.name} avatar`}
                              className="course-detail-shell__instructor-photo"
                            />
                          ) : (
                            <span
                              className="course-detail-shell__instructor-avatar"
                              aria-label={`${course.instructor.name} initials`}
                            >
                              {getInstructorInitials(course.instructor.name)}
                            </span>
                          )}
                          <div className="course-detail-shell__instructor-profile">
                            <Typography.Title level={4} className="client-card-title">
                              {course.instructor.name}
                            </Typography.Title>
                            <Typography.Text className="client-meta">
                              Course instructor
                            </Typography.Text>
                          </div>
                        </div>
                        <div className="course-detail-shell__instructor-actions">
                          {canViewInstructor ? (
                            <Button
                              className="client-button client-button-secondary"
                              onClick={() => navigate(`/instructors/${course.instructor!.id}`)}
                            >
                              View Instructor
                            </Button>
                          ) : null}
                        </div>
                      </article>
                      <article className="course-detail-shell__overview-panel course-detail-shell__instructor-relationship">
                        <Typography.Title level={4} className="client-card-title">
                          Course guidance
                        </Typography.Title>
                        <Typography.Paragraph className="client-meta">
                          This instructor leads the course and supports the learning path shown in the roadmap and assessments.
                        </Typography.Paragraph>
                        <Typography.Paragraph className="client-meta">
                          Course communication happens through discussion and announcements.
                        </Typography.Paragraph>
                      </article>
                    </div>
                  ) : (
                    <div className="course-detail-shell__placeholder">
                      <Typography.Title level={4} className="client-card-title">
                        Instructor information unavailable
                      </Typography.Title>
                      <Typography.Paragraph className="client-meta">
                        Instructor details will appear here when the course profile includes faculty information.
                      </Typography.Paragraph>
                    </div>
                  )}
                </section>

                <section className="client-card client-section course-detail-shell__section course-detail-shell__section--assessments">
                  <div className="client-section-header course-detail-shell__section-header">
                    <Typography.Title level={3} className="client-section-title">
                      Assessments
                    </Typography.Title>
                    <Typography.Paragraph className="client-meta">
                      Submit due work, start quiz attempts, and review what is already in progress.
                    </Typography.Paragraph>
                  </div>
                  <div className="course-detail-shell__section-content">
                    {user?.role === 'STUDENT' ? (
                      <div className="course-detail-shell__assessment-shell">
                        <div className="course-detail-shell__assessment-summary">
                          <div className="course-detail-shell__assessment-stat">
                            <span className="client-meta">Assignments</span>
                            <strong>{assignments.length}</strong>
                          </div>
                          <div className="course-detail-shell__assessment-stat">
                            <span className="client-meta">Quizzes</span>
                            <strong>{quizzes.length}</strong>
                          </div>
                          <div className="course-detail-shell__assessment-stat">
                            <span className="client-meta">Submitted</span>
                            <strong>{submittedAssignmentsCount}</strong>
                          </div>
                          <div className="course-detail-shell__assessment-stat">
                            <span className="client-meta">Attempted</span>
                            <strong>{attemptedQuizzesCount}</strong>
                          </div>
                        </div>

                        {!assessmentsLoading && !assessmentsUnavailable && !hasAssessments ? (
                          <EmptyState
                            title="No assessments available."
                            description="Assignments and quizzes will appear here when the course assessment plan is ready."
                            compact
                            className="course-detail-shell__assessment-empty"
                          />
                        ) : null}
                        {assessmentsUnavailable ? (
                          <EmptyState
                            title="Assessment details unavailable"
                            description="This course is available, but the assessment previews could not be loaded right now."
                            compact
                            className="course-detail-shell__assessment-empty"
                          />
                        ) : null}

                        <div className="course-detail-shell__assessment-grid">
                          <div className="course-detail-shell__assessment-block">
                            <div className="course-detail-shell__assessment-copy">
                              <Typography.Title level={4} className="client-card-title">Assignments</Typography.Title>
                            </div>
                            {assignmentsQuery.isLoading && !assignments.length ? (
                              <div className="course-detail-shell__assessment-loading" aria-live="polite">
                                <span className="client-skeleton-block course-detail-shell__skeleton-body" />
                                <span className="client-skeleton-block course-detail-shell__skeleton-assessment-row" />
                                <span className="client-skeleton-block course-detail-shell__skeleton-assessment-row" />
                              </div>
                            ) : null}
                            {!assignmentsQuery.isLoading && !assignmentsQuery.error && !assignments.length ? (
                              <EmptyState
                                title="No assignments available"
                                description="This course does not have any assignment work available yet."
                                compact
                                className="course-detail-shell__assessment-empty"
                              />
                            ) : null}
                            {assignmentsQuery.error && !assignments.length ? (
                              <EmptyState
                                title="Assignment preview unavailable"
                                description="Assignments couldn't be loaded right now."
                                compact
                                className="course-detail-shell__assessment-empty"
                              />
                            ) : null}
                            <div className="course-detail-shell__assessment-items">
                              {assignments.slice(0, 3).map((assignment) => {
                                const latestSubmission = assignment.submissions[0] ?? null;
                                const presentation = getAssignmentPreviewPresentation(assignment);

                                return (
                                  <article key={assignment.id} className="course-detail-shell__assessment-item">
                                    <div className="course-detail-shell__assessment-item-header">
                                      <div className="course-detail-shell__assessment-item-copy">
                                        <Typography.Text strong>{assignment.title}</Typography.Text>
                                        <Typography.Text className="client-meta">
                                          {assignment.dueDate ? getRelativeDeadlineLabel(assignment.dueDate) : 'No due date'}
                                        </Typography.Text>
                                        <div className="course-detail-shell__assessment-item-meta">
                                          <span className={getAssessmentBadgeClassName(presentation.state)}>
                                            {presentation.label}
                                          </span>
                                          {latestSubmission?.submittedAt ? (
                                            <Typography.Text className="client-meta">
                                              Latest submission {new Date(latestSubmission.submittedAt).toLocaleDateString()}
                                            </Typography.Text>
                                          ) : null}
                                        </div>
                                      </div>
                                      <div className="course-detail-shell__assessment-item-actions">
                                        <Button
                                          className={`client-button ${presentation.actionLabel === 'Submit' ? 'client-button-primary' : 'client-button-secondary'}`}
                                          onClick={() => navigate(`/courses/${courseId}/assignments/${assignment.id}`)}
                                        >
                                          {presentation.actionLabel}
                                        </Button>
                                      </div>
                                    </div>
                                    {!latestSubmission?.submittedAt && assignment.allowLateSubmission ? (
                                      <Typography.Text className="client-meta">
                                        Late submission allowed
                                      </Typography.Text>
                                    ) : null}
                                  </article>
                                );
                              })}
                            </div>
                            {assignments.length ? (
                              <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}/assignments`)}>
                                View All Assignments
                              </Button>
                            ) : null}
                          </div>

                          <div className="course-detail-shell__assessment-block">
                            <div className="course-detail-shell__assessment-copy">
                              <Typography.Title level={4} className="client-card-title">Quizzes</Typography.Title>
                            </div>
                            {quizzesQuery.isLoading && !quizzes.length ? (
                              <div className="course-detail-shell__assessment-loading" aria-live="polite">
                                <span className="client-skeleton-block course-detail-shell__skeleton-body" />
                                <span className="client-skeleton-block course-detail-shell__skeleton-assessment-row" />
                                <span className="client-skeleton-block course-detail-shell__skeleton-assessment-row" />
                              </div>
                            ) : null}
                            {!quizzesQuery.isLoading && !quizzesQuery.error && !quizzes.length ? (
                              <EmptyState
                                title="No quizzes available"
                                description="Quiz-based assessment will appear here when published for this course."
                                compact
                                className="course-detail-shell__assessment-empty"
                              />
                            ) : null}
                            {quizzesQuery.error && !quizzes.length ? (
                              <EmptyState
                                title="Quiz preview unavailable"
                                description="Quizzes couldn't be loaded right now."
                                compact
                                className="course-detail-shell__assessment-empty"
                              />
                            ) : null}
                            <div className="course-detail-shell__assessment-items">
                              {quizzes.slice(0, 3).map((quiz) => {
                                const presentation = getQuizPreviewPresentation(quiz);

                                return (
                                  <article key={quiz.id} className="course-detail-shell__assessment-item">
                                    <div className="course-detail-shell__assessment-item-header">
                                      <div className="course-detail-shell__assessment-item-copy">
                                        <Typography.Text strong>{quiz.title}</Typography.Text>
                                        <Typography.Text className="client-meta">
                                          {quiz.attemptsRemaining} attempts remaining
                                        </Typography.Text>
                                        <div className="course-detail-shell__assessment-item-meta">
                                          {quiz.passingScore != null ? (
                                            <Typography.Text className="client-meta">Passing score {quiz.passingScore}%</Typography.Text>
                                          ) : null}
                                          <span className={getAssessmentBadgeClassName(presentation.state)}>
                                            {presentation.label}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="course-detail-shell__assessment-item-actions">
                                        <Button
                                          className={`client-button ${
                                            presentation.actionLabel === 'Start Quiz' || presentation.actionLabel === 'Continue'
                                              ? 'client-button-primary'
                                              : 'client-button-secondary'
                                          }`}
                                          onClick={() => navigate(`/courses/${courseId}/quizzes/${quiz.id}`)}
                                        >
                                          {presentation.actionLabel}
                                        </Button>
                                      </div>
                                    </div>
                                    <Typography.Text className="client-meta">
                                      {quiz.attemptsUsed} used · {quiz.maxAttempts} total attempts
                                    </Typography.Text>
                                  </article>
                                );
                              })}
                            </div>
                            {quizzes.length ? (
                              <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}/quizzes`)}>
                                View All Quizzes
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="course-detail-shell__placeholder">
                        <Typography.Title level={4} className="client-card-title">
                          Assessments
                        </Typography.Title>
                        <Typography.Paragraph className="client-meta">
                          Assessment previews are currently optimized for student-facing course detail views.
                        </Typography.Paragraph>
                      </div>
                    )}
                  </div>
                </section>

                <section className="client-card client-section course-detail-shell__section course-detail-shell__section--resources">
                  <div className="client-section-header course-detail-shell__section-header">
                    <Typography.Title level={3} className="client-section-title">
                      Learning Tools
                    </Typography.Title>
                    <Typography.Paragraph className="client-meta">
                      Open course materials, jump into assignments, and move directly into the course spaces that support learning.
                    </Typography.Paragraph>
                  </div>
                  <div className="course-detail-shell__resource-shell">
                    <div className="course-detail-shell__resource-top-grid">
                      {resourcesQuery.isLoading && !courseMaterials.length ? (
                        <article className="course-detail-shell__resource-card" aria-live="polite">
                          <span className="client-skeleton-block course-detail-shell__skeleton-card-title" />
                          <span className="client-skeleton-block course-detail-shell__skeleton-body" />
                          <span className="client-skeleton-block course-detail-shell__skeleton-assessment-row" />
                          <span className="client-skeleton-block course-detail-shell__skeleton-assessment-row" />
                        </article>
                      ) : null}
                      {hasPublishedMaterials ? (
                        <article className="course-detail-shell__resource-card">
                          <div className="course-detail-shell__resource-copy">
                            <span className="client-badge client-badge-success">Course Materials</span>
                            <Typography.Title level={4} className="client-card-title">Course materials</Typography.Title>
                            <Typography.Paragraph className="client-meta">
                              Open the published lesson materials available in this course.
                            </Typography.Paragraph>
                          </div>
                          <div className="course-detail-shell__resource-material-list">
                            {courseMaterials.slice(0, 4).map((material) => (
                              <article key={material.id} className="course-detail-shell__resource-material-item">
                                <div className="course-detail-shell__resource-material-copy">
                                  <Typography.Text strong>{material.title}</Typography.Text>
                                  <Typography.Text className="client-meta">
                                    {material.moduleTitle} · {material.lessonTitle}
                                  </Typography.Text>
                                </div>
                                <a
                                  className="client-button client-button-secondary course-detail-shell__resource-link"
                                  href={material.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open {material.type}
                                </a>
                              </article>
                            ))}
                          </div>
                        </article>
                      ) : null}

                      <article className="course-detail-shell__resource-card">
                          <div className="course-detail-shell__resource-copy">
                            <span className="client-badge">Upcoming Deadlines</span>
                            <Typography.Title level={4} className="client-card-title">Assessment queue</Typography.Title>
                            <Typography.Paragraph className="client-meta">
                              Keep the next assignment due date or quiz attempt in view.
                            </Typography.Paragraph>
                          </div>
                        {resourceDeadlineItems.length ? (
                          <div className="course-detail-shell__resource-deadline-list">
                            {resourceDeadlineItems.map((item) => (
                              <article key={item.id} className="course-detail-shell__resource-deadline-item">
                                <div className="course-detail-shell__resource-deadline-copy">
                                  <Typography.Text strong>{item.title}</Typography.Text>
                                  <Typography.Text className="client-meta">
                                    {item.kind} · {item.detail}
                                  </Typography.Text>
                                </div>
                                <div className="course-detail-shell__resource-deadline-actions">
                                  <span className={item.badgeClassName}>{item.badgeLabel}</span>
                                  <Button className="client-button client-button-secondary" onClick={item.onClick}>
                                    {item.actionLabel}
                                  </Button>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="client-empty-state course-detail-shell__resource-intro">
                            <Typography.Text className="client-card-title">No upcoming deadlines.</Typography.Text>
                            <Typography.Text className="client-meta">
                              Deadlines and quiz availability will appear here when they are available in the course data.
                            </Typography.Text>
                          </div>
                        )}
                      </article>
                    </div>

                    {showMaterialFallback && !resourcesQuery.isLoading && !hasPublishedMaterials ? (
                      <EmptyState
                        title={resourcesQuery.error ? 'Resource materials unavailable' : 'Course resources are available through your learning tools.'}
                        description={
                          resourcesQuery.error
                            ? 'The shortcut hub is still available while course materials finish loading.'
                            : 'No additional course materials have been published yet. Use the quick actions and assessment queue below.'
                        }
                        compact
                        className="course-detail-shell__resource-intro"
                      />
                    ) : null}

                    <div className="course-detail-shell__resource-bottom-grid">
                        <article className="course-detail-shell__resource-card">
                          <div className="course-detail-shell__resource-copy">
                            <span className="client-badge client-badge-info">Learning tools</span>
                            <Typography.Title level={4} className="client-card-title">Course tools</Typography.Title>
                            <Typography.Paragraph className="client-meta">
                              Jump directly into the next learning workspace.
                            </Typography.Paragraph>
                          </div>
                        <div className="course-detail-shell__resource-action-grid">
                          <Button
                            className="client-button client-button-primary"
                            disabled={!nextLearningLesson}
                            onClick={() => {
                              if (nextLearningLesson) {
                                navigate(`/courses/${courseId}/learn/${nextLearningLesson.id}`);
                              }
                            }}
                          >
                            Continue Learning
                          </Button>
                          <Button
                            className="client-button client-button-secondary"
                            onClick={() => {
                              document.getElementById('course-curriculum')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                          >
                            View Curriculum
                          </Button>
                          <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}/assignments`)}>
                            View Assignments
                          </Button>
                          <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}/quizzes`)}>
                            View Quizzes
                          </Button>
                          <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}/discussion`)}>
                            Open Discussion
                          </Button>
                          <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}/announcements`)}>
                            View Announcements
                          </Button>
                        </div>
                      </article>

                        <article className="course-detail-shell__resource-card">
                          <div className="course-detail-shell__resource-copy">
                            <span className="client-badge">Learning Path</span>
                            <Typography.Title level={4} className="client-card-title">Course roadmap</Typography.Title>
                            <Typography.Paragraph className="client-meta">
                              Follow the current module sequence through the course.
                            </Typography.Paragraph>
                          </div>
                        <div className="course-detail-shell__learning-path">
                          {modules.length ? (
                            modules.map((module) => {
                              const isCompleted = module.lessons.length > 0 && module.lessons.every((lesson) => progressByLessonId.get(lesson.id)?.isCompleted);
                              const isCurrent = nextMilestoneModule?.id === module.id;
                              const marker = isCompleted ? '✓' : isCurrent ? '→' : '○';
                              const statusLabel = isCompleted ? 'Completed' : isCurrent ? 'Current module' : 'Upcoming';

                              return (
                                <div
                                  key={module.id}
                                  className={`course-detail-shell__learning-path-item${isCurrent ? ' course-detail-shell__learning-path-item--current' : ''}${isCompleted ? ' course-detail-shell__learning-path-item--completed' : ''}`}
                                >
                                  <span className="course-detail-shell__learning-path-marker" aria-hidden="true">
                                    {marker}
                                  </span>
                                  <div className="course-detail-shell__learning-path-copy">
                                    <Typography.Text strong>{module.title}</Typography.Text>
                                    <Typography.Text className="client-meta">{statusLabel}</Typography.Text>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="client-empty-state course-detail-shell__resource-intro">
                              <Typography.Text className="client-card-title">Learning path unavailable</Typography.Text>
                              <Typography.Text className="client-meta">
                                Module progress will appear here when the course curriculum is available.
                              </Typography.Text>
                            </div>
                          )}
                        </div>
                      </article>
                    </div>
                  </div>
                </section>
              </main>

              <aside className="course-detail-shell__sidebar">
                <section className="client-card course-detail-shell__sidebar-card course-detail-shell__sidebar-card--continue">
                  <div className="client-section-header course-detail-shell__section-header">
                    <Typography.Title level={4} className="client-card-title">
                      Continue Learning
                    </Typography.Title>
                    <Typography.Paragraph className="client-meta">
                      Jump back into the next lesson and keep the course path moving.
                    </Typography.Paragraph>
                  </div>
                  {progressUnavailable ? (
                    <div className="course-detail-shell__achievement-note">
                      <Typography.Text className="client-card-title">Progress unavailable</Typography.Text>
                      <Typography.Text className="client-meta">
                        We couldn't load your course progress right now. The curriculum and quick actions are still available.
                      </Typography.Text>
                    </div>
                  ) : user?.role === 'STUDENT' && nextLearningLesson ? (
                    <div className="course-detail-shell__continue-card">
                      <div className="course-detail-shell__continue-highlight">
                        <span className="client-badge client-badge-info">
                          {hasProgress && completionPercent > 0 ? 'Current lesson' : 'Starting point'}
                        </span>
                        <Typography.Text className="client-card-title">{nextLearningLesson.title}</Typography.Text>
                        <Typography.Text className="client-meta">
                          {hasProgress && completionPercent > 0
                            ? 'Resume from the next incomplete lesson in your course path.'
                            : 'Begin the course from the first available lesson.'}
                        </Typography.Text>
                      </div>
                      <div className="course-detail-shell__continue-grid">
                        <div className="course-detail-shell__continue-stat">
                          <span className="client-meta">Completion</span>
                          <strong>{completionPercent}%</strong>
                        </div>
                        <div className="course-detail-shell__continue-stat">
                          <span className="client-meta">Next lesson</span>
                          <strong>{followingLesson?.title ?? 'Continue through the current lesson'}</strong>
                        </div>
                      </div>
                      <div className="course-detail-shell__continue-actions">
                        <Button
                          className="client-button client-button-primary"
                          onClick={() => navigate(`/courses/${courseId}/learn/${nextLearningLesson.id}`)}
                        >
                          Continue Learning
                        </Button>
                        <Button
                          className="client-button client-button-secondary"
                          onClick={() => {
                            document.getElementById('course-curriculum')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                        >
                          View Curriculum
                        </Button>
                      </div>
                    </div>
                  ) : user?.role === 'STUDENT' ? (
                    <div className="course-detail-shell__achievement-note">
                      <Typography.Text className="client-card-title">Ready to begin</Typography.Text>
                      <Typography.Text className="client-meta">
                        Lesson progress will appear here as soon as the curriculum is available.
                      </Typography.Text>
                    </div>
                  ) : (
                    <div className="course-detail-shell__placeholder">
                      <Typography.Text className="client-meta">
                        Continue-learning guidance is reserved here for student-facing course detail views.
                      </Typography.Text>
                    </div>
                  )}
                </section>

                <section className="client-card course-detail-shell__sidebar-card course-detail-shell__sidebar-card--progress">
                  <div className="client-section-header course-detail-shell__section-header">
                    <Typography.Title level={4} className="client-card-title">
                      Progress Snapshot
                    </Typography.Title>
                    <Typography.Paragraph className="client-meta">
                      Track lesson completion, remaining work, and the next milestone in the course.
                    </Typography.Paragraph>
                  </div>
                  {progressUnavailable ? (
                    <div className="course-detail-shell__achievement-note">
                      <Typography.Text className="client-card-title">Progress tracking unavailable</Typography.Text>
                      <Typography.Text className="client-meta">
                        Lesson progress, milestones, and completion insights will return when progress data becomes available again.
                      </Typography.Text>
                    </div>
                  ) : user?.role === 'STUDENT' ? (
                    <div className="course-detail-shell__progress-summary">
                      <div className="course-detail-shell__progress-ring-shell">
                        <div
                          className="course-detail-shell__progress-ring"
                          style={getProgressRingStyle(completionPercent)}
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={completionPercent}
                          aria-label={`Course progress ${completionPercent}%`}
                        >
                          <div className="course-detail-shell__progress-ring-inner">
                            <strong>{completionPercent}%</strong>
                            <span className="client-caption">Complete</span>
                          </div>
                        </div>
                        <div className="course-detail-shell__progress-summary-copy">
                          <Typography.Text className="client-card-title">
                            {completedLessonsCount} of {totalLessonsCount} lessons completed
                          </Typography.Text>
                          <Typography.Text className="client-meta">
                            {remainingLessonsCount} lesson{remainingLessonsCount === 1 ? '' : 's'} remaining
                          </Typography.Text>
                        </div>
                      </div>
                      <div className="course-detail-shell__progress-metrics">
                        <div className="course-detail-shell__progress-metric">
                          <span className="client-meta">Modules</span>
                          <strong>{moduleCompletionLabel}</strong>
                        </div>
                        <div className="course-detail-shell__progress-metric">
                          <span className="client-meta">Next milestone</span>
                          <strong>{milestoneLabel}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="course-detail-shell__placeholder">
                      <Typography.Text className="client-meta">
                        Progress snapshots are reserved here for student-facing course detail views.
                      </Typography.Text>
                    </div>
                  )}
                </section>

                <section className="client-card course-detail-shell__sidebar-card course-detail-shell__sidebar-card--actions">
                  <Collapse
                    className="course-detail-shell__tools-accordion"
                    ghost
                    activeKey={courseToolsExpandedKeys}
                    onChange={(keys) => setCourseToolsExpandedKeys(getCollapseKeys(keys))}
                    items={courseToolsCollapseItems}
                  />
                </section>
              </aside>
            </div>
          </div>
        ) : null}
      </ClientPageContainer>
    </ClientLayout>
  );
}


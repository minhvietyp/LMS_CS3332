import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { type ReactNode, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { LessonLearningLayout } from '../../../components/client-layout/layout/LessonLearningLayout';
import {
  getCourseByIdRequest,
  listCourseResourcesRequest,
  listPublishedCourseModulesRequest,
  type CourseLessonItem,
  type CourseModuleItem,
  type CourseResourceItem,
} from '../../../services/api/courseApi';
import { progressService, type StudentLessonProgressItem } from '../../../services/api/progressService';
import './learning-workspace.css';

type LessonWorkspaceStatus = 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | 'LOCKED';

type FlattenedLesson = {
  moduleId: string;
  moduleTitle: string;
  moduleOrder: number;
  lesson: CourseLessonItem;
};

function flattenLessons(modules: CourseModuleItem[]): FlattenedLesson[] {
  return modules
    .slice()
    .sort((left, right) => left.orderIndex - right.orderIndex)
    .flatMap((module) =>
      module.lessons
        .slice()
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map((lesson) => ({
          moduleId: module.id,
          moduleTitle: module.title,
          moduleOrder: module.orderIndex,
          lesson,
        })),
    );
}

function getLessonStatus(
  lesson: CourseLessonItem,
  currentLessonId: string,
  progressItem?: StudentLessonProgressItem,
): LessonWorkspaceStatus {
  if (!lesson.isPublished) return 'LOCKED';
  if (progressItem?.isCompleted) return 'COMPLETED';
  if (lesson.id === currentLessonId) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

function getStatusLabel(status: LessonWorkspaceStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'Completed';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'LOCKED':
      return 'Locked';
    default:
      return 'Not Started';
  }
}

function getStatusBadgeClassName(status: LessonWorkspaceStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'client-badge client-badge-success';
    case 'IN_PROGRESS':
      return 'client-badge client-badge-info';
    case 'LOCKED':
      return 'client-badge';
    default:
      return 'client-badge';
  }
}

function getSidebarActionLabel(status: LessonWorkspaceStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'Review';
    case 'IN_PROGRESS':
      return 'Continue';
    case 'LOCKED':
      return 'Locked';
    default:
      return 'Open';
  }
}

function getCompletionProgressValue(totalLessons: number, completedLessons: number) {
  if (!totalLessons) return 0;
  return Math.round((completedLessons / totalLessons) * 100);
}

function getProgressRingStyle(value: number) {
  return {
    ['--lesson-workspace-progress' as string]: `${Math.max(0, Math.min(value, 100))}%`,
  };
}

function formatLastActivity(value?: string | null) {
  if (!value) return 'No lesson activity yet';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getMaterialIcon(type: string) {
  switch (type) {
    case 'link':
      return <ExternalLink size={16} />;
    default:
      return <FileText size={16} />;
  }
}

function buildSkeleton() {
  return renderWorkspace(
    <LessonLearningLayout
      topBar={
        <div className="learning-workspace__skeleton learning-workspace__skeleton--header">
          <div className="learning-workspace__skeleton-line learning-workspace__skeleton-line--eyebrow" />
          <div className="learning-workspace__skeleton-line learning-workspace__skeleton-line--title" />
          <div className="learning-workspace__skeleton-line learning-workspace__skeleton-line--meta" />
        </div>
      }
      sidebar={
        <div className="learning-workspace__skeleton learning-workspace__skeleton--sidebar">
          <div className="learning-workspace__skeleton-line learning-workspace__skeleton-line--small" />
          <div className="learning-workspace__skeleton-block" />
          <div className="learning-workspace__skeleton-block" />
          <div className="learning-workspace__skeleton-block" />
        </div>
      }
      content={
        <div className="learning-workspace__body">
          <section className="client-card learning-workspace__panel">
            <div className="learning-workspace__skeleton learning-workspace__skeleton--viewer">
              <div className="learning-workspace__skeleton-video" />
              <div className="learning-workspace__skeleton-line learning-workspace__skeleton-line--meta" />
              <div className="learning-workspace__skeleton-line learning-workspace__skeleton-line--body" />
              <div className="learning-workspace__skeleton-line learning-workspace__skeleton-line--body" />
            </div>
          </section>
          <section className="client-card learning-workspace__panel">
            <div className="learning-workspace__skeleton learning-workspace__skeleton--materials">
              <div className="learning-workspace__skeleton-line learning-workspace__skeleton-line--small" />
              <div className="learning-workspace__skeleton-block" />
              <div className="learning-workspace__skeleton-block" />
            </div>
          </section>
        </div>
      }
      actionPanel={
        <div className="learning-workspace__skeleton learning-workspace__skeleton--actions">
          <div className="learning-workspace__skeleton-block" />
          <div className="learning-workspace__skeleton-block" />
          <div className="learning-workspace__skeleton-block" />
        </div>
      }
    />
  );
}

function renderWorkspace(layout: ReactNode) {
  return (
    <ClientLayout>
      <ClientPageContainer>
        {layout}
      </ClientPageContainer>
    </ClientLayout>
  );
}

export function ClientLessonViewerPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const courseQuery = useQuery({
    queryKey: ['client-lesson-course', courseId],
    queryFn: () => getCourseByIdRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });

  const modulesQuery = useQuery({
    queryKey: ['client-lesson-modules', courseId],
    queryFn: () => listPublishedCourseModulesRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });
  const resourcesQuery = useQuery({
    queryKey: ['client-lesson-resources', courseId],
    queryFn: () => listCourseResourcesRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });

  const progressQuery = useQuery({
    queryKey: ['client-lesson-progress', courseId],
    queryFn: () => progressService.getMyCourseProgress(courseId!),
    enabled: Boolean(courseId),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const markCompleteMutation = useMutation({
    mutationFn: (isCompleted: boolean) => progressService.markLessonComplete(lessonId!, isCompleted),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['client-lesson-progress', courseId] });
    },
  });

  const flattenedLessons = useMemo(() => flattenLessons(modulesQuery.data ?? []), [modulesQuery.data]);
  const currentLessonIndex = flattenedLessons.findIndex((item) => item.lesson.id === lessonId);
  const currentLessonItem = currentLessonIndex >= 0 ? flattenedLessons[currentLessonIndex] : null;
  const previousLesson = currentLessonIndex > 0 ? flattenedLessons[currentLessonIndex - 1]?.lesson ?? null : null;
  const nextLesson = currentLessonIndex >= 0 ? flattenedLessons[currentLessonIndex + 1]?.lesson ?? null : null;
  const progressMap = useMemo(
    () => new Map((progressQuery.data?.lessons ?? []).map((entry) => [entry.lessonId, entry])),
    [progressQuery.data?.lessons],
  );
  const currentProgressItem = currentLessonItem ? progressMap.get(currentLessonItem.lesson.id) : undefined;
  const currentStatus = currentLessonItem
    ? getLessonStatus(currentLessonItem.lesson, lessonId ?? '', currentProgressItem)
    : 'NOT_STARTED';
  const completionPercentage = getCompletionProgressValue(
    progressQuery.data?.totalLessons ?? flattenedLessons.length,
    progressQuery.data?.completedLessons ?? 0,
  );
  const completedLessonsCount = progressQuery.data?.completedLessons ?? 0;
  const totalLessonsCount = progressQuery.data?.totalLessons ?? flattenedLessons.length;
  const currentModuleLessons = currentLessonItem
    ? flattenedLessons.filter((item) => item.moduleId === currentLessonItem.moduleId)
    : [];
  const completedModuleLessons = currentModuleLessons.filter((item) => progressMap.get(item.lesson.id)?.isCompleted).length;
  const moduleCompletionCopy = currentModuleLessons.length
    ? `${completedModuleLessons} of ${currentModuleLessons.length} lessons complete`
    : 'No lesson progress yet';
  const materials = useMemo<CourseResourceItem[]>(
    () => resourcesQuery.data?.materials.filter((material) => material.lessonId === currentLessonItem?.lesson.id) ?? [],
    [currentLessonItem?.lesson.id, resourcesQuery.data?.materials],
  );
  const hasPlayableVideo = Boolean(currentLessonItem?.lesson.videoUrl);
  const hasContent = hasPlayableVideo || materials.length > 0;
  const progressUnavailable = progressQuery.isError && !progressQuery.data;
  const isInitialLoading = courseQuery.isLoading || modulesQuery.isLoading || resourcesQuery.isLoading;
  const hasPageError = Boolean(courseQuery.error || modulesQuery.error || resourcesQuery.error);
  const isLessonMissing = !isInitialLoading && !hasPageError && !currentLessonItem;
  const isCurrentLessonCompleted = currentStatus === 'COMPLETED';
  const primaryHeaderLabel = isCurrentLessonCompleted ? (nextLesson ? 'Next lesson' : 'Review lesson') : 'Mark complete';

  useEffect(() => {
    if (!lessonId || !currentLessonItem?.lesson.isPublished || currentStatus === 'COMPLETED') {
      return;
    }

    void progressService.setLessonState(lessonId, 'IN_PROGRESS');
  }, [currentLessonItem?.lesson.isPublished, currentStatus, lessonId]);

  const handleOpenLesson = (targetLesson: CourseLessonItem) => {
    navigate(`/courses/${courseId}/learn/${targetLesson.id}`);
  };

  const handlePrimaryHeaderAction = () => {
    if (isCurrentLessonCompleted) {
      if (nextLesson) {
        handleOpenLesson(nextLesson);
      }
      return;
    }

    void markCompleteMutation.mutateAsync(true);
  };

  const retryPage = () => {
    void courseQuery.refetch();
    void modulesQuery.refetch();
    void resourcesQuery.refetch();
    void progressQuery.refetch();
  };

  if (isInitialLoading) {
    return buildSkeleton();
  }

  if (hasPageError) {
    return renderWorkspace(
      <LessonLearningLayout
        content={
          <section className="client-card learning-workspace__panel learning-workspace__state-panel">
            <EmptyState
              title="Unable to load this lesson"
              description="The lesson workspace could not be loaded right now. Retry to restore the current course view."
              action={
                <Button className="client-button client-button-primary" onClick={retryPage}>
                  Retry
                </Button>
              }
            />
            <div className="learning-workspace__state-actions">
              <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}`)}>
                Back to Course
              </Button>
            </div>
          </section>
        }
      />
    );
  }

  if (isLessonMissing) {
    return renderWorkspace(
      <LessonLearningLayout
        content={
          <section className="client-card learning-workspace__panel learning-workspace__state-panel">
            <EmptyState
              title="Lesson not found"
              description="This lesson is no longer available in the current course sequence."
              action={
                <Button className="client-button client-button-primary" onClick={() => navigate(`/courses/${courseId}`)}>
                  Back to Course
                </Button>
              }
            />
          </section>
        }
      />
    );
  }

  if (!currentLessonItem || !courseQuery.data) {
    return null;
  }

  const topBar = (
    <section className="client-card learning-workspace__header-card">
      <div className="learning-workspace__header-copy">
        <div className="learning-workspace__header-meta">
          <Typography.Text className="client-caption">Course</Typography.Text>
          <Typography.Text className="client-meta">{courseQuery.data.title}</Typography.Text>
          <span className={getStatusBadgeClassName(currentStatus)}>{getStatusLabel(currentStatus)}</span>
        </div>
        <Typography.Title level={1} className="client-page-title learning-workspace__lesson-title">
          {currentLessonItem.lesson.title}
        </Typography.Title>
        <div className="learning-workspace__header-support">
          <Typography.Text className="client-meta">
            Module {currentLessonItem.moduleOrder + 1}: {currentLessonItem.moduleTitle}
          </Typography.Text>
          <Typography.Text className="client-meta">
            {progressUnavailable ? 'Progress unavailable' : `${completionPercentage}% course progress`}
          </Typography.Text>
          <Typography.Text className="client-meta">
            Last activity: {formatLastActivity(progressQuery.data?.lastProgressAt ?? currentProgressItem?.completedAt ?? null)}
          </Typography.Text>
        </div>
      </div>
      <div className="learning-workspace__header-actions">
        <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}`)}>
          Back to Course
        </Button>
        <Button
          className="client-button client-button-ghost"
          onClick={() => document.getElementById('lesson-curriculum')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          View Curriculum
        </Button>
        <Button
          className="client-button client-button-primary"
          loading={markCompleteMutation.isPending}
          disabled={currentStatus === 'LOCKED'}
          onClick={handlePrimaryHeaderAction}
        >
          {primaryHeaderLabel}
        </Button>
      </div>
    </section>
  );

  const sidebar = (
    <div className="learning-workspace__sidebar-shell" id="lesson-curriculum">
      <section className="client-card learning-workspace__sidebar-card">
        <div className="learning-workspace__sidebar-card-copy">
          <Typography.Text className="client-caption">Curriculum</Typography.Text>
          <Typography.Title level={4} className="client-card-title">
            Course roadmap
          </Typography.Title>
          <Typography.Text className="client-meta">{courseQuery.data.title}</Typography.Text>
        </div>
        <div className="learning-workspace__module-stack">
          {(modulesQuery.data ?? []).map((module) => {
            const lessons = module.lessons.slice().sort((left, right) => left.orderIndex - right.orderIndex);
            const isCurrentModule = module.id === currentLessonItem.moduleId;

            return (
              <article
                key={module.id}
                className={`learning-workspace__module-card${isCurrentModule ? ' learning-workspace__module-card--current' : ''}`}
              >
                <div className="learning-workspace__module-header">
                  <div className="learning-workspace__module-copy">
                    <Typography.Text className="client-caption">Module {module.orderIndex + 1}</Typography.Text>
                    <Typography.Text className="client-card-title">{module.title}</Typography.Text>
                  </div>
                  <Typography.Text className="client-meta">{lessons.length} lessons</Typography.Text>
                </div>
                <div className="learning-workspace__lesson-list">
                  {lessons.map((lesson) => {
                    const status = getLessonStatus(lesson, currentLessonItem.lesson.id, progressMap.get(lesson.id));
                    const isCurrentLesson = lesson.id === currentLessonItem.lesson.id;

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        aria-label={lesson.title}
                        disabled={status === 'LOCKED'}
                        className={`learning-workspace__lesson-row${isCurrentLesson ? ' learning-workspace__lesson-row--current' : ''}${status === 'COMPLETED' ? ' learning-workspace__lesson-row--completed' : ''}${status === 'LOCKED' ? ' learning-workspace__lesson-row--locked' : ''}`}
                        onClick={() => handleOpenLesson(lesson)}
                      >
                        <div className="learning-workspace__lesson-row-copy">
                          <Typography.Text className="learning-workspace__lesson-row-title">{lesson.title}</Typography.Text>
                          <Typography.Text className="client-meta">{getStatusLabel(status)}</Typography.Text>
                        </div>
                        <span className="learning-workspace__lesson-row-action">{getSidebarActionLabel(status)}</span>
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );

  const content = (
    <div className="learning-workspace__body">
      <section className="client-card learning-workspace__panel learning-workspace__panel--viewer">
        <div className="learning-workspace__panel-header">
          <div>
            <Typography.Text className="client-caption">Focus lesson</Typography.Text>
            <Typography.Title level={3} className="client-section-title">
              Lesson content
            </Typography.Title>
          </div>
        </div>

        {hasPlayableVideo ? (
          <div className="learning-workspace__media-shell">
            <video
              key={currentLessonItem.lesson.id}
              controls
              className="learning-workspace__video"
              src={currentLessonItem.lesson.videoUrl ?? undefined}
            />
          </div>
        ) : null}

        <div className="learning-workspace__lesson-copy">
          <Typography.Paragraph className="client-body">
            {hasPlayableVideo
              ? 'Use the lesson video and the attached materials below to move through this topic without leaving the workspace.'
              : hasContent
                ? 'This lesson currently uses attached materials instead of a video presentation.'
                : 'Lesson content is not available yet.'}
          </Typography.Paragraph>
          <div className="learning-workspace__lesson-meta-grid">
            <div className="learning-workspace__lesson-meta-card">
              <Typography.Text className="client-meta">Module progress</Typography.Text>
              <strong>{moduleCompletionCopy}</strong>
            </div>
            <div className="learning-workspace__lesson-meta-card">
              <Typography.Text className="client-meta">Lesson status</Typography.Text>
              <strong>{getStatusLabel(currentStatus)}</strong>
            </div>
          </div>
        </div>

        {!hasContent ? (
          <div className="learning-workspace__inline-state">
            <EmptyState
              title="Lesson content is not available yet."
              description="The lesson has been added to the curriculum, but no video or attached materials are available for this step yet."
              compact
            />
          </div>
        ) : null}
      </section>

      <section className="client-card learning-workspace__panel">
        <div className="learning-workspace__panel-header">
          <div>
            <Typography.Text className="client-caption">Resources</Typography.Text>
            <Typography.Title level={3} className="client-section-title">
              Lesson materials
            </Typography.Title>
          </div>
        </div>

        {materials.length ? (
          <div className="learning-workspace__material-list">
            {materials.map((material) => (
              <article key={material.id} className="learning-workspace__material-item">
                <div className="learning-workspace__material-copy">
                  <span className="learning-workspace__material-icon" aria-hidden="true">
                    {getMaterialIcon(material.type)}
                  </span>
                  <div className="learning-workspace__material-text">
                    <Typography.Text strong>{material.title}</Typography.Text>
                    <Typography.Text className="client-meta">{material.type.toUpperCase()}</Typography.Text>
                  </div>
                </div>
                <a
                  className="client-button client-button-ghost learning-workspace__material-link"
                  href={material.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={material.title}
                >
                  {material.type === 'link' ? 'Open resource' : 'Download'}
                  {material.type === 'link' ? <ExternalLink size={16} /> : <Download size={16} />}
                </a>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No materials attached to this lesson."
            description="This lesson currently does not include downloadable notes or external reading links."
            compact
          />
        )}
      </section>

      <section className="client-card learning-workspace__panel">
        <div className="learning-workspace__panel-header">
          <div>
            <Typography.Text className="client-caption">Next actions</Typography.Text>
            <Typography.Title level={3} className="client-section-title">
              Lesson controls
            </Typography.Title>
          </div>
        </div>

        <div className="learning-workspace__completion-shell">
          <div className="learning-workspace__completion-copy">
            <Typography.Text className={getStatusBadgeClassName(currentStatus)}>{getStatusLabel(currentStatus)}</Typography.Text>
            <Typography.Paragraph className="client-meta">
              {isCurrentLessonCompleted
                ? nextLesson
                  ? 'This lesson is complete. Continue into the next lesson or review the current material again.'
                  : 'This lesson is complete. Review the content or return to the course.'
                : 'Mark this lesson complete when you are ready to move forward in the course.'}
            </Typography.Paragraph>
            {markCompleteMutation.error ? (
              <div className="learning-workspace__mutation-state">
                <Typography.Text className="client-card-title">Unable to update lesson progress</Typography.Text>
                <Typography.Text className="client-meta">
                  Try again. Your lesson view is still available while progress catches up.
                </Typography.Text>
              </div>
            ) : null}
          </div>
          <div className="learning-workspace__footer-actions">
            <Button
              className="client-button client-button-secondary"
              disabled={!previousLesson}
              onClick={() => {
                if (previousLesson) {
                  handleOpenLesson(previousLesson);
                }
              }}
            >
              Previous lesson
            </Button>
            <Button
              className="client-button client-button-primary"
              loading={markCompleteMutation.isPending}
              disabled={currentStatus === 'LOCKED'}
              onClick={() => {
                if (isCurrentLessonCompleted) {
                  if (nextLesson) {
                    handleOpenLesson(nextLesson);
                  }
                  return;
                }

                void markCompleteMutation.mutateAsync(true);
              }}
            >
              {isCurrentLessonCompleted ? (nextLesson ? 'Next lesson' : 'Review lesson') : 'Mark lesson complete'}
            </Button>
            <Button
              className="client-button client-button-secondary"
              disabled={!nextLesson}
              onClick={() => {
                if (nextLesson) {
                  handleOpenLesson(nextLesson);
                }
              }}
            >
              Next lesson
            </Button>
            <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}`)}>
              Back to Course
            </Button>
          </div>
        </div>
      </section>
    </div>
  );

  const actionPanel = (
    <div className="learning-workspace__actions-shell">
      <section className="client-card learning-workspace__action-card learning-workspace__action-card--progress">
        <div className="learning-workspace__panel-header">
          <div>
            <Typography.Text className="client-caption">Progress</Typography.Text>
            <Typography.Title level={4} className="client-card-title">
              Course progress
            </Typography.Title>
          </div>
        </div>

        {progressUnavailable ? (
          <EmptyState
            title="Progress unavailable"
            description="Course completion will appear here when progress tracking is available again."
            compact
          />
        ) : (
          <div className="learning-workspace__progress-card">
            <div
              className="learning-workspace__progress-ring"
              style={getProgressRingStyle(completionPercentage)}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completionPercentage}
              aria-label={`Course progress ${completionPercentage}%`}
            >
              <div className="learning-workspace__progress-ring-inner">
                <strong>{completionPercentage}%</strong>
                <span className="client-caption">Complete</span>
              </div>
            </div>
            <div className="learning-workspace__progress-copy">
              <Typography.Text className="client-card-title">
                {completedLessonsCount} of {totalLessonsCount} lessons completed
              </Typography.Text>
              <Typography.Text className="client-meta">
                {currentModuleLessons.length ? `${currentModuleLessons.length} lessons in this module` : 'Course roadmap will appear here'}
              </Typography.Text>
            </div>
          </div>
        )}
      </section>

      <section className="client-card learning-workspace__action-card">
        <div className="learning-workspace__panel-header">
          <div>
            <Typography.Text className="client-caption">Up next</Typography.Text>
            <Typography.Title level={4} className="client-card-title">
              Next lesson
            </Typography.Title>
          </div>
        </div>
        {nextLesson ? (
          <div className="learning-workspace__next-card">
            <Typography.Text className="client-card-title">{nextLesson.title}</Typography.Text>
            <Typography.Text className="client-meta">
              Continue through the next published lesson in the current course path.
            </Typography.Text>
            <Button className="client-button client-button-primary" onClick={() => handleOpenLesson(nextLesson)}>
              Next lesson
            </Button>
          </div>
        ) : (
          <EmptyState
            title="No next lesson yet"
            description="This is the final lesson currently available in the course sequence."
            compact
          />
        )}
      </section>

      <section className="client-card learning-workspace__action-card">
        <div className="learning-workspace__panel-header">
          <div>
            <Typography.Text className="client-caption">Quick actions</Typography.Text>
            <Typography.Title level={4} className="client-card-title">
              Learning tools
            </Typography.Title>
          </div>
        </div>
        <div className="learning-workspace__quick-actions">
          <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}`)}>
            Back to Course
          </Button>
          <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}/assignments`)}>
            Assignments
          </Button>
          <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${courseId}/quizzes`)}>
            Quizzes
          </Button>
          <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}/discussion`)}>
            Discussion
          </Button>
        </div>
      </section>
    </div>
  );

  return renderWorkspace(
    <LessonLearningLayout topBar={topBar} sidebar={sidebar} content={content} actionPanel={actionPanel} />,
  );
}

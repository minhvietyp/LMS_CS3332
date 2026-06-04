import { Button, Typography } from 'antd';
import { BookOpen, CalendarDays, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CourseListItem } from '../../../../services/api/courseApi';
import type { CourseProgressItem } from '../../../../types/progress';
import { StatusBadge, type StatusTone } from '../../../../components/client-ui';

export type CourseCatalogStatus = 'available' | 'enrolled' | 'in-progress' | 'completed' | 'draft' | 'archived';

type CourseCatalogCardProps = {
  course: CourseListItem;
  status: CourseCatalogStatus;
  progress: CourseProgressItem | null;
  progressPercent: number | null;
};

type StatusPresentation = {
  label: string;
  tone: StatusTone;
};

const statusPresentation: Record<CourseCatalogStatus, StatusPresentation> = {
  available: { label: 'Available', tone: 'published' },
  enrolled: { label: 'Enrolled', tone: 'active' },
  'in-progress': { label: 'In progress', tone: 'in-progress' },
  completed: { label: 'Completed', tone: 'completed' },
  draft: { label: 'Draft', tone: 'draft' },
  archived: { label: 'Archived', tone: 'locked' },
};

function getPrimaryAction(status: CourseCatalogStatus) {
  if (status === 'completed') {
    return 'Review';
  }

  if (status === 'in-progress' || status === 'enrolled') {
    return 'Continue';
  }

  return 'View course';
}

function getUpdatedLabel(updatedAt: string) {
  const parsedDate = new Date(updatedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Recently updated';
  }

  return `Updated ${parsedDate.toLocaleDateString()}`;
}

export function CourseCatalogCard({
  course,
  status,
  progress,
  progressPercent,
}: CourseCatalogCardProps) {
  const navigate = useNavigate();
  const statusConfig = statusPresentation[status];
  const showProgress = progressPercent !== null && (status === 'enrolled' || status === 'in-progress' || status === 'completed');
  const lessonCount = progress?.totalLessons ?? null;

  return (
    <article className="client-course-card client-card client-card-hover">
      <div className="client-course-card__header">
        <StatusBadge tone={statusConfig.tone}>{statusConfig.label}</StatusBadge>
      </div>

      <div className="client-course-card__copy">
        <Typography.Title level={4} className="client-course-card__title">
          {course.title}
        </Typography.Title>
        <span className="client-course-card__instructor">
          <UserRound size={15} />
          {progress?.instructorName || course.instructor?.name || 'Instructor unavailable'}
        </span>
        <Typography.Paragraph className="client-course-card__description">
          {course.description || 'Course details are available on the full course page.'}
        </Typography.Paragraph>
      </div>

      {showProgress ? (
        <div className="client-course-card__progress">
          <div className="client-course-card__progress-copy">
            <span>Progress</span>
            <strong>{progressPercent}%</strong>
          </div>
          <div
            className="client-course-card__progress-track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent ?? 0}
            aria-label={`Course progress ${progressPercent ?? 0} percent`}
          >
            <span className="client-course-card__progress-fill" style={{ width: `${progressPercent ?? 0}%` }} />
          </div>
        </div>
      ) : null}

      <div className="client-course-card__meta">
        {lessonCount !== null && lessonCount > 0 ? (
          <span className="client-course-card__meta-item">
            <BookOpen size={15} />
            {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
          </span>
        ) : null}
        <span className="client-course-card__meta-item">
          <CalendarDays size={15} />
          {getUpdatedLabel(course.updatedAt)}
        </span>
      </div>

      <div className="client-course-card__footer">
        <Button
          type="primary"
          className="client-button client-button-primary"
          onClick={() => navigate(`/courses/${course.id}`)}
        >
          {getPrimaryAction(status)}
        </Button>
      </div>
    </article>
  );
}

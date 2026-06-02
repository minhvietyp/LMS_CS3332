import { Button, Typography } from 'antd';
import { BookOpen, LayoutList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CourseListItem } from '../../../../services/api/courseApi';

type CourseCatalogCardProps = {
  course: CourseListItem;
  category: string;
  level: string;
  role?: string;
  progressPercent?: number | null;
};

type StatusPresentation = {
  label: string;
  className: string;
};

function getStatusPresentation(
  course: CourseListItem,
  role?: string,
  progressPercent?: number | null,
): StatusPresentation {
  if (typeof progressPercent === 'number' && progressPercent >= 100) {
    return { label: 'Completed', className: 'client-course-card__status client-course-card__status--completed' };
  }

  if (typeof progressPercent === 'number' && progressPercent > 0) {
    return { label: 'In Progress', className: 'client-course-card__status client-course-card__status--progress' };
  }

  if (role === 'INSTRUCTOR') {
    if (course.status === 'DRAFT') {
      return { label: 'Draft', className: 'client-course-card__status client-course-card__status--draft' };
    }

    if (course.status === 'ARCHIVED') {
      return { label: 'Archived', className: 'client-course-card__status client-course-card__status--archived' };
    }
  }

  return { label: 'Available', className: 'client-course-card__status client-course-card__status--available' };
}

function getCourseInitials(title: string): string {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function CourseCatalogCard({
  course,
  category,
  level,
  role,
  progressPercent,
}: CourseCatalogCardProps) {
  const navigate = useNavigate();
  const status = getStatusPresentation(course, role, progressPercent);
  const primaryLabel = typeof progressPercent === 'number' && progressPercent > 0 ? 'Continue Learning' : 'View Course';
  const showCurriculum = course.status === 'PUBLISHED';
  const hasProgress = typeof progressPercent === 'number' && progressPercent > 0;

  return (
    <article className="client-course-card client-card client-card-hover">
      <div className="client-course-card__media">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt="" className="client-course-card__image" />
        ) : (
          <div className="client-course-card__image-fallback" aria-hidden="true">
            <span>{getCourseInitials(course.title)}</span>
          </div>
        )}
        <div className="client-course-card__media-overlay">
          <span className={status.className}>{status.label}</span>
        </div>
      </div>

      <div className="client-course-card__body">
        <div className="client-course-card__badges">
          <span className="client-badge client-badge-info">{category}</span>
          <span className="client-badge client-badge-neutral">{level}</span>
        </div>

        <div className="client-course-card__copy">
          <Typography.Title level={4} className="client-course-card__title">
            {course.title}
          </Typography.Title>
          <Typography.Text className="client-course-card__instructor">
            {course.instructor?.name ?? 'Instructor unavailable'}
          </Typography.Text>
          <Typography.Paragraph className="client-course-card__description">
            {course.description || 'Course details are available on the full course page.'}
          </Typography.Paragraph>
        </div>

        {hasProgress ? (
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
              aria-valuenow={progressPercent}
              aria-label={`Course progress ${progressPercent} percent`}
            >
              <span className="client-course-card__progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        ) : null}

        <div className="client-course-card__footer">
          <Button
            type="primary"
            className="client-button client-button-primary"
            onClick={() => navigate(`/courses/${course.id}`)}
          >
            {primaryLabel}
          </Button>

          <div className="client-course-card__footer-actions">
            <Button
              className="client-button client-button-secondary"
              onClick={() => navigate(`/courses/${course.id}`)}
            >
              Details
            </Button>
            {showCurriculum ? (
              <Button
                className="client-button client-button-ghost"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                Curriculum
              </Button>
            ) : null}
          </div>
        </div>

        <div className="client-course-card__meta">
          <span className="client-course-card__meta-item">
            <BookOpen size={15} />
            {course.status === 'PUBLISHED' ? 'Open now' : 'Private draft'}
          </span>
          <span className="client-course-card__meta-item">
            <LayoutList size={15} />
            Updated {new Date(course.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </article>
  );
}

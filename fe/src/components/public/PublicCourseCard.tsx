import { Card, Space, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import type { PublicCourseInstructorSummary } from '../../services/api/courseApi';

interface PublicCourseCardProps {
  course: {
    id: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    instructor?: PublicCourseInstructorSummary;
    moduleCount?: number;
    lessonCount?: number;
    enrollmentCount?: number;
  };
}

export function PublicCourseCard({ course }: PublicCourseCardProps) {
  const hasLearnerCount = typeof course.enrollmentCount === 'number';

  return (
    <Card className="marketing-course-card">
      <div
        className="marketing-course-card__thumb"
        style={course.thumbnailUrl ? { backgroundImage: `linear-gradient(180deg, rgba(0, 23, 92, 0.08), rgba(0, 23, 92, 0.62)), url(${course.thumbnailUrl})` } : undefined}
      >
        <span>{course.title.slice(0, 1).toUpperCase()}</span>
      </div>
      <Typography.Title className="public-card-title" level={4} style={{ marginTop: 18 }}>
        {course.title}
      </Typography.Title>
      <Typography.Paragraph className="public-card-text public-course-card__description" type="secondary">
        {course.description || 'Course details and module structure are available on the detail page.'}
      </Typography.Paragraph>
      <div className="marketing-course-card__meta">
        <Tag color="blue">{course.moduleCount ?? 0} modules</Tag>
        <Tag color="purple">{course.lessonCount ?? 0} lessons</Tag>
        {hasLearnerCount ? <Tag color="green">{course.enrollmentCount} learners</Tag> : null}
      </div>
      <div className="marketing-course-card__actions">
        <Link className="public-btn public-btn--primary" role="button" to={`/catalog/${course.id}`}>
          View course
        </Link>
        <Link className="public-btn public-btn--secondary" role="button" to="/register">
          Get started
        </Link>
      </div>
      {course.instructor?.name ? (
        <Space direction="vertical" size={4} style={{ marginTop: 18 }}>
          <Typography.Text strong>{course.instructor.name}</Typography.Text>
          <Typography.Text type="secondary">Lead instructor</Typography.Text>
        </Space>
      ) : null}
    </Card>
  );
}

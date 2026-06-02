import { Button, Card, Space, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import type { PublicCourseInstructorSummary } from '../../services/api/courseApi';

interface PublicCourseCardProps {
  course: {
    id: string;
    title: string;
    description?: string | null;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    instructor?: PublicCourseInstructorSummary;
    moduleCount?: number;
    lessonCount?: number;
    enrollmentCount?: number;
  };
}

export function PublicCourseCard({ course }: PublicCourseCardProps) {
  return (
    <Card className="marketing-course-card">
      <div className="marketing-course-card__thumb">{course.title.slice(0, 1).toUpperCase()}</div>
      <Typography.Title level={4} style={{ marginTop: 18 }}>
        {course.title}
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        {course.description || 'Course details and module structure are available on the detail page.'}
      </Typography.Paragraph>
      <div className="marketing-course-card__meta">
        <Tag color="blue">{course.moduleCount ?? 0} modules</Tag>
        <Tag color="purple">{course.lessonCount ?? 0} lessons</Tag>
        <Tag color="green">{course.enrollmentCount ?? 0} learners</Tag>
      </div>
      <div className="marketing-course-card__actions">
        <Link to={`/catalog/${course.id}`}>
          <Button type="primary">View course</Button>
        </Link>
        <Link to="/register">
          <Button>Get started</Button>
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

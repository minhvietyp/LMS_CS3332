import { Avatar, Button, Card, Space, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import type { PublicInstructorProfile } from '../../services/api/authApi';

interface PublicInstructorCardProps {
  instructor: PublicInstructorProfile;
}

export function PublicInstructorCard({ instructor }: PublicInstructorCardProps) {
  return (
    <Card className="marketing-instructor-card">
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <Space align="center" size={14}>
          <Avatar size={64} src={instructor.avatarUrl ?? undefined}>
            {instructor.name.slice(0, 1).toUpperCase()}
          </Avatar>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {instructor.name}
            </Typography.Title>
            <Typography.Text type="secondary">{instructor.occupation || 'Instructor'}</Typography.Text>
          </div>
        </Space>
        <Typography.Paragraph type="secondary">
          {instructor.bio || 'Explore published courses and instructor expertise.'}
        </Typography.Paragraph>
        <div className="marketing-instructor-card__meta">
          <Tag color="blue">{instructor.courseCount ?? 0} published courses</Tag>
          <Tag color="green">{instructor.studentCount ?? 0} enrolled learners</Tag>
        </div>
        <div className="marketing-instructor-card__actions">
          <Link to={`/instructors/${instructor.id}`}>
            <Button type="primary">View profile</Button>
          </Link>
          <Link to="/catalog">
            <Button>Browse courses</Button>
          </Link>
        </div>
      </Space>
    </Card>
  );
}

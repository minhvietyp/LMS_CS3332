import { Card, Row, Col, Progress, Space, Tag, Button, Tooltip, Image } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { CourseProgressItem } from '../../../types/progress';

interface CourseProgressCardProps {
  course: CourseProgressItem;
  onViewCourse?: (courseId: string) => void;
  onResume?: (courseId: string) => void;
  onDrop?: (courseId: string) => void;
}

export function CourseProgressCard({
  course,
  onViewCourse,
  onResume,
  onDrop,
}: CourseProgressCardProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: ReactNode }> = {
      ACTIVE: { color: 'processing', icon: <ClockCircleOutlined /> },
      COMPLETED: { color: 'success', icon: <CheckCircleOutlined /> },
      DROPPED: { color: 'error', icon: <DeleteOutlined /> },
    };

    const config = statusConfig[status] || statusConfig.ACTIVE;
    return <Tag icon={config.icon} color={config.color}>{status}</Tag>;
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 66) return '#52c41a';
    if (percentage >= 33) return '#faad14';
    return '#f5222d';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const renderActionButtons = () => {
    return (
      <Space wrap>
        <Button
          type="primary"
          size="small"
          icon={<ArrowRightOutlined />}
          onClick={() => onViewCourse?.(course.courseId)}
        >
          View Course
        </Button>
        {course.enrollmentStatus === 'ACTIVE' && (
          <Button
            danger
            size="small"
            onClick={() => onDrop?.(course.courseId)}
          >
            Drop
          </Button>
        )}
        {course.enrollmentStatus === 'DROPPED' && (
          <Button
            size="small"
            onClick={() => onResume?.(course.courseId)}
          >
            Re-enroll
          </Button>
        )}
      </Space>
    );
  };

  return (
    <Card
      hoverable
      style={{ height: '100%', borderRadius: '8px' }}
      cover={
        course.courseThumbnail ? (
          <Image
            src={course.courseThumbnail}
            alt={course.courseTitle}
            height={150}
            style={{ objectFit: 'cover' }}
            preview={false}
          />
        ) : (
          <div
            style={{
              height: '150px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px',
            }}
          >
            📚
          </div>
        )
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>
            {course.courseTitle}
          </h3>
          <p style={{ margin: '0', color: 'rgba(0,0,0,0.65)', fontSize: '13px' }}>
            by {course.instructorName}
          </p>
        </div>

        <div>
          {getStatusBadge(course.enrollmentStatus)}
        </div>

        <Row gutter={16}>
          <Col xs={12}>
            <small style={{ color: 'rgba(0,0,0,0.65)' }}>Unweighted Progress</small>
            <Progress
              percent={course.percentage}
              strokeColor={getProgressColor(course.percentage)}
              size="small"
            />
          </Col>
          <Col xs={12}>
            <small style={{ color: 'rgba(0,0,0,0.65)' }}>Weighted Progress</small>
            <Progress
              percent={course.weightedPercentage}
              strokeColor={getProgressColor(course.weightedPercentage)}
              size="small"
            />
          </Col>
        </Row>

        <div style={{ fontSize: '13px', color: 'rgba(0,0,0,0.65)' }}>
          <Tooltip title={`${course.completedWeight}/${course.totalWeight} weight points completed`}>
            {course.lessonsCompleted} of {course.totalLessons} lessons completed
          </Tooltip>
        </div>

        {course.completedAt && (
          <small style={{ color: 'rgba(0,0,0,0.65)' }}>
            Completed: {formatDate(course.completedAt)}
          </small>
        )}

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
          {renderActionButtons()}
        </div>
      </Space>
    </Card>
  );
}

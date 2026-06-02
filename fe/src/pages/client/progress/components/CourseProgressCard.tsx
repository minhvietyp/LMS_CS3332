import { Card, Row, Col, Progress, Space, Tag, Button, Tooltip, Image } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import type { CourseProgressItem } from '../../../../types/progress';
import './ProgressFoundation.css';

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
    if (percentage >= 66) return 'var(--client-state-success)';
    if (percentage >= 33) return 'var(--client-state-warning)';
    return 'var(--client-state-danger)';
  };

  const getProgressToneClass = (percentage: number) => {
    if (percentage >= 66) return 'progress-course-card__progress--strong';
    if (percentage >= 33) return 'progress-course-card__progress--medium';
    return 'progress-course-card__progress--early';
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
      className="progress-course-card"
      hoverable
      cover={
        course.courseThumbnail ? (
          <Image
            src={course.courseThumbnail}
            alt={course.courseTitle}
            height={150}
            className="progress-course-card__cover-image"
            preview={false}
          />
        ) : (
          <div className="progress-course-card__cover-fallback">
            📚
          </div>
        )
      }
    >
      <Space direction="vertical" className="progress-course-card__body" size="middle">
        <div>
          <h3 className="progress-course-card__title">
            {course.courseTitle}
          </h3>
          <p className="progress-course-card__meta">
            by {course.instructorName}
          </p>
        </div>

        <div>
          {getStatusBadge(course.enrollmentStatus)}
        </div>

        <Row gutter={16} className="progress-course-card__progress-grid">
          <Col xs={12}>
            <small className="progress-course-card__progress-heading">Unweighted Progress</small>
            <Progress
              className={getProgressToneClass(course.percentage)}
              percent={course.percentage}
              strokeColor={getProgressColor(course.percentage)}
              size="small"
            />
          </Col>
          <Col xs={12}>
            <small className="progress-course-card__progress-heading">Weighted Progress</small>
            <Progress
              className={getProgressToneClass(course.weightedPercentage)}
              percent={course.weightedPercentage}
              strokeColor={getProgressColor(course.weightedPercentage)}
              size="small"
            />
          </Col>
        </Row>

        <div className="progress-course-card__weight">
          <Tooltip title={`${course.completedWeight}/${course.totalWeight} weight points completed`}>
            {course.lessonsCompleted} of {course.totalLessons} lessons completed
          </Tooltip>
        </div>

        {course.completedAt && (
          <small className="progress-course-card__completed">
            Completed: {formatDate(course.completedAt)}
          </small>
        )}

        <div className="progress-course-card__actions">
          {renderActionButtons()}
        </div>
      </Space>
    </Card>
  );
}


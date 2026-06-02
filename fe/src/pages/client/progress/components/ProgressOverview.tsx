import { Spin, Empty, Alert, Button, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useProgressOverview } from '../../../../hooks/useProgressOverview';
import { ProgressSummaryWidget } from './ProgressSummary';
import { CourseProgressList } from './CourseProgressList';
import './ProgressFoundation.css';

interface ProgressOverviewProps {
  onViewCourse?: (courseId: string) => void;
  onResume?: (courseId: string) => void;
  onDrop?: (courseId: string) => void;
}

export function ProgressOverview({
  onViewCourse,
  onResume,
  onDrop,
}: ProgressOverviewProps) {
  const { data, isLoading, error, refetch } = useProgressOverview();

  if (isLoading) {
    return (
      <div className="progress-overview__loading">
        <Spin size="large" tip="Loading your progress..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="progress-overview__error">
        <Alert
          message="Failed to load progress"
          description={error instanceof Error ? error.message : 'An error occurred'}
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (!data) {
    return <Empty description="No progress data available" />;
  }

  return (
    <div className="progress-overview">
      <ProgressSummaryWidget data={data.summary} />

      <div className="progress-overview__toolbar">
        <Space>
          <h2 className="progress-overview__toolbar-title">My Courses</h2>
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            Refresh
          </Button>
        </Space>
      </div>

      <CourseProgressList
        courses={data.courses}
        loading={isLoading}
        onViewCourse={onViewCourse}
        onResume={onResume}
        onDrop={onDrop}
      />
    </div>
  );
}


import { Spin, Empty, Alert, Button, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useProgressOverview } from '../../../hooks/useProgressOverview';
import { ProgressSummaryWidget } from './ProgressSummary';
import { CourseProgressList } from './CourseProgressList';

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
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Spin size="large" tip="Loading your progress..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
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
    <div style={{ padding: '0' }}>
      {/* Summary Widget */}
      <ProgressSummaryWidget data={data.summary} />

      {/* Course List with Filters */}
      <div style={{ marginBottom: '16px' }}>
        <Space>
          <h2 style={{ margin: 0 }}>My Courses</h2>
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

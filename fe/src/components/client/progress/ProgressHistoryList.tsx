import { Alert, Card, Empty, List, Spin, Tag, Typography } from 'antd';
import { useMyProgressHistory } from '../../../hooks/useProgressOverview';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function toActionLabel(actionType: string) {
  return actionType.replaceAll('_', ' ');
}

export function ProgressHistoryList() {
  const { data, isLoading, error } = useMyProgressHistory({
    page: 1,
    pageSize: 8,
  });

  if (isLoading) {
    return <Spin tip="Loading progress history..." />;
  }

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="Failed to load progress history"
        description={error instanceof Error ? error.message : 'Unexpected error'}
      />
    );
  }

  if (!data?.items.length) {
    return <Empty description="No progress history yet." />;
  }

  return (
    <List
      dataSource={data.items}
      renderItem={(item) => (
        <List.Item>
          <Card size="small" style={{ width: '100%' }}>
            <Typography.Text strong>{item.courseTitle}</Typography.Text>
            <div>
              <Tag color="blue">{toActionLabel(item.actionType)}</Tag>
              <Typography.Text>{item.lessonTitle ?? 'Course status update'}</Typography.Text>
            </div>
            <Typography.Text type="secondary">
              {item.fromState ? `${item.fromState} -> ${item.toState}` : item.toState} • {formatDate(item.createdAt)}
            </Typography.Text>
          </Card>
        </List.Item>
      )}
    />
  );
}

import { Card, Progress, Statistic, Space, Tag } from 'antd';
import { BookOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ProgressSummary } from '../../../../types/progress';
import './ProgressFoundation.css';

interface ProgressSummaryWidgetProps {
  data: ProgressSummary;
}

export function ProgressSummaryWidget({ data }: ProgressSummaryWidgetProps) {
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 66) return 'var(--client-state-success)';
    if (percentage >= 33) return 'var(--client-state-warning)';
    return 'var(--client-state-danger)';
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Card className="progress-summary">
      <div className="progress-summary__grid">
        <div className="progress-summary__stat">
          <Statistic
            title={<span className="progress-summary__label">Total Courses</span>}
            value={data.totalCourses}
            prefix={<BookOutlined />}
          />
        </div>

        <div className="progress-summary__stat">
          <Statistic
            title={<span className="progress-summary__label">Active</span>}
            value={data.activeCourses}
            prefix={<ClockCircleOutlined />}
          />
        </div>

        <div className="progress-summary__stat progress-summary__label--success">
          <Statistic
            title={<span className="progress-summary__label">Completed</span>}
            value={data.completedCourses}
            prefix={<CheckCircleOutlined />}
          />
        </div>

        <div className="progress-summary__stat">
          <Statistic
            title={<span className="progress-summary__label">Dropped</span>}
            value={data.droppedCourses}
            prefix={<DeleteOutlined />}
          />
        </div>
      </div>

      <div className="progress-summary__footer">
        <div className="progress-summary__panel">
          <Space direction="vertical" size="small" className="progress-summary__stack">
            <div className="progress-summary__heading">
              Overall Progress (Weighted)
            </div>
            <Progress
              className="progress-summary__progress"
              percent={data.overallProgress}
              strokeColor={getProgressColor(data.overallProgress)}
            />
          </Space>
        </div>

        <div className="progress-summary__panel">
          <Space direction="vertical" size="small" className="progress-summary__stack">
            <div className="progress-summary__heading">Last Activity</div>
            <Tag color="cyan" className="progress-summary__tag">
              {formatDate(data.lastActivityAt)}
            </Tag>
          </Space>
        </div>
      </div>
    </Card>
  );
}


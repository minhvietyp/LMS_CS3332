import { Card, Row, Col, Progress, Statistic, Space, Tag } from 'antd';
import { BookOutlined, CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ProgressSummary } from '../../../types/progress';

interface ProgressSummaryWidgetProps {
  data: ProgressSummary;
}

export function ProgressSummaryWidget({ data }: ProgressSummaryWidgetProps) {
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 66) return '#52c41a'; // green
    if (percentage >= 33) return '#faad14'; // yellow
    return '#f5222d'; // red
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Card
      className="progress-summary-widget"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        marginBottom: '24px',
      }}
    >
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Total Courses</span>}
            value={data.totalCourses}
            valueStyle={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}
            prefix={<BookOutlined />}
          />
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Active</span>}
            value={data.activeCourses}
            valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
            prefix={<ClockCircleOutlined />}
          />
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Completed</span>}
            value={data.completedCourses}
            valueStyle={{ color: '#95de64', fontSize: '28px', fontWeight: 'bold' }}
            prefix={<CheckCircleOutlined />}
          />
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={<span style={{ color: 'rgba(255,255,255,0.85)' }}>Dropped</span>}
            value={data.droppedCourses}
            valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}
            prefix={<DeleteOutlined />}
          />
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24} md={12}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>
              Overall Progress (Weighted)
            </div>
            <Progress
              percent={data.overallProgress}
              strokeColor={getProgressColor(data.overallProgress)}
              format={(percent) => <span style={{ color: 'white', fontWeight: 'bold' }}>{percent}%</span>}
            />
          </Space>
        </Col>

        <Col xs={24} md={12}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>Last Activity</div>
            <Tag color="cyan" style={{ padding: '4px 12px', fontSize: '13px' }}>
              {formatDate(data.lastActivityAt)}
            </Tag>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

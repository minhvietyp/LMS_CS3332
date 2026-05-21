import { useNavigate } from 'react-router-dom';
import { Card, Typography, Space } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { ClientLayout, ClientPageContainer } from '../components/client/layout';
import { ProgressOverview } from '../components/client/progress/ProgressOverview';
import { ProgressHistoryList } from '../components/client/progress/ProgressHistoryList';
import './StudentProgressPage.css';

export function StudentProgressPage() {
  const navigate = useNavigate();

  const handleViewCourse = (courseId: string) => {
    navigate(`/courses/${courseId}`);
  };

  const handleResume = (courseId: string) => {
    // TODO: Implement re-enrollment logic
    console.log('Resume course:', courseId);
  };

  const handleDrop = (courseId: string) => {
    // TODO: Implement drop course logic
    console.log('Drop course:', courseId);
  };

  return (
    <ClientLayout>
      <ClientPageContainer title="My Progress" subtitle="Track enrolled courses, completion history, and your next study milestones.">
        <div className="student-progress-page">
          <Space direction="vertical" size={8} className="student-progress-page__intro">
            <Space align="center" size={10}>
              <BookOutlined />
              <Typography.Text type="secondary">Learning Progress</Typography.Text>
            </Space>
            <Typography.Title level={3}>Track your course completion and progress</Typography.Title>
          </Space>

          <Card className="student-progress-page__card">
            <ProgressOverview
              onViewCourse={handleViewCourse}
              onResume={handleResume}
              onDrop={handleDrop}
            />
          </Card>

          <Card className="student-progress-page__card" title="Progress History">
            <ProgressHistoryList />
          </Card>
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}

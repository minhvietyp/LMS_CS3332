import { Card, Col, Row, Typography } from 'antd';
import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';
import { LessonManagement } from '../../../admin/lessons/components';
import '../InstructorWorkspacePage.css';

export function InstructorLessonsPage() {
  return (
    <ClientLayout>
      <ClientPageContainer
        title="Lesson Builder"
        subtitle="Organize modules, lessons, and materials without leaving the instructor experience."
      >
        <Row gutter={[16, 16]} className="instructor-workspace-summary">
          <Col xs={24} md={8}>
            <Card className="instructor-workspace-card">
              <Typography.Text type="secondary">Modules in progress</Typography.Text>
              <Typography.Title level={3}>14</Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="instructor-workspace-card">
              <Typography.Text type="secondary">Draft lessons</Typography.Text>
              <Typography.Title level={3}>11</Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="instructor-workspace-card">
              <Typography.Text type="secondary">Ready to publish</Typography.Text>
              <Typography.Title level={3}>5</Typography.Title>
            </Card>
          </Col>
        </Row>
        <LessonManagement />
      </ClientPageContainer>
    </ClientLayout>
  );
}


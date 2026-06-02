import { Card, Col, Row, Typography } from 'antd';
import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';
import { CourseManagement } from '../../../admin/courses/components';
import '../InstructorWorkspacePage.css';

export function InstructorCoursesPage() {
  return (
    <ClientLayout>
      <ClientPageContainer
        title="My Courses"
        subtitle="Create, publish, archive, and maintain the courses you teach from your instructor workspace."
      >
        <Row gutter={[16, 16]} className="instructor-workspace-summary">
          <Col xs={24} md={8}>
            <Card className="instructor-workspace-card">
              <Typography.Text type="secondary">Active courses</Typography.Text>
              <Typography.Title level={3}>6</Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="instructor-workspace-card">
              <Typography.Text type="secondary">Draft courses</Typography.Text>
              <Typography.Title level={3}>2</Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="instructor-workspace-card">
              <Typography.Text type="secondary">Pending updates</Typography.Text>
              <Typography.Title level={3}>9</Typography.Title>
            </Card>
          </Col>
        </Row>
        <CourseManagement basePath="/instructor/courses" />
      </ClientPageContainer>
    </ClientLayout>
  );
}


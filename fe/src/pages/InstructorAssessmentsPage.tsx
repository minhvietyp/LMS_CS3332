import { Card, Col, Row, Typography } from 'antd';
import { ClientLayout, ClientPageContainer } from '../components/client/layout';
import { QuizManagement } from '../components/client/quiz-management';
import './InstructorWorkspacePage.css';

export function InstructorAssessmentsPage() {
  return (
    <ClientLayout>
      <ClientPageContainer
        title="Quiz and Assignment Management"
        subtitle="Create quizzes, organize questions, and keep assessment workflows inside the instructor experience."
      >
        <Row gutter={[16, 16]} className="instructor-workspace-summary">
          <Col xs={24} md={8}>
            <Card className="instructor-workspace-card">
              <Typography.Text type="secondary">Assessment flows</Typography.Text>
              <Typography.Title level={3}>2</Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="instructor-workspace-card">
              <Typography.Text type="secondary">Quiz builder</Typography.Text>
              <Typography.Title level={3}>Live</Typography.Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="instructor-workspace-card">
              <Typography.Text type="secondary">Assignment panel</Typography.Text>
              <Typography.Title level={3}>Next</Typography.Title>
            </Card>
          </Col>
        </Row>
        <QuizManagement />
      </ClientPageContainer>
    </ClientLayout>
  );
}

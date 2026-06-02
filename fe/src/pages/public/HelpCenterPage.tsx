import { Col, Row, Typography } from 'antd';
import { MarketingLayout } from '../../components/public/MarketingLayout';

export function HelpCenterPage() {
  return (
    <MarketingLayout>
      <section className="marketing-section">
        <div className="marketing-section__header">
          <div>
            <Typography.Title level={1}>Help Center</Typography.Title>
            <Typography.Paragraph type="secondary">
              Start here for onboarding, catalog support, and questions about how public discovery connects to the authenticated LMS experience.
            </Typography.Paragraph>
          </div>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <article className="marketing-stat-card">
              <Typography.Title level={4}>Getting started</Typography.Title>
              <Typography.Paragraph type="secondary">
                Browse the catalog, open course detail pages, and create an account when you are ready to enroll.
              </Typography.Paragraph>
            </article>
          </Col>
          <Col xs={24} md={8}>
            <article className="marketing-stat-card">
              <Typography.Title level={4}>Course delivery</Typography.Title>
              <Typography.Paragraph type="secondary">
                Public pages show published curriculum structure. Assignments, quizzes, and learning progress remain inside the secure student workspace.
              </Typography.Paragraph>
            </article>
          </Col>
          <Col xs={24} md={8}>
            <article className="marketing-stat-card">
              <Typography.Title level={4}>Communication</Typography.Title>
              <Typography.Paragraph type="secondary">
                Use Contact and FAQ for pre-enrollment questions. Authenticated learners later gain notifications and course communication tools.
              </Typography.Paragraph>
            </article>
          </Col>
        </Row>
      </section>
    </MarketingLayout>
  );
}

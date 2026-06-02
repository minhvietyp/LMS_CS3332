import { Col, Row, Typography } from 'antd';
import { MarketingLayout } from '../../components/public/MarketingLayout';

export function CommunityPage() {
  return (
    <MarketingLayout>
      <section className="marketing-section">
        <div className="marketing-section__header">
          <div>
            <Typography.Title level={1}>Community</Typography.Title>
            <Typography.Paragraph type="secondary">
              Learn how discussion, announcements, academic support, and cohort interaction extend the core learning experience after enrollment.
            </Typography.Paragraph>
          </div>
        </div>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <article className="marketing-stat-card">
              <Typography.Title level={4}>Course announcements</Typography.Title>
              <Typography.Paragraph type="secondary">
                Enrolled learners receive structured updates about schedules, assignments, and learning milestones.
              </Typography.Paragraph>
            </article>
          </Col>
          <Col xs={24} md={8}>
            <article className="marketing-stat-card">
              <Typography.Title level={4}>Instructor guidance</Typography.Title>
              <Typography.Paragraph type="secondary">
                Students can follow course-specific communication and stay aligned with teaching expectations.
              </Typography.Paragraph>
            </article>
          </Col>
          <Col xs={24} md={8}>
            <article className="marketing-stat-card">
              <Typography.Title level={4}>Learner support</Typography.Title>
              <Typography.Paragraph type="secondary">
                The Help Center, FAQ, and academic services pages give public visitors a clear path before they enter the LMS workspace.
              </Typography.Paragraph>
            </article>
          </Col>
        </Row>
      </section>
    </MarketingLayout>
  );
}

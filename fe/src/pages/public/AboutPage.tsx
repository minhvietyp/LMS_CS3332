import { Typography } from 'antd';
import { MarketingLayout } from '../../components/public/MarketingLayout';

export function AboutPage() {
  return (
    <MarketingLayout>
      <section className="marketing-surface">
        <Typography.Title level={1}>About the platform</Typography.Title>
        <Typography.Paragraph type="secondary">
          This LMS supports course discovery, enrollment, guided lessons, assignments, quizzes, progress tracking, and instructor-led teaching workflows.
        </Typography.Paragraph>
        <Typography.Paragraph>
          The public layer introduces the catalog, instructor directory, and support pages before a learner enters the authenticated workspace.
        </Typography.Paragraph>
      </section>
    </MarketingLayout>
  );
}

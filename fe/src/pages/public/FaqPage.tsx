import { Collapse, Typography } from 'antd';
import { MarketingLayout } from '../../components/public/MarketingLayout';

const faqItems = [
  {
    key: 'enrollment',
    label: 'How do learners access a course?',
    children: 'Browse the public catalog, review the course detail page, then register or log in to continue into the authenticated learning workspace.',
  },
  {
    key: 'delivery',
    label: 'What learning materials are shown publicly?',
    children: 'The public detail page shows published modules and lessons, while assignments, quizzes, progress, and submissions stay inside the authenticated workspace.',
  },
  {
    key: 'teaching',
    label: 'Can I review instructors before enrolling?',
    children: 'Yes. The instructor directory and detail pages summarize bio, expertise, and the currently published courses attached to each instructor.',
  },
];

export function FaqPage() {
  return (
    <MarketingLayout>
      <section className="marketing-surface">
        <Typography.Title level={1}>Frequently asked questions</Typography.Title>
        <Typography.Paragraph type="secondary">
          Common questions about catalog browsing, enrollment, and the transition from public discovery into the learning workspace.
        </Typography.Paragraph>
        <Collapse items={faqItems} />
      </section>
    </MarketingLayout>
  );
}

import { Space, Typography } from 'antd';
import { MarketingLayout } from '../../components/public/MarketingLayout';

export function ContactPage() {
  return (
    <MarketingLayout>
      <section className="marketing-surface">
        <Typography.Title level={1}>Contact</Typography.Title>
        <Space direction="vertical" size={10}>
          <Typography.Text>Admissions and learner support: support@lms.example</Typography.Text>
          <Typography.Text>Instructor coordination: instructors@lms.example</Typography.Text>
          <Typography.Text>Academic services: +84 28 0000 0000</Typography.Text>
        </Space>
      </section>
    </MarketingLayout>
  );
}

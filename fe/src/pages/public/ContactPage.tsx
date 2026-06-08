import { Button, Input, Typography } from 'antd';
import { Headphones, Laptop, Mail, UserRound } from 'lucide-react';
import { MarketingLayout } from '../../components/public/MarketingLayout';

const contactCards = [
  {
    icon: <UserRound size={18} />,
    title: 'Student support',
    description: 'Questions about student accounts, public registration, and finding the right course path.',
  },
  {
    icon: <Headphones size={18} />,
    title: 'Instructor support',
    description: 'Questions about course ownership, teaching workflows, and instructor-managed access.',
  },
  {
    icon: <Laptop size={18} />,
    title: 'Technical help',
    description: 'Help with sign-in, password reset, loading issues, and browser access problems.',
  },
];

export function ContactPage() {
  return (
    <MarketingLayout>
      <section className="marketing-section">
        <div className="marketing-page-hero">
          <div>
            <span className="marketing-kicker">Support contact</span>
            <Typography.Title level={1}>Contact</Typography.Title>
            <Typography.Paragraph type="secondary">
              Reach the EduFlow support path that matches your public account, course, or technical question.
            </Typography.Paragraph>
          </div>
          <div className="marketing-page-note">
            General support email: <strong>support@eduflow.local</strong>
          </div>
        </div>
        <div className="marketing-contact-grid">
          {contactCards.map((card) => (
            <article className="marketing-contact-card" key={card.title}>
              <span className="marketing-feature-icon">{card.icon}</span>
              <Typography.Title level={4}>{card.title}</Typography.Title>
              <Typography.Paragraph type="secondary">{card.description}</Typography.Paragraph>
            </article>
          ))}
        </div>
        <div className="marketing-surface marketing-contact-form" aria-label="Contact form preview">
          <div>
            <Typography.Title level={3}>Message preview</Typography.Title>
            <Typography.Paragraph type="secondary">
              This form is a non-submitting UI preview because no public contact API is configured. Use support@eduflow.local for support.
            </Typography.Paragraph>
          </div>
          <Input size="large" prefix={<Mail size={16} />} placeholder="Your email" disabled />
          <Input size="large" placeholder="Subject" disabled />
          <Input.TextArea rows={4} placeholder="How can we help?" disabled />
          <Button type="primary" disabled>
            Send message
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}

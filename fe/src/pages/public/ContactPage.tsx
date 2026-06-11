import { Input, Select } from 'antd';
import { Headphones, Laptop, Mail, Send, UserRound } from 'lucide-react';
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
      <section className="public-page public-page--contact">
        <div className="public-page-hero public-page-hero--split">
          <div>
            <span className="public-kicker">Support Contact</span>
            <h1 className="public-page-title">Contact</h1>
            <p className="public-page-copy">
              Reach the EduFlow support path that matches your public account, course, or technical question.
            </p>
          </div>
          <div className="public-page-note">
            <Mail size={18} />
            <span>General support email: <strong>support@eduflow.local</strong></span>
          </div>
        </div>
        <div className="public-three-grid">
          {contactCards.map((card) => (
            <article className="public-card" key={card.title}>
              <span className="public-card__icon">{card.icon}</span>
              <h2 className="public-card-title">{card.title}</h2>
              <p className="public-card-text">{card.description}</p>
            </article>
          ))}
        </div>
        <div className="public-card public-contact-form" aria-label="Contact form preview">
          <div>
            <h2 className="public-section-title">Message Preview</h2>
            <p className="public-card-text">
              This form is a non-submitting UI preview because no public contact API is configured. Use support@eduflow.local for support.
            </p>
          </div>
          <div className="public-contact-form__grid">
            <Input size="large" prefix={<Mail size={16} />} placeholder="Your email" disabled />
            <Select
              size="large"
              value="student"
              disabled
              options={[
                { value: 'student', label: 'Student support' },
                { value: 'instructor', label: 'Instructor support' },
                { value: 'technical', label: 'Technical help' },
              ]}
            />
          </div>
          <Input size="large" placeholder="Subject" disabled />
          <Input.TextArea rows={4} placeholder="How can we help?" disabled />
          <button className="public-btn public-btn--primary" type="button" disabled>
            Send message <Send size={16} />
          </button>
        </div>
      </section>
    </MarketingLayout>
  );
}

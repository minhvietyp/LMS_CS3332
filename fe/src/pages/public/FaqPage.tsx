import { Typography } from 'antd';
import { MarketingLayout } from '../../components/public/MarketingLayout';

const faqItems = [
  {
    question: 'How do I create an account?',
    answer: 'Use the Register link. Public registration creates student access only.',
  },
  {
    question: 'How do I join a course?',
    answer: 'Browse the catalog and open a course detail page. Enrolled course activity is available after sign-in.',
  },
  {
    question: 'Where can I see assignments?',
    answer: 'Assignments are shown inside the authenticated student workspace for courses attached to your account.',
  },
  {
    question: 'How are grades calculated?',
    answer: 'Grades are based on course activity configured by instructors. The public pages do not calculate or expose private grade records.',
  },
  {
    question: 'How do notifications work?',
    answer: 'Notifications appear after sign-in and help you track course updates, assignments, quizzes, chats, and system messages.',
  },
];

export function FaqPage() {
  return (
    <MarketingLayout>
      <section className="marketing-section">
        <div className="marketing-page-hero">
          <div>
            <span className="marketing-kicker">FAQ</span>
            <Typography.Title level={1}>Frequently Asked Questions</Typography.Title>
            <Typography.Paragraph type="secondary">
              Practical answers about public browsing, accounts, course work, grades, and notifications.
            </Typography.Paragraph>
          </div>
        </div>
        <div className="marketing-faq-grid">
          {faqItems.map((item) => (
            <article className="marketing-faq-item" key={item.question}>
              <Typography.Title level={4}>{item.question}</Typography.Title>
              <Typography.Paragraph type="secondary">{item.answer}</Typography.Paragraph>
            </article>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}

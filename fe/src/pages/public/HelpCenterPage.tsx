import { Typography } from 'antd';
import { BookOpen, CircleHelp, ClipboardList, GraduationCap, KeyRound } from 'lucide-react';
import { MarketingLayout } from '../../components/public/MarketingLayout';

const supportSections = [
  {
    icon: <CircleHelp size={18} />,
    title: 'Getting started',
    description: 'Create a student account, browse the catalog, and open course detail pages before entering the secure workspace.',
  },
  {
    icon: <KeyRound size={18} />,
    title: 'Account and login',
    description: 'Use the sign-in page for existing accounts and the password reset route if you cannot access your account.',
  },
  {
    icon: <BookOpen size={18} />,
    title: 'Courses and learning',
    description: 'Published course outlines are public. Lessons and enrolled course activity are available after sign-in.',
  },
  {
    icon: <ClipboardList size={18} />,
    title: 'Assignments and quizzes',
    description: 'Assignments, quiz attempts, submissions, and feedback stay inside authenticated course pages.',
  },
  {
    icon: <GraduationCap size={18} />,
    title: 'Grades and progress',
    description: 'Progress, grade summaries, deadlines, and completion history are visible from the student workspace.',
  },
];

export function HelpCenterPage() {
  return (
    <MarketingLayout>
      <section className="marketing-section">
        <div className="marketing-page-hero">
          <div>
            <span className="marketing-kicker">Support</span>
            <Typography.Title level={1}>Help Center</Typography.Title>
            <Typography.Paragraph type="secondary">
              Start here for onboarding, account access, course learning, assignments, quizzes, grades, and progress questions.
            </Typography.Paragraph>
          </div>
          <div className="marketing-page-note">
            For account-specific help, sign in first so course and enrollment details stay protected.
          </div>
        </div>
        <div className="marketing-support-grid">
          {supportSections.map((section) => (
            <article key={section.title}>
              <span className="marketing-feature-icon">{section.icon}</span>
              <Typography.Title level={4}>{section.title}</Typography.Title>
              <Typography.Paragraph type="secondary">{section.description}</Typography.Paragraph>
            </article>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}

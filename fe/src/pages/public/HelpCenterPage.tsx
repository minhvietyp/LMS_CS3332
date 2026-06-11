import { Input } from 'antd';
import { BookOpen, CircleHelp, ClipboardList, GraduationCap, KeyRound, Mail, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
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
      <section className="public-page public-page--help">
        <div className="public-page-hero public-page-hero--split">
          <div>
            <span className="public-kicker">Support</span>
            <h1 className="public-page-title">Help Center</h1>
            <p className="public-page-copy">
              Start here for onboarding, account access, course learning, assignments, quizzes, grades, and progress questions.
            </p>
          </div>
          <div className="public-page-note">
            <KeyRound size={18} />
            <span>For account-specific help, sign in first so course and enrollment details stay protected.</span>
          </div>
        </div>
        <div className="public-filter-card public-filter-card--single">
          <div className="public-filter-card__search">
            <Search size={18} />
            <Input size="large" variant="borderless" placeholder="Search help articles, account topics, or course support" />
          </div>
        </div>
        <div className="public-support-grid">
          {supportSections.map((section) => (
            <article className="public-card" key={section.title}>
              <span className="public-card__icon">{section.icon}</span>
              <h2 className="public-card-title">{section.title}</h2>
              <p className="public-card-text">{section.description}</p>
            </article>
          ))}
        </div>
        <div className="public-support-cta">
          <Mail size={18} />
          <span>Need direct help? Contact support and include the course, account email, and issue type when available.</span>
          <Link className="public-btn public-btn--secondary" to="/contact">Contact support</Link>
        </div>
      </section>
    </MarketingLayout>
  );
}

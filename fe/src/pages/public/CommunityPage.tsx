import { ArrowRight, Bell, MessageSquareText, Radio, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/public/MarketingLayout';

const communityFeatures = [
  {
    icon: <Bell size={20} />,
    title: 'Course announcements',
    description: 'Review instructor updates, schedule changes, and academic reminders after joining a course workspace.',
  },
  {
    icon: <MessageSquareText size={20} />,
    title: 'Instructor guidance',
    description: 'Ask questions, follow instructor replies, and keep topic-specific collaboration attached to each course.',
  },
  {
    icon: <UsersRound size={20} />,
    title: 'Learner support',
    description: 'Learn alongside peers while course-specific participation stays scoped to enrolled learners.',
  },
];

export function CommunityPage() {
  return (
    <MarketingLayout>
      <section className="public-page public-page--community">
        <div className="public-page-hero public-page-hero--split">
          <div>
            <span className="public-kicker">Community</span>
            <h1 className="public-page-title">Community</h1>
            <p className="public-page-copy">
              A learning community built around real course work, instructor guidance, and peer support after enrollment.
            </p>
            <div className="public-page-actions">
              <Link className="public-btn public-btn--primary" to="/register">
                Join EduFlow <ArrowRight size={16} />
              </Link>
              <Link className="public-btn public-btn--secondary" to="/help-center">Read support docs</Link>
            </div>
          </div>
          <aside className="public-highlight-panel">
            <Radio size={22} />
            <strong>Private by default</strong>
            <span>Course discussions and announcements are available inside authenticated course spaces.</span>
          </aside>
        </div>
        <div className="public-three-grid">
          {communityFeatures.map((feature) => (
            <article className="public-card" key={feature.title}>
              <span className="public-card__icon">{feature.icon}</span>
              <h2 className="public-card-title">{feature.title}</h2>
              <p className="public-card-text">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}

import { ArrowRight, BookOpenCheck, Code2, Database, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/public/MarketingLayout';

const learningPaths = [
  {
    id: 'frontend',
    icon: <Code2 size={20} />,
    title: 'Frontend Engineering',
    description: 'Build UI foundations, component systems, state management, accessibility, and production delivery habits.',
    steps: ['HTML, CSS, JavaScript', 'React fundamentals', 'Advanced UI workflows'],
  },
  {
    id: 'backend',
    icon: <Database size={20} />,
    title: 'Backend Systems',
    description: 'Move from API basics into data modeling, authentication, integrations, and scalable service design.',
    steps: ['REST API design', 'Database modeling', 'Auth and deployment'],
  },
  {
    id: 'security',
    icon: <ShieldCheck size={20} />,
    title: 'Cybersecurity Foundations',
    description: 'Understand secure systems, network concepts, risk handling, and practical defensive workflows.',
    steps: ['Security principles', 'Threat modeling', 'Incident readiness'],
  },
  {
    id: 'data',
    icon: <Layers3 size={20} />,
    title: 'Data and Analytics',
    description: 'Learn structured analysis, reporting logic, and data-backed decision making for academic and product work.',
    steps: ['Data literacy', 'Dashboards', 'Applied analytics'],
  },
];

export function LearningPathsPage() {
  return (
    <MarketingLayout>
      <section className="public-page public-page--paths">
        <div className="public-page-hero public-page-hero--split">
          <div>
            <span className="public-kicker">Learning Paths</span>
            <h1 className="public-page-title">Choose a structured route before you enroll.</h1>
            <p className="public-page-copy">
              Learning paths organize published courses into practical sequences. They help visitors understand what to study next without exposing private course work.
            </p>
            <div className="public-page-actions">
              <Link className="public-btn public-btn--primary" to="/catalog">
                Browse courses <ArrowRight size={16} />
              </Link>
              <Link className="public-btn public-btn--secondary" to="/register">Create student account</Link>
            </div>
          </div>
          <aside className="public-highlight-panel" aria-label="Learning path promise">
            <Sparkles size={22} />
            <strong>Path-first discovery</strong>
            <span>Understand sequence, workload, and outcomes before entering the authenticated LMS workspace.</span>
          </aside>
        </div>

        <div className="public-path-page-grid">
          {learningPaths.map((path) => (
            <article className="public-card public-path-page-card" id={`path-${path.id}`} key={path.id}>
              <span className="public-card__icon">{path.icon}</span>
              <div>
                <h2 className="public-card-title">{path.title}</h2>
                <p className="public-card-text">{path.description}</p>
              </div>
              <ol className="public-sequence-list">
                {path.steps.map((step) => (
                  <li key={step}>
                    <BookOpenCheck size={16} />
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <a className="public-btn public-btn--secondary" href={`#path-${path.id}`}>
                View path
              </a>
            </article>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}

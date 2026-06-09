import { useQuery } from '@tanstack/react-query';
import { Alert, Avatar, Button, Col, Empty, Row, Skeleton, Typography } from 'antd';
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Database,
  GraduationCap,
  HelpCircle,
  Layers3,
  MessageSquare,
  Network,
  NotebookTabs,
  ShieldCheck,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/public/MarketingLayout';
import { PublicCourseCard } from '../../components/public/PublicCourseCard';
import { listPublicInstructorsRequest } from '../../services/api/authApi';
import { listPublicCoursesRequest } from '../../services/api/courseApi';

const featureCards = [
  {
    icon: <BookOpen size={20} />,
    title: 'Course learning',
    description: 'Browse published courses, follow modules, and keep lesson work organized in one focused place.',
  },
  {
    icon: <ClipboardCheck size={20} />,
    title: 'Assignments and quizzes',
    description: 'Review tasks, submit coursework, attempt quizzes, and return to instructor feedback quickly.',
  },
  {
    icon: <TrendingUp size={20} />,
    title: 'Progress and grades',
    description: 'Track completion, grades, deadlines, and course progress without switching tools.',
  },
  {
    icon: <MessageSquare size={20} />,
    title: 'Community and notifications',
    description: 'Stay close to announcements, discussion rooms, support threads, and unread updates.',
  },
];

const learningPaths = [
  {
    icon: <Code2 size={20} />,
    title: 'Frontend Developer',
    description: 'Build interface fundamentals, component thinking, and client-side workflows.',
    chips: ['React', 'UI systems', 'Accessibility'],
  },
  {
    icon: <Database size={20} />,
    title: 'Backend Developer',
    description: 'Practice APIs, data models, authentication, and production service design.',
    chips: ['Node.js', 'PostgreSQL', 'Prisma'],
  },
  {
    icon: <BarChart3 size={20} />,
    title: 'Data Science',
    description: 'Move from data foundations to analysis, visualization, and decision support.',
    chips: ['Python', 'Analytics', 'Reports'],
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Cyber Security',
    description: 'Study secure systems, network concepts, and defensive engineering habits.',
    chips: ['Security', 'Networks', 'Risk'],
  },
];

const workflowSteps = [
  {
    icon: <BookOpen size={18} />,
    title: 'Browse courses',
    description: 'Explore the public catalog and review course outlines before creating an account.',
  },
  {
    icon: <Layers3 size={18} />,
    title: 'Learn through modules',
    description: 'Move through structured lessons, materials, and learning checkpoints.',
  },
  {
    icon: <NotebookTabs size={18} />,
    title: 'Submit assignments and quizzes',
    description: 'Complete coursework and return to instructor feedback from the course context.',
  },
  {
    icon: <TrendingUp size={18} />,
    title: 'Track progress and grades',
    description: 'Review completion history, grades, deadlines, and course notifications.',
  },
];

const stats = [
  ['500+', 'Courses'],
  ['120+', 'Instructors'],
  ['15k+', 'Learners'],
  ['95%', 'Completion support'],
];

const workspaceItems = ['Dashboard', 'Courses', 'Calendar', 'Grades', 'Community'];

const testimonials = [
  {
    quote: 'EduFlow keeps course work, deadlines, and progress signals easy to understand.',
    name: 'Academic learner',
    role: 'Student feedback example',
  },
  {
    quote: 'The catalog and workspace structure make it easier to move from discovery into learning.',
    name: 'Course participant',
    role: 'Public LMS feedback example',
  },
  {
    quote: 'Notifications and course context help reduce missed updates during a busy semester.',
    name: 'Program member',
    role: 'Generic public testimonial',
  },
];

const faqs = [
  {
    question: 'How do I enroll in a course?',
    answer: 'Open the catalog, choose a published course, then create an account or sign in to continue enrollment from the authenticated workspace.',
  },
  {
    question: 'How do assignments work?',
    answer: 'Assignments are managed inside each course. Students can review instructions, submit text or files, and return to instructor feedback.',
  },
  {
    question: 'How do quizzes work?',
    answer: 'Published quizzes appear inside course workspaces and may include attempt limits, passing scores, and result review.',
  },
  {
    question: 'Can I track my progress?',
    answer: 'Yes. Student dashboards show lesson completion, course progress, grade signals, and recent learning activity.',
  },
  {
    question: 'How do certificates work?',
    answer: 'Certificate behavior depends on course configuration. This public page does not claim certificate availability for every course.',
  },
];

export function PublicHomePage() {
  const coursesQuery = useQuery({
    queryKey: ['public', 'home', 'courses'],
    queryFn: async () => (await listPublicCoursesRequest({ page: 1, limit: 3 })).data,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const instructorsQuery = useQuery({
    queryKey: ['public', 'home', 'instructors'],
    queryFn: listPublicInstructorsRequest,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const featuredInstructors = (instructorsQuery.data ?? []).slice(0, 3);

  return (
    <MarketingLayout
      hero={
        <section className="marketing-hero marketing-hero--premium">
          <article className="marketing-hero__panel">
            <span className="marketing-hero__eyebrow">EduFlow Academic LMS</span>
            <Typography.Title className="marketing-hero__title">
              Learn, manage coursework, and track progress in one academic portal.
            </Typography.Title>
            <Typography.Paragraph className="marketing-hero__copy">
              EduFlow brings courses, lessons, assignments, quizzes, grades, notifications, and academic communication into one focused workspace.
            </Typography.Paragraph>
            <div className="marketing-hero__actions">
              <Link to="/register">
                <Button type="primary" size="large">Create account</Button>
              </Link>
              <Link to="/catalog">
                <Button size="large">Explore catalog</Button>
              </Link>
            </div>
            <div className="marketing-hero__proof" aria-label="EduFlow platform highlights">
              <span><strong>15,000+</strong> learners</span>
              <span><strong>Expert-led</strong> courses</span>
              <span><strong>Progress</strong> tracking</span>
            </div>
          </article>

          <aside className="marketing-product-card marketing-dashboard-preview" aria-label="EduFlow dashboard preview">
            <div className="marketing-product-card__topbar">
              <span />
              <strong>Academic dashboard</strong>
            </div>
            <div className="marketing-product-card__body">
              <div className="marketing-product-card__status">
                <span><GraduationCap size={16} /> Current course progress</span>
                <strong>68%</strong>
              </div>
              <div className="marketing-product-card__course">
                <span>Active course</span>
                <strong>Intro to Academic Computing</strong>
                <div className="marketing-product-card__progress">
                  <span className="marketing-product-card__progress-value" />
                </div>
              </div>
              <div className="marketing-product-card__grid">
                <div>
                  <span>Assignments open</span>
                  <strong>2 tasks</strong>
                </div>
                <div>
                  <span>Grade trend</span>
                  <strong>B+</strong>
                </div>
              </div>
              <div className="marketing-product-card__deadline">
                <span>
                  <strong>Upcoming deadline</strong>
                  <small>Research summary due Friday</small>
                </span>
                <span className="marketing-product-card__badge"><CalendarDays size={14} /> 3d</span>
              </div>
              <div className="marketing-product-card__message">
                <span>
                  <strong>New course update</strong>
                  <small>Instructor posted module notes</small>
                </span>
                <span className="marketing-product-card__badge"><Bell size={14} /></span>
              </div>
            </div>
          </aside>
        </section>
      }
    >
      <section className="marketing-section marketing-section--spacious" aria-labelledby="features-title">
        <div className="marketing-section__header">
          <div>
            <span className="marketing-kicker">Learning platform</span>
            <Typography.Title id="features-title" level={2}>Built for focused academic work</Typography.Title>
          </div>
        </div>
        <div className="marketing-feature-grid">
          {featureCards.map((feature) => (
            <article key={feature.title}>
              <span>{feature.icon}</span>
              <Typography.Title level={4}>{feature.title}</Typography.Title>
              <Typography.Paragraph type="secondary">{feature.description}</Typography.Paragraph>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-section--spacious" aria-labelledby="courses-title">
        <div className="marketing-section__header">
          <div>
            <span className="marketing-kicker">Featured courses</span>
            <Typography.Title id="courses-title" level={2}>Start with published courses</Typography.Title>
            <Typography.Paragraph type="secondary">
              Course cards use the public course API and only show counts returned by the backend.
            </Typography.Paragraph>
          </div>
          <Link to="/catalog">View all courses</Link>
        </div>
        {coursesQuery.isLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
        {coursesQuery.error ? <Alert type="error" showIcon message="Failed to load featured courses" /> : null}
        {!coursesQuery.isLoading && !coursesQuery.error && !coursesQuery.data?.length ? <Empty description="No published courses yet." /> : null}
        <Row gutter={[20, 20]}>
          {(coursesQuery.data ?? []).map((course) => (
            <Col key={course.id} xs={24} md={12} xl={8}>
              <PublicCourseCard course={course} />
            </Col>
          ))}
        </Row>
      </section>

      <section id="learning-paths" className="marketing-section marketing-section--spacious" aria-labelledby="paths-title">
        <div className="marketing-section__header">
          <div>
            <span className="marketing-kicker">Popular learning paths</span>
            <Typography.Title id="paths-title" level={2}>Choose a direction and keep moving</Typography.Title>
            <Typography.Paragraph type="secondary">
              Static marketing paths that group common skills without claiming live enrollment data.
            </Typography.Paragraph>
          </div>
        </div>
        <div className="marketing-path-grid">
          {learningPaths.map((path) => (
            <article className="marketing-path-card" key={path.title}>
              <span className="marketing-feature-icon">{path.icon}</span>
              <Typography.Title level={4}>{path.title}</Typography.Title>
              <Typography.Paragraph type="secondary">{path.description}</Typography.Paragraph>
              <div className="marketing-chip-row">
                {path.chips.map((chip) => <span key={chip}>{chip}</span>)}
              </div>
              <Link to="/catalog">Explore path</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-section--spacious" aria-labelledby="works-title">
        <div className="marketing-section__header">
          <div>
            <span className="marketing-kicker">How it works</span>
            <Typography.Title id="works-title" level={2}>From catalog to coursework in four steps</Typography.Title>
          </div>
        </div>
        <div className="marketing-workflow-grid marketing-workflow-grid--connected">
          {workflowSteps.map((step, index) => (
            <article key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div className="marketing-workflow-grid__icon">{step.icon}</div>
              <Typography.Title level={4}>{step.title}</Typography.Title>
              <Typography.Paragraph type="secondary">{step.description}</Typography.Paragraph>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-stat-row" aria-label="EduFlow public platform statistics">
        {stats.map(([value, label]) => (
          <article key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </section>

      <section className="marketing-section marketing-surface marketing-section--spacious">
        <div className="marketing-workspace-preview">
          <div>
            <span className="marketing-kicker">Academic workspace</span>
            <Typography.Title level={2}>Everything students see after sign-in.</Typography.Title>
            <Typography.Paragraph type="secondary">
              The authenticated workspace brings dashboard summaries, courses, calendar deadlines, grades, and community updates into one learning flow.
            </Typography.Paragraph>
            <div className="marketing-workspace-preview__nav">
              {workspaceItems.map((item) => (
                <span key={item}><CheckCircle2 size={16} /> {item}</span>
              ))}
            </div>
          </div>
          <div className="marketing-workspace-preview__panel" aria-label="Workspace capability preview">
            <Typography.Title level={4}>Student dashboard preview</Typography.Title>
            <div className="marketing-product-card__course">
              <span>Current module</span>
              <strong>Structured HTML and accessibility</strong>
              <div className="marketing-product-card__progress">
                <span className="marketing-product-card__progress-value" />
              </div>
            </div>
            <div className="marketing-preview-stack">
              <div><CalendarDays size={16} /><span>Upcoming assignment</span><strong>Case study draft</strong></div>
              <div><Star size={16} /><span>Quiz score</span><strong>86%</strong></div>
              <div><MessageSquare size={16} /><span>Community reply</span><strong>New response</strong></div>
            </div>
            <span className="marketing-notification-pill"><Bell size={14} /> 4 updates</span>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-section--spacious" aria-labelledby="instructors-title">
        <div className="marketing-section__header">
          <div>
            <span className="marketing-kicker">Instructors</span>
            <Typography.Title id="instructors-title" level={2}>Learn from expert instructors</Typography.Title>
            <Typography.Paragraph type="secondary">
              Instructor cards use the public instructor API when profiles are available.
            </Typography.Paragraph>
          </div>
          <Link to="/instructors">View instructors</Link>
        </div>
        {instructorsQuery.isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : null}
        {instructorsQuery.error ? <Alert type="error" showIcon message="Failed to load instructors" /> : null}
        {!instructorsQuery.isLoading && !instructorsQuery.error && !featuredInstructors.length ? (
          <Empty description="No instructors are publicly listed yet." />
        ) : null}
        <div className="marketing-instructor-showcase">
          {featuredInstructors.map((instructor) => (
            <article className="marketing-instructor-mini" key={instructor.id}>
              <Avatar size={58} src={instructor.avatarUrl ?? undefined}>
                {instructor.name.slice(0, 1).toUpperCase()}
              </Avatar>
              <div>
                <Typography.Title level={4}>{instructor.name}</Typography.Title>
                <Typography.Text type="secondary">{instructor.occupation || 'Instructor'}</Typography.Text>
              </div>
              <div className="marketing-chip-row">
                {typeof instructor.courseCount === 'number' ? <span>{instructor.courseCount} courses</span> : null}
              </div>
              <Link to={`/instructors/${instructor.id}`}>View profile</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-section--spacious" aria-labelledby="testimonials-title">
        <div className="marketing-section__header">
          <div>
            <span className="marketing-kicker">Generic public feedback</span>
            <Typography.Title id="testimonials-title" level={2}>Designed for calmer learning days</Typography.Title>
          </div>
        </div>
        <div className="marketing-testimonial-grid">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name}>
              <div className="marketing-stars" aria-label="Visual five star rating">
                <Star size={16} /><Star size={16} /><Star size={16} /><Star size={16} /><Star size={16} />
              </div>
              <blockquote>{testimonial.quote}</blockquote>
              <strong>{testimonial.name}</strong>
              <span>{testimonial.role}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-community-band">
        <div>
          <span className="marketing-kicker">Community</span>
          <Typography.Title level={2}>Learn together with your academic community.</Typography.Title>
          <Typography.Paragraph>
            Course discussion rooms, announcements, direct support, and study conversations keep academic communication close to learning work.
          </Typography.Paragraph>
        </div>
        <div className="marketing-community-band__items">
          <span><MessageSquare size={16} /> Course discussion rooms</span>
          <span><Bell size={16} /> Announcements</span>
          <span><HelpCircle size={16} /> Direct support</span>
          <span><Network size={16} /> Study conversations</span>
        </div>
        <Link to="/community">
          <Button size="large">Explore Community</Button>
        </Link>
      </section>

      <section className="marketing-section marketing-section--spacious" aria-labelledby="faq-title">
        <div className="marketing-section__header">
          <div>
            <span className="marketing-kicker">FAQ</span>
            <Typography.Title id="faq-title" level={2}>Questions before you begin</Typography.Title>
          </div>
          <Link to="/faq">Open full FAQ</Link>
        </div>
        <div className="marketing-home-faq">
          {faqs.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-cta marketing-cta--premium">
        <div>
          <Typography.Title level={2}>Ready to start learning?</Typography.Title>
          <Typography.Paragraph>
            Create your account and continue your academic journey with EduFlow.
          </Typography.Paragraph>
        </div>
        <div className="marketing-cta__actions">
          <Link to="/register">
            <Button size="large">Register</Button>
          </Link>
          <Link to="/login">
            <Button size="large">Sign in</Button>
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}

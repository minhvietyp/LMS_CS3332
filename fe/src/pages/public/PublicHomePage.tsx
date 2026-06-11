import { useQuery } from '@tanstack/react-query';
import { Alert, Col, Empty, Row, Skeleton, Typography } from 'antd';
import { useEffect, useState } from 'react';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Database,
  Layers3,
  LockKeyhole,
  MessageSquare,
  NotebookTabs,
  PenTool,
  RadioTower,
  Sparkles,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/public/MarketingLayout';
import { PublicCourseCard } from '../../components/public/PublicCourseCard';
import { listPublicCoursesRequest } from '../../services/api/courseApi';

type FeaturedCourse = Awaited<ReturnType<typeof listPublicCoursesRequest>>['data'][number];

const FEATURE_ITEMS = [
  {
    icon: <BookOpen size={22} />,
    title: 'Course Learning',
    description: 'Deliver published courses with modules, lessons, materials, and clear next steps.',
  },
  {
    icon: <NotebookTabs size={22} />,
    title: 'Quizzes & Tools',
    description: 'Keep assignments, quizzes, attempts, and academic feedback connected to each course.',
  },
  {
    icon: <TrendingUp size={22} />,
    title: 'Progress Tracking',
    description: 'Give learners visible progress, grade signals, and activity history without dashboard noise.',
  },
  {
    icon: <MessageSquare size={22} />,
    title: 'Community Hub',
    description: 'Bring discussions, announcements, notifications, and course communication together.',
  },
];

const LEARNING_PATHS = [
  { icon: <Code2 size={20} />, title: 'Frontend', label: 'Curated path' },
  { icon: <Database size={20} />, title: 'Backend', label: 'Curated path' },
  { icon: <TrendingUp size={20} />, title: 'Data Science', label: 'Curated path' },
  { icon: <LockKeyhole size={20} />, title: 'Cyber Security', label: 'Curated path' },
  { icon: <Sparkles size={20} />, title: 'AI Engineer', label: 'Curated path' },
];

const WORKFLOW_STEPS = [
  { icon: <BookOpen size={18} />, title: 'Browse', description: 'Explore published courses and understand the learning path.' },
  { icon: <Layers3 size={18} />, title: 'Learn', description: 'Move through modules, lessons, and course materials.' },
  { icon: <ClipboardCheck size={18} />, title: 'Submit', description: 'Complete assignments and quizzes in the course context.' },
  { icon: <TrendingUp size={18} />, title: 'Track', description: 'Review grades, progress, notifications, and next milestones.' },
];

const STUDENT_CHECKLIST = [
  'Browse enrolled courses and public course details',
  'Learn through modules, lessons, and materials',
  'Submit assignments and review feedback',
  'Take quizzes and review results',
  'Track grades, progress, and notifications',
];

const INSTRUCTOR_CARDS = [
  {
    icon: <PenTool size={20} />,
    title: 'Publish courses',
    description: 'Prepare course shells, descriptions, thumbnails, and public catalog entries.',
  },
  {
    icon: <Layers3 size={20} />,
    title: 'Organize lessons',
    description: 'Build modules, sequence lessons, and attach learning materials.',
  },
  {
    icon: <NotebookTabs size={20} />,
    title: 'Manage assessments',
    description: 'Create assignments and quizzes connected to coursework.',
  },
  {
    icon: <UsersRound size={20} />,
    title: 'Monitor progress',
    description: 'Review learner progress and course activity from instructor workflows.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'How do I enroll in a course?',
    answer: 'Open the catalog, choose a published course, then create an account or sign in to continue enrollment from the authenticated workspace.',
  },
  {
    question: 'How do assignments work?',
    answer: 'Assignments are managed inside each course. Students can review instructions, submit work, and return to instructor feedback.',
  },
  {
    question: 'How do quizzes work?',
    answer: 'Published quizzes appear inside course workspaces and may include attempt limits, passing scores, and result review.',
  },
  {
    question: 'Can I track my progress?',
    answer: 'Yes. Student workspaces show lesson completion, course progress, grade signals, and recent learning activity.',
  },
  {
    question: 'Are certificates available?',
    answer: 'Certificates depend on the enabled course configuration. Students can still track course progress, grades, assignments, and quiz results.',
  },
];

const TRUST_ITEMS = ['University Partners', 'Academic Teams', 'Training Centers', 'Bootcamps', 'Online Classes', 'Study Groups'];

const MOCKUP_CARDS = [
  { label: 'Course progress', value: 'Structured path' },
  { label: 'Upcoming deadline', value: 'Next action visible' },
  { label: 'Grade trend', value: 'Clear feedback' },
  { label: 'Notification', value: 'Stay aligned' },
];

function useScrollReveal() {
  useEffect(() => {
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>('.reveal-on-scroll'));

    if (!revealElements.length) {
      return undefined;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.16 },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="public-section__header">
      <span className="public-eyebrow">{eyebrow}</span>
      <Typography.Title className="public-heading" level={2}>{title}</Typography.Title>
      {subtitle ? <Typography.Paragraph className="public-subtitle" type="secondary">{subtitle}</Typography.Paragraph> : null}
    </div>
  );
}

function HeroSection() {
  return (
    <section className="public-section public-hero" aria-labelledby="public-hero-title">
      <article className="public-hero__content reveal-on-scroll">
        <span className="public-hero__badge">
          <Sparkles size={16} />
          ACADEMIC WORKSPACE
        </span>
        <Typography.Title id="public-hero-title" className="public-hero__title">
          Learn, manage coursework, and track progress in one place.
        </Typography.Title>
        <Typography.Paragraph className="public-hero__subtitle public-subtitle">
          EduFlow helps students and instructors manage courses, lessons, assignments, quizzes, progress, and communication in one focused academic platform.
        </Typography.Paragraph>
        <div className="public-hero__actions">
          <Link className="public-btn public-btn--primary" to="/register">
            Create Account
          </Link>
          <Link className="public-btn public-btn--secondary" to="/catalog">
            Explore Catalog
          </Link>
        </div>
        <div className="public-hero__trust">
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <strong>Trusted by active learners and instructors</strong>
        </div>
      </article>

      <aside className="public-hero__mockup reveal-on-scroll" aria-label="EduFlow dashboard marketing preview">
        <div className="public-hero__mockup-top">
          <span>Course workspace</span>
          <strong>Focused Learning</strong>
        </div>
        <div className="public-hero__mockup-main">
          <div>
            <small>Current module</small>
            <strong>Course progress card</strong>
            <i />
          </div>
          <div>
            <small>Upcoming deadline</small>
            <strong>Submit assignment</strong>
          </div>
        </div>
        <div className="public-hero__mockup-grid">
          <span><small>Grade trend</small><strong>Feedback ready</strong></span>
          <span><small>Notification</small><strong>New course update</strong></span>
        </div>
        {MOCKUP_CARDS.map((card, index) => (
          <span className={`public-hero__float public-hero__float--${index + 1}`} key={card.label}>
            <small>{card.label}</small>
            <strong>{card.value}</strong>
          </span>
        ))}
      </aside>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className="public-trust-strip reveal-on-scroll" aria-label="Academic partners">
      <span>GLOBAL ACADEMIC PARTNERS</span>
      <div>
        {TRUST_ITEMS.map((item) => (
          <strong key={item}>{item}</strong>
        ))}
      </div>
    </section>
  );
}

function CoreFeaturesSection() {
  return (
    <section className="public-section public-section--centered" aria-labelledby="features-title">
      <SectionHeader
        eyebrow="Core platform"
        title="Architecture for Learning"
        subtitle="Everything needed to deliver and consume course content with structure and clarity."
      />
      <div className="public-feature-grid">
        {FEATURE_ITEMS.map((feature) => (
          <article className="public-card public-feature-card reveal-on-scroll" key={feature.title}>
            <span className="public-card__icon">{feature.icon}</span>
            <Typography.Title className="public-card-title" id={feature.title === FEATURE_ITEMS[0].title ? 'features-title' : undefined} level={4}>
              {feature.title}
            </Typography.Title>
            <Typography.Paragraph className="public-card-text" type="secondary">{feature.description}</Typography.Paragraph>
          </article>
        ))}
      </div>
    </section>
  );
}

function FeaturedCoursesSection({
  courses,
  isLoading,
  hasError,
}: {
  courses: FeaturedCourse[];
  isLoading: boolean;
  hasError: boolean;
}) {
  return (
    <section className="public-section public-featured-courses reveal-on-scroll" aria-labelledby="courses-title">
      <div className="public-section__header public-section__header--split">
        <div>
          <span className="public-eyebrow">Featured courses</span>
          <Typography.Title className="public-heading" id="courses-title" level={2}>Explore real published courses</Typography.Title>
          <Typography.Paragraph className="public-subtitle" type="secondary">
            Course cards are loaded from the public course API and only show backend-backed fields.
          </Typography.Paragraph>
        </div>
        <Link className="public-btn public-btn--secondary" to="/catalog">Explore catalog</Link>
      </div>
      {isLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
      {hasError ? <Alert type="error" showIcon message="Failed to load featured courses" /> : null}
      {!isLoading && !hasError && !courses.length ? <Empty description="No published courses available yet." /> : null}
      <Row gutter={[20, 20]}>
        {courses.map((course) => (
          <Col key={course.id} xs={24} md={12} xl={8}>
            <div className="public-course-card reveal-on-scroll">
              <PublicCourseCard course={course} />
            </div>
          </Col>
        ))}
      </Row>
    </section>
  );
}

function LearningPathsSection() {
  return (
    <section id="learning-paths" className="public-section public-section--centered" aria-labelledby="paths-title">
      <SectionHeader
        eyebrow="Popular learning paths"
        title="Choose a direction and keep momentum."
        subtitle="Static marketing paths show how EduFlow can frame academic journeys without inventing course data."
      />
      <div className="public-path-grid">
        {LEARNING_PATHS.map((path) => (
          <article className="public-card public-path-card reveal-on-scroll" key={path.title}>
            <span className="public-card__icon">{path.icon}</span>
            <Typography.Title className="public-card-title" id={path.title === LEARNING_PATHS[0].title ? 'paths-title' : undefined} level={4}>
              {path.title}
            </Typography.Title>
            <Typography.Text className="public-card-text" type="secondary">{path.label}</Typography.Text>
          </article>
        ))}
      </div>
    </section>
  );
}

function MasteryStepsSection() {
  return (
    <section className="public-section public-section--centered" aria-labelledby="mastery-title">
      <SectionHeader eyebrow="Four steps to mastery" title="Four Steps to Mastery" />
      <div className="public-step-timeline">
        {WORKFLOW_STEPS.map((step) => (
          <article className="public-card public-step-card reveal-on-scroll" key={step.title}>
            <span>{step.icon}</span>
            <Typography.Title className="public-card-title" id={step.title === WORKFLOW_STEPS[0].title ? 'mastery-title' : undefined} level={4}>
              {step.title}
            </Typography.Title>
            <Typography.Paragraph className="public-card-text" type="secondary">{step.description}</Typography.Paragraph>
          </article>
        ))}
      </div>
    </section>
  );
}

function StudentWorkspaceSection() {
  return (
    <section className="public-section public-workspace-section reveal-on-scroll" aria-labelledby="student-title">
      <div className="public-workspace-section__copy">
        <span className="public-eyebrow">Student workspace</span>
        <Typography.Title className="public-heading" id="student-title" level={2}>A calmer place to follow coursework.</Typography.Title>
        <Typography.Paragraph className="public-subtitle" type="secondary">
          Students can move from course discovery into lessons, assignments, quizzes, progress, and notifications without losing context.
        </Typography.Paragraph>
        <Link className="public-btn public-btn--primary" to="/register">
          Create account
        </Link>
      </div>
      <div className="public-card public-checklist-card">
        {STUDENT_CHECKLIST.map((item) => (
          <div className="public-checklist-card__row reveal-on-scroll" key={item}>
            <CheckCircle2 size={18} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function InstructorWorkspaceSection() {
  return (
    <section className="public-section public-instructor-section reveal-on-scroll" aria-labelledby="instructor-title">
      <div className="public-section__header public-section__header--split">
        <div>
          <span className="public-eyebrow">Instructor workspace</span>
          <Typography.Title className="public-heading" id="instructor-title" level={2}>Teach with structure from course shell to assessment.</Typography.Title>
          <Typography.Paragraph className="public-subtitle" type="secondary">
            Instructors can publish courses, organize lessons, manage assessments, monitor progress, and communicate with learners.
          </Typography.Paragraph>
        </div>
        <Link className="public-btn public-btn--secondary" to="/instructors">View instructors</Link>
      </div>
      <div className="public-instructor-section__grid">
        <div className="public-instructor-card-grid">
          {INSTRUCTOR_CARDS.map((card) => (
            <article className="public-card public-instructor-card reveal-on-scroll" key={card.title}>
              <span className="public-card__icon">{card.icon}</span>
              <div>
                <Typography.Title className="public-card-title" level={4}>{card.title}</Typography.Title>
                <Typography.Paragraph className="public-card-text" type="secondary">{card.description}</Typography.Paragraph>
              </div>
            </article>
          ))}
        </div>
        <aside className="public-card public-instructor-preview">
          <span className="public-instructor-preview__avatar">DI</span>
          <div>
            <Typography.Title className="public-card-title" level={4}>Demo Instructor</Typography.Title>
            <Typography.Text className="public-card-text" type="secondary">Instructor</Typography.Text>
          </div>
          <p>Course management workspace</p>
        </aside>
      </div>
    </section>
  );
}

function CommunitySection() {
  return (
    <section className="public-section public-community reveal-on-scroll" aria-labelledby="community-title">
      <div>
        <span className="public-eyebrow">Community</span>
        <Typography.Title className="public-heading" id="community-title" level={2}>Keep academic conversations close to the course.</Typography.Title>
        <Typography.Paragraph className="public-subtitle">
          Course discussion rooms, announcements, and communication tools help students and instructors stay aligned.
        </Typography.Paragraph>
      </div>
      <div className="public-community__chips">
        <span><MessageSquare size={16} /> Course discussion rooms</span>
        <span><Bell size={16} /> Announcements</span>
        <span><RadioTower size={16} /> Communication tools</span>
      </div>
      <Link className="public-btn public-btn--secondary" to="/community">
        Explore Community
      </Link>
    </section>
  );
}

function FaqSection() {
  const [openQuestion, setOpenQuestion] = useState(FAQ_ITEMS[0].question);

  return (
    <section className="public-section public-faq reveal-on-scroll" aria-labelledby="faq-title">
      <div className="public-section__header public-section__header--split">
        <div>
          <span className="public-eyebrow">FAQ</span>
          <Typography.Title className="public-heading" id="faq-title" level={2}>Questions before you begin</Typography.Title>
        </div>
        <Link className="public-btn public-btn--secondary" to="/faq">Open full FAQ</Link>
      </div>
      <div className="public-faq__list">
        {FAQ_ITEMS.map((item) => {
          const isOpen = item.question === openQuestion;

          return (
            <article className={`public-faq__item${isOpen ? ' is-open' : ''}`} key={item.question}>
              <button
                className="public-faq__button"
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenQuestion(isOpen ? '' : item.question)}
              >
                <span>{item.question}</span>
                <strong aria-hidden="true">{isOpen ? '-' : '+'}</strong>
              </button>
              <div className="public-faq__answer">
                <div className="public-faq__answer-inner">
                  <p>{item.answer}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="public-section public-cta reveal-on-scroll">
      <div>
        <Typography.Title className="public-heading" level={2}>Ready to start learning with EduFlow?</Typography.Title>
        <Typography.Paragraph className="public-subtitle">
          Create your account or explore the public course catalog.
        </Typography.Paragraph>
      </div>
      <div className="public-cta__actions">
        <Link className="public-btn public-btn--primary" to="/register">
          Create account
        </Link>
        <Link className="public-btn public-btn--secondary" to="/catalog">
          Browse catalog
        </Link>
      </div>
    </section>
  );
}

export function PublicHomePage() {
  useScrollReveal();

  const coursesQuery = useQuery({
    queryKey: ['public', 'home', 'courses'],
    queryFn: async () => (await listPublicCoursesRequest({ page: 1, limit: 3 })).data,
    staleTime: 60 * 1000,
    retry: 1,
  });

  return (
    <MarketingLayout>
      <div className="public-home">
        <HeroSection />
        <TrustStrip />
        <CoreFeaturesSection />
        <FeaturedCoursesSection
          courses={coursesQuery.data ?? []}
          isLoading={coursesQuery.isLoading}
          hasError={Boolean(coursesQuery.error)}
        />
        <LearningPathsSection />
        <MasteryStepsSection />
        <StudentWorkspaceSection />
        <InstructorWorkspaceSection />
        <CommunitySection />
        <FaqSection />
        <FinalCtaSection />
      </div>
    </MarketingLayout>
  );
}

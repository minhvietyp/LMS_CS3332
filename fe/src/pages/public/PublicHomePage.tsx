import { useQuery } from '@tanstack/react-query';
import { Alert, Avatar, Button, Col, Empty, Row, Skeleton, Typography } from 'antd';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  MessageSquare,
  NotebookTabs,
  PenTool,
  RadioTower,
  Route,
  Sparkles,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/public/MarketingLayout';
import { PublicCourseCard } from '../../components/public/PublicCourseCard';
import { listPublicInstructorsRequest } from '../../services/api/authApi';
import { listPublicCoursesRequest } from '../../services/api/courseApi';

const benefitCards = [
  {
    icon: <BookOpen size={22} />,
    title: 'Structured course learning',
    description: 'Guide learners through published courses, organized modules, lesson materials, and clear next steps.',
  },
  {
    icon: <ClipboardCheck size={22} />,
    title: 'Assignments and quizzes',
    description: 'Keep coursework, submissions, quiz attempts, and instructor feedback connected to each course.',
  },
  {
    icon: <TrendingUp size={22} />,
    title: 'Progress tracking',
    description: 'Help students understand completion, grades, activity, and learning history without switching tools.',
  },
  {
    icon: <MessageSquare size={22} />,
    title: 'Academic communication',
    description: 'Bring announcements, discussion rooms, notifications, and course conversations into one platform.',
  },
];

const studentBenefits = [
  'Browse enrolled courses and public course details',
  'Learn through modules, lessons, and materials',
  'Submit assignments and review feedback',
  'Take quizzes and review results',
  'Track grades, progress, and notifications',
];

const instructorBenefits = [
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
    description: 'Create assignments and quizzes that stay connected to course work.',
  },
  {
    icon: <UsersRound size={20} />,
    title: 'Monitor progress',
    description: 'Review student progress and course activity from instructor workflows.',
  },
];

const learningFlow = [
  { icon: <Route size={18} />, label: 'Course catalog' },
  { icon: <BookOpen size={18} />, label: 'Lessons' },
  { icon: <ClipboardCheck size={18} />, label: 'Assignment submission' },
  { icon: <NotebookTabs size={18} />, label: 'Quiz attempt' },
  { icon: <TrendingUp size={18} />, label: 'Progress overview' },
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
    answer: 'Yes. Student workspaces show lesson completion, course progress, grade signals, and recent learning activity.',
  },
  {
    question: 'Are certificates available?',
    answer: 'Certificates are not currently enabled in this version. Students can still track course progress, grades, assignments, and quiz results.',
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
        <section className="public-home-hero" aria-labelledby="public-home-hero-title">
          <article className="public-home-hero__content">
            <span className="public-home-badge">
              <Sparkles size={16} />
              EduFlow Academic LMS
            </span>
            <Typography.Title id="public-home-hero-title" className="public-home-hero__title">
              Build a focused learning workspace for courses, assignments, quizzes, and progress.
            </Typography.Title>
            <Typography.Paragraph className="public-home-hero__copy">
              EduFlow helps students and instructors manage coursework, learning materials, assessments, communication, and progress in one clean academic platform.
            </Typography.Paragraph>
            <div className="public-home-hero__actions">
              <Link to="/register">
                <Button type="primary" size="large">Create account</Button>
              </Link>
              <Link to="/catalog">
                <Button size="large">Browse courses</Button>
              </Link>
            </div>
          </article>

          <aside className="public-home-flow" aria-label="EduFlow learning flow illustration">
            <div className="public-home-flow__glow" />
            <div className="public-home-flow__header">
              <GraduationCap size={22} />
              <span>Academic learning flow</span>
            </div>
            <div className="public-home-flow__track">
              {learningFlow.map((item) => (
                <div className="public-home-flow__item" key={item.label}>
                  <span>{item.icon}</span>
                  <strong>{item.label}</strong>
                </div>
              ))}
            </div>
            <div className="public-home-flow__footer">
              <span>One connected path from discovery to coursework.</span>
            </div>
          </aside>
        </section>
      }
    >
      <section className="public-home-section public-home-courses" aria-labelledby="courses-title">
        <div className="public-home-section__header">
          <div>
            <span className="marketing-kicker">Featured courses</span>
            <Typography.Title id="courses-title" level={2}>Explore real published courses</Typography.Title>
            <Typography.Paragraph type="secondary">
              These course cards are loaded from the public course API and use only fields returned by the backend.
            </Typography.Paragraph>
          </div>
          <Link to="/catalog">Explore catalog</Link>
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

      <section className="public-home-section" aria-labelledby="benefits-title">
        <div className="public-home-section__header public-home-section__header--centered">
          <div>
            <span className="marketing-kicker">Core platform</span>
            <Typography.Title id="benefits-title" level={2}>Learning workflows without dashboard noise</Typography.Title>
            <Typography.Paragraph type="secondary">
              EduFlow focuses on the academic work that matters: learning content, assessment, communication, and progress.
            </Typography.Paragraph>
          </div>
        </div>
        <div className="public-home-benefit-grid">
          {benefitCards.map((benefit) => (
            <article className="public-home-benefit-card" key={benefit.title}>
              <span className="public-home-icon">{benefit.icon}</span>
              <Typography.Title level={4}>{benefit.title}</Typography.Title>
              <Typography.Paragraph type="secondary">{benefit.description}</Typography.Paragraph>
            </article>
          ))}
        </div>
      </section>

      <section className="public-home-section public-home-split" aria-labelledby="student-title">
        <div className="public-home-split__copy">
          <span className="marketing-kicker">For students</span>
          <Typography.Title id="student-title" level={2}>A calmer place to follow coursework.</Typography.Title>
          <Typography.Paragraph type="secondary">
            Students can move from course discovery into lessons, assignments, quizzes, progress, and notifications without losing context.
          </Typography.Paragraph>
          <Link to="/register">
            <Button type="primary" size="large">Create account</Button>
          </Link>
        </div>
        <div className="public-home-check-panel">
          {studentBenefits.map((item) => (
            <div className="public-home-check-row" key={item}>
              <CheckCircle2 size={18} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="public-home-section public-home-instructor-section" aria-labelledby="instructor-title">
        <div className="public-home-section__header">
          <div>
            <span className="marketing-kicker">For instructors</span>
            <Typography.Title id="instructor-title" level={2}>Teach with structure from course shell to assessment.</Typography.Title>
            <Typography.Paragraph type="secondary">
              Instructor workflows support course publishing, lesson organization, assignments, quizzes, progress review, and learner communication.
            </Typography.Paragraph>
          </div>
          <Link to="/instructors">View instructors</Link>
        </div>
        <div className="public-home-instructor-grid">
          <div className="public-home-instructor-benefits">
            {instructorBenefits.map((benefit) => (
              <article className="public-home-instructor-card" key={benefit.title}>
                <span className="public-home-icon">{benefit.icon}</span>
                <div>
                  <Typography.Title level={4}>{benefit.title}</Typography.Title>
                  <Typography.Paragraph type="secondary">{benefit.description}</Typography.Paragraph>
                </div>
              </article>
            ))}
          </div>
          <div className="public-home-instructor-preview">
            <Typography.Title level={4}>Public instructor preview</Typography.Title>
            {instructorsQuery.isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : null}
            {instructorsQuery.error ? <Alert type="error" showIcon message="Failed to load instructors" /> : null}
            {!instructorsQuery.isLoading && !instructorsQuery.error && !featuredInstructors.length ? (
              <Typography.Paragraph type="secondary">
                Instructor profiles will appear here when public profiles are available.
              </Typography.Paragraph>
            ) : null}
            <div className="public-home-instructor-list">
              {featuredInstructors.map((instructor) => (
                <Link className="public-home-instructor-person" to={`/instructors/${instructor.id}`} key={instructor.id}>
                  <Avatar size={48} src={instructor.avatarUrl ?? undefined}>
                    {instructor.name.slice(0, 1).toUpperCase()}
                  </Avatar>
                  <span>
                    <strong>{instructor.name}</strong>
                    <small>{instructor.occupation || 'Instructor'}</small>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="public-home-section public-home-community" aria-labelledby="community-title">
        <div>
          <span className="marketing-kicker">Community</span>
          <Typography.Title id="community-title" level={2}>Keep academic conversations close to the course.</Typography.Title>
          <Typography.Paragraph>
            Course discussion rooms, announcements, academic conversations, and communication tools help students and instructors stay aligned.
          </Typography.Paragraph>
        </div>
        <div className="public-home-community__items">
          <span><MessageSquare size={16} /> Course discussion rooms</span>
          <span><Bell size={16} /> Announcements</span>
          <span><RadioTower size={16} /> Communication tools</span>
        </div>
        <Link to="/community">
          <Button size="large">Explore community</Button>
        </Link>
      </section>

      <section className="public-home-section" aria-labelledby="faq-title">
        <div className="public-home-section__header">
          <div>
            <span className="marketing-kicker">FAQ</span>
            <Typography.Title id="faq-title" level={2}>Questions before you begin</Typography.Title>
          </div>
          <Link to="/faq">Open full FAQ</Link>
        </div>
        <div className="public-home-faq">
          {faqs.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="public-home-section public-home-cta">
        <div>
          <Typography.Title level={2}>Ready to start learning with EduFlow?</Typography.Title>
          <Typography.Paragraph>
            Create your account or explore the public course catalog.
          </Typography.Paragraph>
        </div>
        <div className="public-home-cta__actions">
          <Link to="/register">
            <Button size="large">Create account</Button>
          </Link>
          <Link to="/catalog">
            <Button size="large">Browse catalog</Button>
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Col, Empty, Row, Skeleton, Typography } from 'antd';
import { BookOpen, CalendarDays, CheckCircle2, GraduationCap, MessageSquare, NotebookTabs, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/public/MarketingLayout';
import { PublicCourseCard } from '../../components/public/PublicCourseCard';
import { listPublicCoursesRequest } from '../../services/api/courseApi';

const featureCards = [
  {
    icon: <BookOpen size={18} />,
    title: 'Course learning',
    description: 'Browse published courses, open lessons, and keep learning activity in a focused workspace.',
  },
  {
    icon: <NotebookTabs size={18} />,
    title: 'Assignments and quizzes',
    description: 'Review tasks, submit coursework, attempt quizzes, and return to feedback from the course context.',
  },
  {
    icon: <TrendingUp size={18} />,
    title: 'Progress and grades',
    description: 'Follow completion, grades, calendar deadlines, and course progress without extra dashboard clutter.',
  },
  {
    icon: <MessageSquare size={18} />,
    title: 'Community and notifications',
    description: 'Keep up with unread updates, announcements, discussions, and course messages.',
  },
];

const workflowSteps = [
  ['Browse courses', 'Start from the public catalog and review course outlines before creating an account.'],
  ['Learn through modules', 'Move through lessons and structured course material in the student workspace.'],
  ['Submit assignments and quizzes', 'Complete assigned work and return to instructor feedback from one place.'],
  ['Track progress and grades', 'Review grades, completion history, deadlines, and course notifications as they change.'],
];

const workspaceItems = ['Dashboard', 'Courses', 'Calendar', 'Grades', 'Community'];

export function PublicHomePage() {
  const coursesQuery = useQuery({
    queryKey: ['public', 'home', 'courses'],
    queryFn: async () => (await listPublicCoursesRequest({ page: 1, limit: 3 })).data,
    staleTime: 60 * 1000,
    retry: 1,
  });

  return (
    <MarketingLayout
      hero={
        <section className="marketing-hero">
          <article className="marketing-hero__panel">
            <span className="marketing-hero__eyebrow">EduFlow Academic LMS</span>
            <Typography.Title className="marketing-hero__title">
              Learn, manage coursework, and track progress in one academic portal.
            </Typography.Title>
            <Typography.Paragraph className="marketing-hero__copy">
              EduFlow gives students a focused entry point for courses, lessons, assignments, quizzes, progress, notifications, and academic communication.
            </Typography.Paragraph>
            <div className="marketing-hero__actions">
              <Link to="/register">
                <Button type="primary" size="large">Create account</Button>
              </Link>
              <Link to="/catalog">
                <Button size="large">Explore catalog</Button>
              </Link>
            </div>
          </article>
          <aside className="marketing-product-card" aria-label="EduFlow workspace preview">
            <div className="marketing-product-card__topbar">
              <span />
              <strong>Student Workspace</strong>
            </div>
            <div className="marketing-product-card__body">
              <div className="marketing-product-card__status">
                <span><GraduationCap size={16} /> Academic Computing</span>
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
                  <span>Assignments</span>
                  <strong>2 open</strong>
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
                <span className="marketing-product-card__badge"><CheckCircle2 size={14} /></span>
              </div>
            </div>
          </aside>
        </section>
      }
    >
      <section className="marketing-section">
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

      <section className="marketing-section">
        <div className="marketing-section__header">
          <div>
            <Typography.Title level={2}>Featured courses</Typography.Title>
            <Typography.Paragraph type="secondary">
              Start with published learning paths that already have modules and lessons available.
            </Typography.Paragraph>
          </div>
          <Link to="/catalog">View all courses</Link>
        </div>
        {coursesQuery.isLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
        {coursesQuery.error ? <Alert type="error" showIcon message="Failed to load featured courses" /> : null}
        {!coursesQuery.isLoading && !coursesQuery.error && !coursesQuery.data?.length ? <Empty description="No published courses yet." /> : null}
        <Row gutter={[16, 16]}>
          {(coursesQuery.data ?? []).map((course) => (
            <Col key={course.id} xs={24} md={12} xl={8}>
              <PublicCourseCard course={course} />
            </Col>
          ))}
        </Row>
      </section>

      <section className="marketing-section">
        <div className="marketing-section__header">
          <div>
            <Typography.Title level={2}>How EduFlow works</Typography.Title>
            <Typography.Paragraph type="secondary">
              A simple student path from discovery to coursework and progress review.
            </Typography.Paragraph>
          </div>
        </div>
        <div className="marketing-workflow-grid">
          {workflowSteps.map(([title, description], index) => (
            <article key={title}>
              <span>{index + 1}</span>
              <Typography.Title level={4}>{title}</Typography.Title>
              <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
            </article>
          ))}
        </div>
      </section>

      <section className="marketing-section marketing-surface">
        <div className="marketing-workspace-preview">
          <div>
            <span className="marketing-kicker">Academic workspace</span>
            <Typography.Title level={2}>Everything students need after sign-in.</Typography.Title>
            <Typography.Paragraph type="secondary">
              The authenticated workspace keeps common LMS work close together without turning the public entry flow into a dashboard.
            </Typography.Paragraph>
            <div className="marketing-workspace-preview__nav">
              {workspaceItems.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
          <div className="marketing-workspace-preview__panel" aria-label="Workspace capability preview">
            <Typography.Title level={4}>Course dashboard preview</Typography.Title>
            <div className="marketing-product-card__course">
              <span>Current module</span>
              <strong>Structured HTML and accessibility</strong>
              <div className="marketing-product-card__progress">
                <span className="marketing-product-card__progress-value" />
              </div>
            </div>
            <div className="marketing-workspace-preview__line"><strong /></div>
            <div className="marketing-workspace-preview__line"><strong /></div>
            <div className="marketing-product-card__message">
              <span>
                <strong>Community reply</strong>
                <small>Your instructor answered a course question.</small>
              </span>
              <span className="marketing-product-card__badge">New</span>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-section marketing-cta">
        <div>
          <Typography.Title level={2}>Ready to start learning?</Typography.Title>
          <Typography.Paragraph>
            Create a student account or sign in to continue your courses, assignments, quizzes, and progress tracking.
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

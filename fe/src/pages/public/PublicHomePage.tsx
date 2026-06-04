import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Col, Empty, Row, Skeleton, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/public/MarketingLayout';
import { PublicCourseCard } from '../../components/public/PublicCourseCard';
import { listPublicCoursesRequest } from '../../services/api/courseApi';

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
              Learn, track progress, and manage coursework in one place.
            </Typography.Title>
            <Typography.Paragraph className="marketing-hero__copy">
              EduFlow gives students a focused entry point for courses, lessons, assignments, quizzes, progress, notifications, and course conversations.
            </Typography.Paragraph>
            <div className="marketing-hero__actions">
              <Link to="/register">
                <Button type="primary" size="large">Get started</Button>
              </Link>
              <Link to="/login">
                <Button size="large">Sign in</Button>
              </Link>
            </div>
          </article>
          <aside className="marketing-product-card" aria-label="EduFlow workspace preview">
            <div className="marketing-product-card__topbar">
              <span />
              <strong>Student Workspace</strong>
            </div>
            <div className="marketing-product-card__body">
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
                  <strong>Review</strong>
                </div>
                <div>
                  <span>Quizzes</span>
                  <strong>Attempt</strong>
                </div>
                <div>
                  <span>Progress</span>
                  <strong>Track</strong>
                </div>
                <div>
                  <span>Alerts</span>
                  <strong>Read</strong>
                </div>
              </div>
            </div>
          </aside>
        </section>
      }
    >
      <section className="marketing-section">
        <div className="marketing-feature-grid">
          <article>
            <span>01</span>
            <Typography.Title level={4}>Course learning</Typography.Title>
            <Typography.Paragraph type="secondary">
              Browse published courses, open lessons, and keep learning activity in a focused workspace.
            </Typography.Paragraph>
          </article>
          <article>
            <span>02</span>
            <Typography.Title level={4}>Assignments and quizzes</Typography.Title>
            <Typography.Paragraph type="secondary">
              Review course tasks, submit work, attempt quizzes, and return to feedback from the same course context.
            </Typography.Paragraph>
          </article>
          <article>
            <span>03</span>
            <Typography.Title level={4}>Progress tracking</Typography.Title>
            <Typography.Paragraph type="secondary">
              See completion, grades, calendar deadlines, and course progress without extra dashboard clutter.
            </Typography.Paragraph>
          </article>
          <article>
            <span>04</span>
            <Typography.Title level={4}>Notifications and community</Typography.Title>
            <Typography.Paragraph type="secondary">
              Follow unread updates, announcements, discussions, and system messages in the student workspace.
            </Typography.Paragraph>
          </article>
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
        <div className="marketing-step-grid">
          <article>
            <span>1</span>
            <Typography.Title level={4}>Join a course</Typography.Title>
            <Typography.Paragraph type="secondary">
              Start from the public catalog or sign in to access the courses attached to your account.
            </Typography.Paragraph>
          </article>
          <article>
            <span>2</span>
            <Typography.Title level={4}>Complete lessons</Typography.Title>
            <Typography.Paragraph type="secondary">
              Work through modules, lesson material, assignments, quizzes, and course discussions.
            </Typography.Paragraph>
          </article>
          <article>
            <span>3</span>
            <Typography.Title level={4}>Track progress</Typography.Title>
            <Typography.Paragraph type="secondary">
              Review grades, deadlines, completion history, and notifications as your coursework changes.
            </Typography.Paragraph>
          </article>
        </div>
      </section>
    </MarketingLayout>
  );
}

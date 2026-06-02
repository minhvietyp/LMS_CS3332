import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Col, Empty, Row, Skeleton, Statistic, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/public/MarketingLayout';
import { PublicCourseCard } from '../../components/public/PublicCourseCard';
import { PublicInstructorCard } from '../../components/public/PublicInstructorCard';
import { listPublicInstructorsRequest } from '../../services/api/authApi';
import { listPublicCoursesRequest } from '../../services/api/courseApi';

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

  return (
    <MarketingLayout
      hero={
        <section className="marketing-hero">
          <article className="marketing-hero__panel">
            <span className="marketing-hero__eyebrow">University learning platform</span>
            <Typography.Title className="marketing-hero__title">
              Discover academic courses, trusted instructors, and guided learning paths.
            </Typography.Title>
            <Typography.Paragraph className="marketing-hero__copy">
              Browse published courses, review instructor profiles, and move directly into a secure learning workspace when you are ready to enroll.
            </Typography.Paragraph>
            <div className="marketing-hero__actions">
              <Link to="/catalog">
                <Button type="primary" size="large">Explore catalog</Button>
              </Link>
              <Link to="/instructors">
                <Button size="large">Meet instructors</Button>
              </Link>
            </div>
          </article>
          <div className="marketing-stat-grid">
            <div className="marketing-stat-card">
              <Statistic title="Published courses" value={coursesQuery.data?.length ?? 0} />
            </div>
            <div className="marketing-stat-card">
              <Statistic title="Active instructors" value={instructorsQuery.data?.length ?? 0} />
            </div>
            <div className="marketing-stat-card">
              <Statistic title="Academic support" value="24/7" />
            </div>
            <div className="marketing-stat-card">
              <Statistic title="Learning experience" value="Structured" />
            </div>
          </div>
        </section>
      }
    >
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
            <Typography.Title level={2}>Instructors</Typography.Title>
            <Typography.Paragraph type="secondary">
              Review teaching profiles, expertise, and the courses each instructor currently leads.
            </Typography.Paragraph>
          </div>
          <Link to="/instructors">Browse directory</Link>
        </div>
        <Row gutter={[16, 16]}>
          {(instructorsQuery.data ?? []).slice(0, 3).map((instructor) => (
            <Col key={instructor.id} xs={24} md={12} xl={8}>
              <PublicInstructorCard instructor={instructor} />
            </Col>
          ))}
        </Row>
      </section>

      <section className="marketing-section">
        <div className="marketing-support-grid">
          <article>
            <Typography.Title level={4}>Catalog first</Typography.Title>
            <Typography.Paragraph type="secondary">
              Public discovery starts with a browseable catalog and course detail pages before login.
            </Typography.Paragraph>
          </article>
          <article>
            <Typography.Title level={4}>Instructor visibility</Typography.Title>
            <Typography.Paragraph type="secondary">
              Instructor profiles explain expertise, bio, and the public courses attached to each faculty member.
            </Typography.Paragraph>
          </article>
          <article>
            <Typography.Title level={4}>Support ready</Typography.Title>
            <Typography.Paragraph type="secondary">
              Help Center and FAQ pages keep onboarding and course questions accessible before enrollment.
            </Typography.Paragraph>
          </article>
        </div>
      </section>
    </MarketingLayout>
  );
}

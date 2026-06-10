import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Skeleton, Typography } from 'antd';
import { listCoursesRequest } from '../../../../services/api/courseApi';
import { useInstructorCourseProgress } from '../../../../hooks/useProgressOverview';
import { progressService } from '../../../../services/api/progressService';
import { useAuth } from '../../../../context/AuthContext';
import './ClientDashboardHero.css';

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: 'blue' | 'purple' | 'pink' | 'coral' | 'orange' | 'green';
}) {
  return (
    <Card className={`client-stat-card client-stat-card--${accent}`}>
      <Typography.Text className="client-stat-card__label">{label}</Typography.Text>
      <Typography.Title level={3} className="client-stat-card__value">
        {value}
      </Typography.Title>
    </Card>
  );
}

export function ClientDashboardHero() {
  const { user } = useAuth();
  const isInstructor = user?.role === 'INSTRUCTOR';
  const summaryQuery = useQuery({
    queryKey: ['progress', 'overview', 'summary', 'client-dashboard'],
    queryFn: progressService.getOverviewSummary,
    enabled: !isInstructor,
    staleTime: 5 * 60 * 1000,
  });
  const coursesQuery = useQuery({
    queryKey: ['courses', 'client-dashboard', user?.role],
    queryFn: async () => {
      const response = await listCoursesRequest({ page: 1, limit: 50 });
      return response.data;
    },
    enabled: Boolean(isInstructor),
    staleTime: 60 * 1000,
  });
  const firstInstructorCourseId = coursesQuery.data?.[0]?.id;
  const instructorProgressQuery = useInstructorCourseProgress(firstInstructorCourseId, {
    page: 1,
    pageSize: 10,
    sortBy: 'progress',
    sortOrder: 'desc',
  });

  const isLoading = isInstructor ? coursesQuery.isLoading || instructorProgressQuery.isLoading : summaryQuery.isLoading;
  const focusPoints = isInstructor
    ? [
        { title: 'Submission reviews', description: 'Stay ahead of grading queues and learner blockers.' },
        { title: 'Course momentum', description: 'Track which classes are moving and where support is needed.' },
      ]
    : [
        { title: 'Continue learning', description: 'Return to active lessons and keep daily consistency high.' },
        { title: 'Deadlines in view', description: 'Spot quiz, assignment, and milestone work before it slips.' },
      ];

  return (
    <section className="client-dashboard-hero">
      <div className="client-dashboard-hero__summary">
        <div className="client-dashboard-hero__copy">
          <Typography.Text className="client-dashboard-hero__eyebrow">
            {isInstructor ? 'Instructor dashboard' : 'Student dashboard'}
          </Typography.Text>
          <Typography.Title level={2} className="client-dashboard-hero__title">
            {isInstructor ? 'See your teaching activity at a glance' : 'Stay on track with your learning goals'}
          </Typography.Title>
          <Typography.Paragraph className="client-dashboard-hero__subtitle">
            {isInstructor
              ? 'Monitor course participation, review learner progress, and keep teaching momentum high.'
              : 'Review active courses, recent progress, and the next steps in your learning journey.'}
          </Typography.Paragraph>
        </div>

        <div className="client-dashboard-hero__focus">
          <span className="client-dashboard-hero__focus-label">
            {isInstructor ? 'Teaching priorities' : 'Learning priorities'}
          </span>
          <Typography.Title level={4}>
            {isInstructor ? 'Focus on progress, feedback, and course delivery.' : 'Focus on consistency, progress, and the next lesson.'}
          </Typography.Title>
          <div className="client-dashboard-hero__focus-points">
            {focusPoints.map((point) => (
              <div key={point.title} className="client-dashboard-hero__focus-point">
                <strong>{point.title}</strong>
                <span>{point.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <Row gutter={[16, 16]}>
          {isInstructor ? (
            <>
              <Col xs={24} sm={12} xl={6}>
                <StatCard label="My Courses" value={coursesQuery.data?.length ?? 0} accent="blue" />
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <StatCard
                  label="Total Students"
                  value={instructorProgressQuery.data?.course.totalStudents ?? 0}
                  accent="purple"
                />
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <StatCard
                  label="Average Progress"
                  value={`${instructorProgressQuery.data?.course.averageWeightedProgress ?? 0}%`}
                  accent="orange"
                />
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <StatCard
                  label="Active Learners"
                  value={instructorProgressQuery.data?.course.activeStudents ?? 0}
                  accent="green"
                />
              </Col>
            </>
          ) : (
            <>
              <Col xs={24} sm={12} xl={6}>
                <StatCard label="Enrolled Courses" value={summaryQuery.data?.summary.totalCourses ?? 0} accent="blue" />
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <StatCard label="Active Courses" value={summaryQuery.data?.summary.activeCourses ?? 0} accent="purple" />
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <StatCard
                  label="Completed Courses"
                  value={summaryQuery.data?.summary.completedCourses ?? 0}
                  accent="pink"
                />
              </Col>
              <Col xs={24} sm={12} xl={6}>
                <StatCard
                  label="Overall Progress"
                  value={`${summaryQuery.data?.summary.overallProgress ?? 0}%`}
                  accent="green"
                />
              </Col>
            </>
          )}
        </Row>
      )}
    </section>
  );
}

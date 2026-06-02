import { useQuery } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import { Award, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { progressService } from '../../../services/api/progressService';
import './StudentProgressPage.css';

function formatDate(value?: string | null) {
  if (!value) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function StudentCertificatesPage() {
  const navigate = useNavigate();
  const overviewQuery = useQuery({
    queryKey: ['progress', 'certificates', 'overview'],
    queryFn: progressService.getOverview,
    staleTime: 60_000,
    retry: 1,
  });

  const completedCourses = overviewQuery.data?.courses.filter((course) => course.enrollmentStatus === 'COMPLETED') ?? [];

  if (overviewQuery.isLoading) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Certificates" subtitle="Track completed courses and certificate readiness as institutional issuance support returns.">
          <div className="progress-center progress-center--loading">
            <section className="client-card progress-center__hero progress-center__skeleton-shell">
              <div className="progress-center__skeleton-line progress-center__skeleton-line--short" />
              <div className="progress-center__skeleton-line progress-center__skeleton-line--title" />
              <div className="progress-center__skeleton-block" />
            </section>
          </div>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (overviewQuery.error) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Certificates" subtitle="Track completed courses and certificate readiness as institutional issuance support returns.">
          <section className="client-card progress-center__state-card">
            <EmptyState
              title="Unable to load certificate readiness"
              description="We could not load your completed course record right now."
              action={
                <Button className="client-button client-button-primary" onClick={() => overviewQuery.refetch()}>
                  Try Again
                </Button>
              }
            />
          </section>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <ClientPageContainer title="Certificates" subtitle="Track completed courses and certificate readiness as institutional issuance support returns.">
        <div className="progress-secondary-page">
          <section className="client-card progress-center__hero">
            <div className="progress-center__hero-copy">
              <Typography.Text className="client-caption">Completion record</Typography.Text>
              <Typography.Title level={1} className="client-page-title">
                Certificates
              </Typography.Title>
              <Typography.Paragraph className="client-body">
                Review completed courses now and watch for official certificate issuance once the institutional service is restored.
              </Typography.Paragraph>
              <div className="progress-center__hero-alert">
                <Typography.Text className="client-body">
                  {completedCourses.length
                    ? `You have completed ${completedCourses.length} course${completedCourses.length === 1 ? '' : 's'} and are ready for certificate support when it returns.`
                    : 'Complete a course to become certificate-eligible.'}
                </Typography.Text>
              </div>
              <div className="progress-center__action-row">
                <Button className="client-button client-button-primary" onClick={() => navigate('/courses')}>
                  Browse Courses
                </Button>
                <Button className="client-button client-button-secondary" onClick={() => navigate('/progress')}>
                  View Progress Center
                </Button>
              </div>
            </div>
            <div className="progress-center__hero-summary">
              <div className="progress-center__metric-grid">
                <div className="client-card progress-center__metric-card">
                  <Typography.Text className="client-meta">Completed Courses</Typography.Text>
                  <strong>{completedCourses.length}</strong>
                </div>
                <div className="client-card progress-center__metric-card">
                  <Typography.Text className="client-meta">Certificates Issued</Typography.Text>
                  <strong>0</strong>
                </div>
                <div className="client-card progress-center__metric-card">
                  <Typography.Text className="client-meta">Overall Progress</Typography.Text>
                  <strong>{overviewQuery.data?.summary.overallProgress ?? 0}%</strong>
                </div>
                <div className="client-card progress-center__metric-card">
                  <Typography.Text className="client-meta">Active Courses</Typography.Text>
                  <strong>{overviewQuery.data?.summary.activeCourses ?? 0}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="progress-secondary-page__metrics">
            <div className="client-card progress-center__metric-card">
              <Typography.Text className="client-meta">Completed Courses</Typography.Text>
              <strong>{completedCourses.length}</strong>
            </div>
            <div className="client-card progress-center__metric-card">
              <Typography.Text className="client-meta">Certificates Issued</Typography.Text>
              <strong>0</strong>
            </div>
            <div className="client-card progress-center__metric-card">
              <Typography.Text className="client-meta">Issuance Status</Typography.Text>
              <strong>Unavailable</strong>
            </div>
          </section>

          <div className="progress-secondary-page__split-grid">
            <section className="client-card progress-center__section">
              <div className="progress-center__section-header">
                <div className="progress-center__section-copy">
                  <Typography.Text className="client-caption">Completed learning paths</Typography.Text>
                  <Typography.Title level={3} className="client-section-title">
                    Certificate readiness
                  </Typography.Title>
                </div>
              </div>
              {completedCourses.length ? (
                <div className="progress-secondary-page__record-list">
                  {completedCourses.map((course) => (
                    <article key={course.courseId} className="progress-secondary-page__record-item">
                      <div className="progress-secondary-page__record-copy">
                        <div className="progress-secondary-page__record-tag-row">
                          <span className="client-badge client-badge-success">
                            <CheckCircle2 size={12} /> Completed
                          </span>
                          <span className="client-badge client-badge-warning">Service offline</span>
                        </div>
                        <Typography.Text className="client-card-title">{course.courseTitle}</Typography.Text>
                        <Typography.Text className="client-meta">{course.instructorName || 'Instructor unavailable'}</Typography.Text>
                        <Typography.Text className="client-meta">
                          {course.completedAt ? `Completed ${formatDate(course.completedAt)}` : 'Completion recorded'}
                        </Typography.Text>
                      </div>
                      <div className="progress-secondary-page__record-actions">
                        <Button className="client-button client-button-secondary" onClick={() => navigate(`/courses/${course.courseId}`)}>
                          Review Course
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No certificates yet."
                  description="Complete a course to become certificate-eligible when issuance support returns."
                  compact
                />
              )}
            </section>

            <section className="client-card progress-center__section">
              <div className="progress-center__section-header">
                <div className="progress-center__section-copy">
                  <Typography.Text className="client-caption">System status</Typography.Text>
                  <Typography.Title level={3} className="client-section-title">
                    Issuance status
                  </Typography.Title>
                </div>
              </div>
              <div className="progress-secondary-page__summary">
                <div className="progress-center__certificate-card">
                  <div className="progress-center__certificate-stat">
                    <Award size={18} />
                    <div>
                      <Typography.Text className="client-card-title">Issuance unavailable</Typography.Text>
                      <Typography.Text className="client-meta">
                        Certificate generation is not currently available in this recovered state.
                      </Typography.Text>
                    </div>
                  </div>
                </div>
                <div className="progress-center__preview-card">
                  <Typography.Text className="client-meta">What is still tracked</Typography.Text>
                  <strong>{completedCourses.length} completed course{completedCourses.length === 1 ? '' : 's'}</strong>
                  <Typography.Text className="client-meta">
                    Your completions are stored now so certificate documents can be issued later without losing academic history.
                  </Typography.Text>
                </div>
                <div className="progress-center__preview-card">
                  <Typography.Text className="client-meta">Next best action</Typography.Text>
                  <strong>{completedCourses.length ? 'Keep progressing in active courses' : 'Finish your first course'}</strong>
                  <Typography.Text className="client-meta">
                    Visit the progress center or course catalog to continue building certificate-eligible completions.
                  </Typography.Text>
                </div>
              </div>
            </section>
          </div>

          <section className="client-card progress-center__section">
            <div className="progress-center__section-header">
              <div className="progress-center__section-copy">
                <Typography.Text className="client-caption">Summary</Typography.Text>
                <Typography.Title level={3} className="client-section-title">
                  Academic completion overview
                </Typography.Title>
              </div>
            </div>
            <div className="progress-secondary-page__secondary-grid">
              <div className="progress-center__preview-card">
                <Typography.Text className="client-meta">Completed Courses</Typography.Text>
                <strong>{completedCourses.length}</strong>
                <Typography.Text className="client-meta">Courses that now count toward future certificate issuance.</Typography.Text>
              </div>
              <div className="progress-center__preview-card">
                <Typography.Text className="client-meta">Active Courses</Typography.Text>
                <strong>{overviewQuery.data?.summary.activeCourses ?? 0}</strong>
                <Typography.Text className="client-meta">Current in-progress courses that can unlock your next certificate-ready milestone.</Typography.Text>
              </div>
              <div className="progress-center__preview-card">
                <Typography.Text className="client-meta">Overall Progress</Typography.Text>
                <strong>{overviewQuery.data?.summary.overallProgress ?? 0}%</strong>
                <Typography.Text className="client-meta">Aggregate academic completion across the courses currently visible to the learner profile.</Typography.Text>
              </div>
              <div className="progress-center__preview-card">
                <Typography.Text className="client-meta">Institutional status</Typography.Text>
                <strong>Certificates pending service restoration</strong>
                <Typography.Text className="client-meta">Completed work remains valid even while issuance support is temporarily unavailable.</Typography.Text>
              </div>
            </div>
          </section>
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}

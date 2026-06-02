import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Button, Typography } from 'antd';
import { ClipboardCheck, FileCheck2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { listMyAssignmentSubmissionsRequest } from '../../../services/api/assignmentApi';
import { progressService } from '../../../services/api/progressService';
import { listMyQuizAttemptsRequest, listStudentCourseQuizzesRequest } from '../../../services/api/quizApi';
import './StudentProgressPage.css';

type GradeRecord = {
  id: string;
  type: 'assignment' | 'quiz';
  courseId: string;
  courseTitle: string;
  assignmentId?: string;
  quizId?: string;
  title: string;
  score: number;
  status: string;
  submittedAt?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) {
    return 'No submission date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getStatusBadgeClass(record: GradeRecord) {
  if (record.status === 'PASSED' || record.score >= 70) {
    return 'client-badge client-badge-success';
  }

  if (record.status === 'FAILED') {
    return 'client-badge client-badge-danger';
  }

  return 'client-badge client-badge-info';
}

export function StudentGradesPage() {
  const navigate = useNavigate();

  const overviewQuery = useQuery({
    queryKey: ['progress', 'grades', 'overview'],
    queryFn: progressService.getOverview,
    staleTime: 60_000,
    retry: 1,
  });

  const courseProgress = overviewQuery.data?.courses.filter((course) => course.enrollmentStatus !== 'DROPPED') ?? [];

  const assignmentQueries = useQueries({
    queries: courseProgress.map((course) => ({
      queryKey: ['progress', 'grades', 'assignments', course.courseId],
      queryFn: () => listMyAssignmentSubmissionsRequest(course.courseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const quizListQueries = useQueries({
    queries: courseProgress.map((course) => ({
      queryKey: ['progress', 'grades', 'quiz-list', course.courseId],
      queryFn: () => listStudentCourseQuizzesRequest(course.courseId),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const quizzesWithCourse = useMemo(
    () =>
      courseProgress.flatMap((course, index) =>
        (quizListQueries[index]?.data ?? []).map((quiz) => ({
          quiz,
          course,
        })),
      ),
    [courseProgress, quizListQueries],
  );

  const quizAttemptQueries = useQueries({
    queries: quizzesWithCourse.map(({ quiz }) => ({
      queryKey: ['progress', 'grades', 'quiz-attempts', quiz.id],
      queryFn: () => listMyQuizAttemptsRequest(quiz.id),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const gradeRecords = useMemo<GradeRecord[]>(() => {
    const assignments = courseProgress.flatMap((course, index) =>
      (assignmentQueries[index]?.data ?? [])
        .filter((submission) => submission.grade != null)
        .map((submission) => ({
          id: submission.id,
          type: 'assignment' as const,
          courseId: course.courseId,
          courseTitle: course.courseTitle,
          assignmentId: submission.assignmentId,
          title: submission.fileName || submission.assignmentId,
          score: submission.grade!,
          status: submission.status,
          submittedAt: submission.submittedAt,
        })),
    );

    const quizzes = quizAttemptQueries.flatMap((query, index) => {
      const attempts = query.data ?? [];
      const quizWithCourse = quizzesWithCourse[index];

      return attempts
        .filter((attempt) => attempt.score != null)
        .map((attempt) => ({
          id: attempt.id,
          type: 'quiz' as const,
          courseId: quizWithCourse?.course.courseId ?? '',
          courseTitle: quizWithCourse?.course.courseTitle ?? 'Course',
          quizId: quizWithCourse?.quiz.id,
          title: quizWithCourse?.quiz.title ?? 'Quiz attempt',
          score: attempt.score!,
          status: attempt.isPassed ? 'PASSED' : 'FAILED',
          submittedAt: attempt.submittedAt,
        }));
    });

    return [...assignments, ...quizzes].sort((a, b) => {
      const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [assignmentQueries, courseProgress, quizAttemptQueries, quizzesWithCourse]);

  const assignmentRecords = gradeRecords.filter((record) => record.type === 'assignment');
  const quizRecords = gradeRecords.filter((record) => record.type === 'quiz');
  const averageScore = gradeRecords.length
    ? Math.round(gradeRecords.reduce((sum, record) => sum + record.score, 0) / gradeRecords.length)
    : 0;
  const passingCount = gradeRecords.filter((record) => record.score >= 70).length;
  const error =
    overviewQuery.error ||
    assignmentQueries.find((query) => query.error)?.error ||
    quizListQueries.find((query) => query.error)?.error ||
    quizAttemptQueries.find((query) => query.error)?.error;
  const isLoading =
    overviewQuery.isLoading ||
    assignmentQueries.some((query) => query.isLoading) ||
    quizListQueries.some((query) => query.isLoading) ||
    quizAttemptQueries.some((query) => query.isLoading);

  if (isLoading) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Grades" subtitle="Review graded assignment submissions and completed quiz attempts across your enrolled courses.">
          <div className="progress-center progress-center--loading">
            <section className="client-card progress-center__hero progress-center__skeleton-shell">
              <div className="progress-center__skeleton-line progress-center__skeleton-line--short" />
              <div className="progress-center__skeleton-line progress-center__skeleton-line--title" />
              <div className="progress-center__skeleton-block" />
            </section>
            <section className="progress-secondary-page__metrics">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="client-card progress-center__metric-card progress-center__skeleton-shell">
                  <div className="progress-center__skeleton-line progress-center__skeleton-line--short" />
                  <div className="progress-center__skeleton-line progress-center__skeleton-line--title" />
                </div>
              ))}
            </section>
          </div>
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <ClientPageContainer title="Grades" subtitle="Review graded assignment submissions and completed quiz attempts across your enrolled courses.">
          <section className="client-card progress-center__state-card">
            <EmptyState
              title="Unable to load grades"
              description="We could not load your assignment and quiz grades right now."
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
      <ClientPageContainer title="Grades" subtitle="Review graded assignment submissions and completed quiz attempts across your enrolled courses.">
        <div className="progress-secondary-page">
          <section className="client-card progress-center__hero">
            <div className="progress-center__hero-copy">
              <Typography.Text className="client-caption">Assessment outcomes</Typography.Text>
              <Typography.Title level={1} className="client-page-title">
                Grades
              </Typography.Title>
              <Typography.Paragraph className="client-body">
                Track the academic results already returned from assignment submissions and completed quiz attempts.
              </Typography.Paragraph>
              <div className="progress-center__hero-alert">
                <Typography.Text className="client-body">
                  {passingCount} graded result{passingCount === 1 ? '' : 's'} are currently meeting the passing threshold.
                </Typography.Text>
              </div>
              <div className="progress-center__action-row">
                <Button className="client-button client-button-primary" onClick={() => navigate('/progress')}>
                  View Progress Center
                </Button>
                <Button className="client-button client-button-secondary" onClick={() => navigate('/certificates')}>
                  View Certificates
                </Button>
              </div>
            </div>
            <div className="progress-center__hero-summary">
              <div className="progress-center__metric-grid">
                <div className="client-card progress-center__metric-card">
                  <Typography.Text className="client-meta">Average Score</Typography.Text>
                  <strong>{averageScore}%</strong>
                </div>
                <div className="client-card progress-center__metric-card">
                  <Typography.Text className="client-meta">Recorded Grades</Typography.Text>
                  <strong>{gradeRecords.length}</strong>
                </div>
                <div className="client-card progress-center__metric-card">
                  <Typography.Text className="client-meta">Passing Results</Typography.Text>
                  <strong>{passingCount}</strong>
                </div>
                <div className="client-card progress-center__metric-card">
                  <Typography.Text className="client-meta">Completed Courses</Typography.Text>
                  <strong>{overviewQuery.data?.summary.completedCourses ?? 0}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="progress-secondary-page__metrics">
            <div className="client-card progress-center__metric-card">
              <Typography.Text className="client-meta">Assignment Grades</Typography.Text>
              <strong>{assignmentRecords.length}</strong>
            </div>
            <div className="client-card progress-center__metric-card">
              <Typography.Text className="client-meta">Quiz Results</Typography.Text>
              <strong>{quizRecords.length}</strong>
            </div>
            <div className="client-card progress-center__metric-card">
              <Typography.Text className="client-meta">Passing Results</Typography.Text>
              <strong>{passingCount}</strong>
            </div>
            <div className="client-card progress-center__metric-card">
              <Typography.Text className="client-meta">Average Score</Typography.Text>
              <strong>{averageScore}%</strong>
            </div>
          </section>

          {!gradeRecords.length ? (
            <section className="client-card progress-center__state-card">
              <EmptyState
                title="No graded work is available yet."
                description="Complete assignments and quizzes to build your academic record here."
                action={
                  <Button className="client-button client-button-primary" onClick={() => navigate('/progress')}>
                    Open Progress Center
                  </Button>
                }
              />
            </section>
          ) : (
            <div className="progress-secondary-page__split-grid">
              <section className="client-card progress-center__section">
                <div className="progress-center__section-header">
                  <div className="progress-center__section-copy">
                    <Typography.Text className="client-caption">Assignments</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      Assignment Grades
                    </Typography.Title>
                  </div>
                </div>
                {assignmentRecords.length ? (
                  <div className="progress-secondary-page__record-list">
                    {assignmentRecords.map((record) => (
                      <article key={record.id} className="progress-secondary-page__record-item">
                        <div className="progress-secondary-page__record-copy">
                          <div className="progress-secondary-page__record-tag-row">
                            <span className="client-badge client-badge-info">
                              <FileCheck2 size={12} /> Assignment
                            </span>
                            <span className={getStatusBadgeClass(record)}>{record.status}</span>
                            <span className="client-badge client-badge-success">{record.score}%</span>
                          </div>
                          <Typography.Text className="client-card-title">{record.title}</Typography.Text>
                          <Typography.Text className="client-meta">{record.courseTitle}</Typography.Text>
                          <Typography.Text className="client-meta">{formatDate(record.submittedAt)}</Typography.Text>
                        </div>
                        <div className="progress-secondary-page__record-actions">
                          <Button
                            className="client-button client-button-secondary"
                            onClick={() => navigate(`/courses/${record.courseId}/assignments/${record.assignmentId}`)}
                          >
                            View Feedback
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No assignment grades yet." description="Graded assignment submissions will appear here." compact />
                )}
              </section>

              <section className="client-card progress-center__section">
                <div className="progress-center__section-header">
                  <div className="progress-center__section-copy">
                    <Typography.Text className="client-caption">Quizzes</Typography.Text>
                    <Typography.Title level={3} className="client-section-title">
                      Quiz Results
                    </Typography.Title>
                  </div>
                </div>
                {quizRecords.length ? (
                  <div className="progress-secondary-page__record-list">
                    {quizRecords.map((record) => (
                      <article key={record.id} className="progress-secondary-page__record-item">
                        <div className="progress-secondary-page__record-copy">
                          <div className="progress-secondary-page__record-tag-row">
                            <span className="client-badge client-badge-info">
                              <ClipboardCheck size={12} /> Quiz
                            </span>
                            <span className={getStatusBadgeClass(record)}>{record.status}</span>
                            <span className="client-badge client-badge-success">{record.score}%</span>
                          </div>
                          <Typography.Text className="client-card-title">{record.title}</Typography.Text>
                          <Typography.Text className="client-meta">{record.courseTitle}</Typography.Text>
                          <Typography.Text className="client-meta">{formatDate(record.submittedAt)}</Typography.Text>
                        </div>
                        <div className="progress-secondary-page__record-actions">
                          <Button
                            className="client-button client-button-secondary"
                            onClick={() => navigate(`/courses/${record.courseId}/quizzes/${record.quizId}/results/${record.id}`)}
                          >
                            Review Result
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No quiz results yet." description="Completed quiz attempts will appear here." compact />
                )}
              </section>
            </div>
          )}

          <section className="client-card progress-center__section">
            <div className="progress-center__section-header">
              <div className="progress-center__section-copy">
                <Typography.Text className="client-caption">Performance summary</Typography.Text>
                <Typography.Title level={3} className="client-section-title">
                  Academic standing
                </Typography.Title>
              </div>
            </div>
            <div className="progress-secondary-page__secondary-grid">
              <div className="progress-center__preview-card">
                <Typography.Text className="client-meta">Completed courses</Typography.Text>
                <strong>{overviewQuery.data?.summary.completedCourses ?? 0}</strong>
                <Typography.Text className="client-meta">Finished courses that now contribute to certificate readiness.</Typography.Text>
              </div>
              <div className="progress-center__preview-card">
                <Typography.Text className="client-meta">Average score</Typography.Text>
                <strong>{averageScore}%</strong>
                <Typography.Text className="client-meta">Latest graded work across assignments and quizzes.</Typography.Text>
              </div>
              <div className="progress-center__preview-card">
                <Typography.Text className="client-meta">Passing results</Typography.Text>
                <strong>{passingCount}</strong>
                <Typography.Text className="client-meta">Returned results meeting the current passing threshold.</Typography.Text>
              </div>
              <div className="progress-center__preview-card">
                <Typography.Text className="client-meta">Next step</Typography.Text>
                <strong>{gradeRecords.length ? 'Keep building momentum' : 'Await your first grade'}</strong>
                <Typography.Text className="client-meta">
                  Use the progress center to continue course work and unlock new graded results.
                </Typography.Text>
              </div>
            </div>
          </section>
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}

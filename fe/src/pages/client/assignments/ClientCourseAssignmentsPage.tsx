import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Select, Typography } from 'antd';
import { ArrowLeft, CalendarDays, Search } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { getCourseByIdRequest } from '../../../services/api/courseApi';
import { listStudentCourseAssignmentsRequest, type AssignmentSubmissionRecord, type StudentAssignmentListItem } from '../../../services/api/assignmentApi';
import './ClientAssignmentPages.css';

type AssignmentQueueFilter = 'ALL' | 'PENDING' | 'DUE_SOON' | 'OVERDUE' | 'SUBMITTED' | 'GRADED';

type QueuePresentation = {
  label: string;
  badgeClassName: string;
  primaryAction: 'Submit' | 'Open assignment' | 'Continue Submission' | 'Review Submission' | 'View Details';
  summary: string;
  isOverdue: boolean;
};

function getLatestSubmission(assignment: StudentAssignmentListItem) {
  return assignment.submissions[0] ?? null;
}

function isOverdue(assignment: StudentAssignmentListItem) {
  if (!assignment.dueDate) return false;
  if (assignment.allowLateSubmission) return false;
  if (assignment.submissions.length > 0) return false;
  return new Date(assignment.dueDate).getTime() < Date.now();
}

function isDueSoon(assignment: StudentAssignmentListItem) {
  if (!assignment.dueDate || assignment.submissions.length > 0) return false;
  const diffMs = new Date(assignment.dueDate).getTime() - Date.now();
  return diffMs >= 0 && diffMs <= 1000 * 60 * 60 * 72;
}

function formatDueLabel(dueDate?: string | null) {
  if (!dueDate) return 'No due date';

  const diffMs = new Date(dueDate).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Past due';
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `Due in ${diffDays} days`;
}

function formatDueDateTime(dueDate?: string | null) {
  if (!dueDate) return 'No deadline published';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dueDate));
}

function getSubmissionStatusPresentation(
  assignment: StudentAssignmentListItem,
  latestSubmission: AssignmentSubmissionRecord | null,
): QueuePresentation {
  if (latestSubmission?.status === 'RETURNED') {
    return {
      label: 'Returned',
      badgeClassName: 'client-badge client-badge-warning',
      primaryAction: 'Continue Submission',
      summary: latestSubmission.feedback ? `Feedback returned: ${latestSubmission.feedback}` : 'Feedback returned for revision.',
      isOverdue: false,
    };
  }

  if (latestSubmission?.status === 'GRADED') {
    return {
      label: latestSubmission.grade != null ? `Graded ${latestSubmission.grade}%` : 'Graded',
      badgeClassName: 'client-badge client-badge-success',
      primaryAction: 'Review Submission',
      summary: latestSubmission.feedback ? latestSubmission.feedback : 'Review your graded submission and instructor notes.',
      isOverdue: false,
    };
  }

  if (latestSubmission) {
    return {
      label: latestSubmission.isLate ? 'Late' : 'Submitted',
      badgeClassName: latestSubmission.isLate ? 'client-badge client-badge-warning' : 'client-badge client-badge-info',
      primaryAction: 'Review Submission',
      summary: latestSubmission.fileName || latestSubmission.textContent || 'Submission received.',
      isOverdue: false,
    };
  }

  if (isOverdue(assignment)) {
    return {
      label: 'Overdue',
      badgeClassName: 'client-badge client-badge-danger',
      primaryAction: 'Submit',
      summary: assignment.allowLateSubmission ? 'Late submission is still allowed.' : 'Submission window has passed.',
      isOverdue: true,
    };
  }

  if (isDueSoon(assignment)) {
    return {
      label: 'Due Soon',
      badgeClassName: 'client-badge client-badge-warning',
      primaryAction: 'Submit',
      summary: 'Complete and submit this assignment soon.',
      isOverdue: false,
    };
  }

  return {
    label: 'Awaiting submission',
    badgeClassName: 'client-badge',
    primaryAction: 'Open assignment',
    summary: 'Open the workspace to review instructions and submit your work.',
    isOverdue: false,
  };
}

function matchesFilter(
  assignment: StudentAssignmentListItem,
  latestSubmission: AssignmentSubmissionRecord | null,
  filter: AssignmentQueueFilter,
) {
  switch (filter) {
    case 'PENDING':
      return !latestSubmission;
    case 'DUE_SOON':
      return isDueSoon(assignment);
    case 'OVERDUE':
      return isOverdue(assignment);
    case 'SUBMITTED':
      return latestSubmission !== null && latestSubmission.status !== 'GRADED';
    case 'GRADED':
      return latestSubmission !== null && (latestSubmission.status === 'GRADED' || latestSubmission.status === 'RETURNED');
    default:
      return true;
  }
}

function buildListSkeleton() {
  return (
    <div className="assignment-workspace__stack">
      <section className="client-card assignment-workspace__skeleton-card">
        <div className="assignment-workspace__skeleton-shell">
          <div className="assignment-workspace__skeleton-line assignment-workspace__skeleton-line--meta" />
          <div className="assignment-workspace__skeleton-line assignment-workspace__skeleton-line--title" />
          <div className="assignment-workspace__skeleton-block" />
        </div>
      </section>
      <section className="client-card assignment-workspace__skeleton-card">
        <div className="assignment-workspace__skeleton-shell">
          <div className="assignment-workspace__skeleton-block" />
          <div className="assignment-workspace__skeleton-block" />
          <div className="assignment-workspace__skeleton-block" />
        </div>
      </section>
    </div>
  );
}

export function ClientCourseAssignmentsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [activeFilter, setActiveFilter] = useState<AssignmentQueueFilter>('ALL');

  const courseQuery = useQuery({
    queryKey: ['assignments', 'course-header', courseId],
    queryFn: () => getCourseByIdRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });

  const assignmentsQuery = useQuery({
    queryKey: ['assignments', 'student-course', courseId],
    queryFn: () => listStudentCourseAssignmentsRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const assignments = assignmentsQuery.data ?? [];

  const metrics = useMemo(() => {
    const pending = assignments.filter((assignment) => assignment.submissions.length === 0).length;
    const submitted = assignments.filter((assignment) => assignment.submissions.length > 0).length;
    const graded = assignments.filter((assignment) => {
      const latestSubmission = getLatestSubmission(assignment);
      return Boolean(latestSubmission) && (latestSubmission.status === 'GRADED' || latestSubmission.status === 'RETURNED');
    }).length;
    const overdue = assignments.filter((assignment) => isOverdue(assignment)).length;
    const dueSoon = assignments.filter((assignment) => isDueSoon(assignment)).length;

    return { pending, submitted, graded, overdue, dueSoon };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const latestSubmission = getLatestSubmission(assignment);
      const matchesSearch =
        !search ||
        assignment.title.toLowerCase().includes(search) ||
        (assignment.description ?? '').toLowerCase().includes(search);

      return matchesSearch && matchesFilter(assignment, latestSubmission, activeFilter);
    });
  }, [activeFilter, assignments, searchValue]);

  const dueSoonAssignments = filteredAssignments.filter((assignment) => {
    const latestSubmission = getLatestSubmission(assignment);
    return !latestSubmission && (isDueSoon(assignment) || isOverdue(assignment));
  });
  const activeAssignments = filteredAssignments.filter((assignment) => {
    const latestSubmission = getLatestSubmission(assignment);
    return !latestSubmission && !isDueSoon(assignment) && !isOverdue(assignment);
  });
  const submittedAssignments = filteredAssignments.filter((assignment) => {
    const latestSubmission = getLatestSubmission(assignment);
    return latestSubmission !== null;
  });

  const firstPendingAssignment = dueSoonAssignments[0] ?? activeAssignments[0] ?? assignments[0] ?? null;

  const renderAssignmentRow = (assignment: StudentAssignmentListItem, accent = false) => {
    const latestSubmission = getLatestSubmission(assignment);
    const presentation = getSubmissionStatusPresentation(assignment, latestSubmission);

    return (
      <article
        key={assignment.id}
        className={`assignment-workspace__queue-card${accent ? ' assignment-workspace__queue-card--accent' : ''}`}
      >
        <div className="assignment-workspace__queue-header">
          <div className="assignment-workspace__queue-heading">
            <div className="assignment-workspace__queue-heading-copy">
              <Typography.Text className="client-card-title">{assignment.title}</Typography.Text>
              <Typography.Text className="client-meta">
                {assignment.description || 'Assignment instructions are available inside the submission workspace.'}
              </Typography.Text>
            </div>
            <div className="assignment-workspace__queue-primary">
              <span className={presentation.badgeClassName}>{presentation.label}</span>
              <Button
                className={presentation.primaryAction === 'Submit' ? 'client-button client-button-primary' : 'client-button client-button-secondary'}
                onClick={() => navigate(`/courses/${courseId}/assignments/${assignment.id}`)}
              >
                {presentation.primaryAction}
              </Button>
            </div>
          </div>
          <div className="assignment-workspace__row-meta">
            <Typography.Text className="client-meta">{formatDueDateTime(assignment.dueDate)}</Typography.Text>
            <Typography.Text className="client-meta">{formatDueLabel(assignment.dueDate)}</Typography.Text>
            {latestSubmission ? (
              <Typography.Text className="client-meta">
                Submitted {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(latestSubmission.submittedAt))}
              </Typography.Text>
            ) : null}
          </div>
        </div>
        <Typography.Text className="client-body">{presentation.summary}</Typography.Text>
        <div className="assignment-workspace__queue-footer">
          <Typography.Text className="client-meta">
            {assignment.allowLateSubmission ? 'Late submissions are allowed when the course policy permits it.' : 'Late submissions are not allowed for this assignment.'}
          </Typography.Text>
          <div className="assignment-workspace__queue-row-actions">
            <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}/assignments/${assignment.id}`)}>
              View Details
            </Button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Assignments"
        subtitle="Track, complete, and submit your course assignments from one workspace."
        actions={
          <Button className="client-button client-button-secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate(`/courses/${courseId}`)}>
            Back to Course
          </Button>
        }
      >
        {assignmentsQuery.isLoading || courseQuery.isLoading ? buildListSkeleton() : null}

        {assignmentsQuery.error ? (
          <section className="client-card assignment-workspace__state-card">
            <EmptyState
              title="Unable to load assignments"
              description={assignmentsQuery.error instanceof Error ? assignmentsQuery.error.message : 'The assignment queue could not be loaded right now.'}
              action={
                <Button className="client-button client-button-primary" onClick={() => assignmentsQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          </section>
        ) : null}

        {!assignmentsQuery.isLoading && !assignments.length ? (
          <section className="client-card assignment-workspace__state-card">
            <EmptyState
              title="No assignments are available for this course yet."
              description="Assignments will appear here when they are published to the course."
            />
          </section>
        ) : null}

        {!assignmentsQuery.isLoading && assignments.length ? (
          <div className="assignment-workspace__stack">
            <section className="client-card assignment-workspace__hero">
              <div className="assignment-workspace__hero-copy">
                <Typography.Text className="client-caption">
                  {courseQuery.data?.title ?? 'Assignment workspace'}
                </Typography.Text>
                <Typography.Title level={1} className="client-page-title">
                  Assignment queue
                </Typography.Title>
                <Typography.Paragraph className="client-body">
                  Keep submission deadlines, current work, and graded feedback in one focused student workspace.
                </Typography.Paragraph>
                <div className="assignment-workspace__hero-meta">
                  <span className="client-badge">{assignments.length} total assignments</span>
                  <span className="client-badge client-badge-info">{metrics.submitted} submitted</span>
                  <span className="client-badge client-badge-success">{metrics.graded} graded</span>
                  {metrics.overdue ? <span className="client-badge client-badge-danger">{metrics.overdue} overdue</span> : null}
                </div>
              </div>
              <div className="assignment-workspace__hero-summary">
                <Typography.Text className="client-card-title">Current focus</Typography.Text>
                <div className="assignment-workspace__metric-grid">
                  <div className="assignment-workspace__metric-card assignment-workspace__metric-card--focus">
                    <Typography.Text className="client-meta">Pending</Typography.Text>
                    <strong>{metrics.pending}</strong>
                  </div>
                  <div className="assignment-workspace__metric-card">
                    <Typography.Text className="client-meta">Due Soon</Typography.Text>
                    <strong>{metrics.dueSoon}</strong>
                  </div>
                  <div className="assignment-workspace__metric-card">
                    <Typography.Text className="client-meta">Submitted</Typography.Text>
                    <strong>{metrics.submitted}</strong>
                  </div>
                  <div className={`assignment-workspace__metric-card${metrics.overdue ? ' assignment-workspace__metric-card--critical' : ''}`}>
                    <Typography.Text className="client-meta">Overdue</Typography.Text>
                    <strong>{metrics.overdue}</strong>
                  </div>
                </div>
                {firstPendingAssignment ? (
                  <Button
                    className="client-button client-button-primary"
                    onClick={() => navigate(`/courses/${courseId}/assignments/${firstPendingAssignment.id}`)}
                  >
                    {getLatestSubmission(firstPendingAssignment) ? 'Review current submission' : 'Open next assignment'}
                  </Button>
                ) : null}
              </div>
            </section>

            <div className="assignment-workspace__layout">
              <main className="assignment-workspace__main">
                <section className="client-card assignment-workspace__panel">
                  <div className="assignment-workspace__section-header">
                    <div className="assignment-workspace__section-header-copy">
                      <Typography.Text className="client-caption">Assignment queue</Typography.Text>
                      <Typography.Title level={3} className="client-section-title">
                        Manage assignment work
                      </Typography.Title>
                    </div>
                  </div>
                  <div className="assignment-workspace__queue-controls">
                    <Input
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder="Search assignments..."
                      prefix={<Search size={16} />}
                      className="assignment-workspace__search"
                    />
                    <Select<AssignmentQueueFilter>
                      value={activeFilter}
                      onChange={setActiveFilter}
                      className="assignment-workspace__queue-filter"
                      options={[
                        { value: 'ALL', label: 'All' },
                        { value: 'PENDING', label: 'Pending' },
                        { value: 'DUE_SOON', label: 'Due Soon' },
                        { value: 'OVERDUE', label: 'Overdue' },
                        { value: 'SUBMITTED', label: 'Submitted' },
                        { value: 'GRADED', label: 'Graded' },
                      ]}
                    />
                  </div>

                  {filteredAssignments.length === 0 ? (
                    <EmptyState
                      title="No assignments match this view."
                      description="Try a different filter or clear the search query."
                      compact
                    />
                  ) : (
                    <div className="assignment-workspace__stack">
                      {dueSoonAssignments.length ? (
                        <section className="assignment-workspace__stack">
                          <div className="assignment-workspace__section-header">
                            <div className="assignment-workspace__section-header-copy">
                              <Typography.Text className="client-caption">Priority</Typography.Text>
                              <Typography.Title level={4} className="client-card-title">
                                Due Soon & Overdue
                              </Typography.Title>
                            </div>
                          </div>
                          {dueSoonAssignments.map((assignment) => renderAssignmentRow(assignment, true))}
                        </section>
                      ) : null}

                      {activeAssignments.length ? (
                        <section className="assignment-workspace__stack">
                          <div className="assignment-workspace__section-header">
                            <div className="assignment-workspace__section-header-copy">
                              <Typography.Text className="client-caption">Upcoming assignments</Typography.Text>
                              <Typography.Title level={4} className="client-card-title">
                                Plan your next submission
                              </Typography.Title>
                            </div>
                          </div>
                          {activeAssignments.map((assignment) => renderAssignmentRow(assignment))}
                        </section>
                      ) : null}

                      {submittedAssignments.length ? (
                        <section className="assignment-workspace__stack">
                          <div className="assignment-workspace__section-header">
                            <div className="assignment-workspace__section-header-copy">
                              <Typography.Text className="client-caption">Submitted & graded</Typography.Text>
                              <Typography.Title level={4} className="client-card-title">
                                Review submitted work
                              </Typography.Title>
                            </div>
                          </div>
                          {submittedAssignments.map((assignment) => renderAssignmentRow(assignment))}
                        </section>
                      ) : null}
                    </div>
                  )}
                </section>
              </main>

              <aside className="assignment-workspace__sidebar">
                <section className="client-card assignment-workspace__sidebar-card">
                  <Typography.Text className="client-caption">Queue summary</Typography.Text>
                  <Typography.Title level={4} className="client-card-title">
                    Submission status
                  </Typography.Title>
                  <div className="assignment-workspace__status-grid">
                    <div className="assignment-workspace__status-tile">
                      <Typography.Text className="client-meta">Pending work</Typography.Text>
                      <strong>{metrics.pending}</strong>
                    </div>
                    <div className="assignment-workspace__status-tile">
                      <Typography.Text className="client-meta">Submitted</Typography.Text>
                      <strong>{metrics.submitted}</strong>
                    </div>
                    <div className="assignment-workspace__status-tile">
                      <Typography.Text className="client-meta">Graded</Typography.Text>
                      <strong>{metrics.graded}</strong>
                    </div>
                    <div className={`assignment-workspace__status-tile${metrics.overdue ? ' assignment-workspace__metric-card--critical' : ''}`}>
                      <Typography.Text className="client-meta">Overdue</Typography.Text>
                      <strong>{metrics.overdue}</strong>
                    </div>
                  </div>
                </section>

                <section className="client-card assignment-workspace__sidebar-card">
                  <Typography.Text className="client-caption">Calendar</Typography.Text>
                  <Typography.Title level={4} className="client-card-title">
                    Assignment timing
                  </Typography.Title>
                  <Typography.Text className="client-meta">
                    Use the assignment queue to stay ahead of due dates and review returned work quickly.
                  </Typography.Text>
                  <div className="assignment-workspace__action-group">
                    <Button className="client-button client-button-secondary" icon={<CalendarDays size={16} />} onClick={() => navigate('/calendar')}>
                      Calendar View
                    </Button>
                    <Button className="client-button client-button-ghost" onClick={() => navigate(`/courses/${courseId}`)}>
                      View Course
                    </Button>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        ) : null}
      </ClientPageContainer>
    </ClientLayout>
  );
}

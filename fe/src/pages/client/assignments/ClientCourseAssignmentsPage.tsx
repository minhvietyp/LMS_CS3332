import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Select, Typography } from 'antd';
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, MessageSquareText, Search, TimerReset } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/client-ui';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { getCourseByIdRequest } from '../../../services/api/courseApi';
import { listStudentCourseAssignmentsRequest, type AssignmentSubmissionRecord, type StudentAssignmentListItem } from '../../../services/api/assignmentApi';
import './ClientAssignmentPages.css';

type AssignmentStatus = 'PENDING' | 'SUBMITTED' | 'GRADED' | 'OVERDUE' | 'NOT_AVAILABLE';
type AssignmentFilter = 'ALL' | AssignmentStatus;
type AssignmentSort = 'DUE_DATE' | 'STATUS' | 'UPDATED';

type AssignmentViewItem = {
  assignment: StudentAssignmentListItem;
  latestSubmission: AssignmentSubmissionRecord | null;
  status: AssignmentStatus;
  dueTime: number | null;
  updatedTime: number;
};

const statusFilters: Array<{ value: AssignmentFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'GRADED', label: 'Graded' },
  { value: 'OVERDUE', label: 'Overdue' },
];

const statusRank: Record<AssignmentStatus, number> = {
  OVERDUE: 0,
  PENDING: 1,
  SUBMITTED: 2,
  GRADED: 3,
  NOT_AVAILABLE: 4,
};

function getLatestSubmission(submissions: AssignmentSubmissionRecord[] = []) {
  return [...submissions].sort((left, right) => {
    const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : 0;
    const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : 0;
    return rightTime - leftTime;
  })[0] ?? null;
}

function getAssignmentStatus(assignment: StudentAssignmentListItem, latestSubmission: AssignmentSubmissionRecord | null, now: Date): AssignmentStatus {
  if (latestSubmission?.grade != null || latestSubmission?.status === 'GRADED') {
    return 'GRADED';
  }

  if (latestSubmission) {
    return 'SUBMITTED';
  }

  if (assignment.dueDate && new Date(assignment.dueDate).getTime() < now.getTime()) {
    return 'OVERDUE';
  }

  return 'PENDING';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'No due date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getRelativeDueLabel(value?: string | null) {
  if (!value) return 'No deadline published';

  const today = new Date();
  const due = new Date(value);
  const isPastDue = due.getTime() < today.getTime();
  const diffDays = Math.floor(
    (new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (isPastDue && diffDays === 0) return 'Past due today';
  if (diffDays < 0) return `Past due by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `Due in ${diffDays} days`;
}

function getStatusLabel(status: AssignmentStatus) {
  switch (status) {
    case 'SUBMITTED':
      return 'Submitted';
    case 'GRADED':
      return 'Graded';
    case 'OVERDUE':
      return 'Overdue';
    case 'NOT_AVAILABLE':
      return 'Not available';
    case 'PENDING':
    default:
      return 'Pending';
  }
}

function getStatusBadgeClass(status: AssignmentStatus) {
  switch (status) {
    case 'OVERDUE':
      return 'client-badge client-badge-danger';
    case 'SUBMITTED':
      return 'client-badge client-badge-info';
    case 'GRADED':
      return 'client-badge client-badge-success';
    case 'NOT_AVAILABLE':
      return 'client-badge';
    case 'PENDING':
    default:
      return 'client-badge client-badge-warning';
  }
}

function getPrimaryAction(status: AssignmentStatus) {
  switch (status) {
    case 'GRADED':
      return 'View grade';
    case 'SUBMITTED':
      return 'View submission';
    case 'OVERDUE':
    case 'PENDING':
      return 'Open assignment';
    case 'NOT_AVAILABLE':
    default:
      return 'View details';
  }
}

function getEmptyTitle(filter: AssignmentFilter, hasAssignments: boolean) {
  if (!hasAssignments) return 'No assignments available yet.';
  if (filter === 'PENDING') return 'No pending assignments.';
  return 'No assignments match your filters.';
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
  const now = useMemo(() => new Date(), []);
  const [searchValue, setSearchValue] = useState('');
  const [activeFilter, setActiveFilter] = useState<AssignmentFilter>('ALL');
  const [sortBy, setSortBy] = useState<AssignmentSort>('DUE_DATE');

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

  const courseTitle = courseQuery.data?.title ?? 'Current course';
  const assignments = assignmentsQuery.data ?? [];

  const assignmentItems = useMemo<AssignmentViewItem[]>(() => {
    return assignments.map((assignment) => {
      const latestSubmission = getLatestSubmission(assignment.submissions);
      return {
        assignment,
        latestSubmission,
        status: getAssignmentStatus(assignment, latestSubmission, now),
        dueTime: assignment.dueDate ? new Date(assignment.dueDate).getTime() : null,
        updatedTime: new Date(assignment.updatedAt ?? assignment.createdAt ?? assignment.dueDate ?? 0).getTime(),
      };
    });
  }, [assignments, now]);

  const metrics = useMemo(() => {
    return {
      pending: assignmentItems.filter((item) => item.status === 'PENDING').length,
      overdue: assignmentItems.filter((item) => item.status === 'OVERDUE').length,
      submitted: assignmentItems.filter((item) => item.status === 'SUBMITTED').length,
      graded: assignmentItems.filter((item) => item.status === 'GRADED').length,
    };
  }, [assignmentItems]);

  const filteredAssignments = useMemo(() => {
    const search = searchValue.trim().toLowerCase();

    return assignmentItems
      .filter((item) => {
        const matchesStatus = activeFilter === 'ALL' || item.status === activeFilter;
        const matchesSearch =
          !search ||
          item.assignment.title.toLowerCase().includes(search) ||
          (item.assignment.description ?? '').toLowerCase().includes(search) ||
          courseTitle.toLowerCase().includes(search);

        return matchesStatus && matchesSearch;
      })
      .sort((left, right) => {
        if (sortBy === 'STATUS') return statusRank[left.status] - statusRank[right.status];
        if (sortBy === 'UPDATED') return right.updatedTime - left.updatedTime;

        if (left.dueTime == null && right.dueTime == null) return left.assignment.title.localeCompare(right.assignment.title);
        if (left.dueTime == null) return 1;
        if (right.dueTime == null) return -1;
        return left.dueTime - right.dueTime;
      });
  }, [activeFilter, assignmentItems, courseTitle, searchValue, sortBy]);

  const renderAssignmentRow = (item: AssignmentViewItem) => {
    const { assignment, latestSubmission, status } = item;
    const href = `/courses/${courseId}/assignments/${assignment.id}`;
    const hasFeedback = Boolean(latestSubmission?.feedback);
    const score = latestSubmission?.grade != null ? `${latestSubmission.grade}%` : null;

    return (
      <article key={assignment.id} className={`assignment-workspace__assignment-row assignment-workspace__assignment-row--${status.toLowerCase()}`}>
        <div className="assignment-workspace__assignment-icon" aria-hidden="true">
          <ClipboardList size={18} />
        </div>
        <div className="assignment-workspace__assignment-copy">
          <div className="assignment-workspace__assignment-title-row">
            <Typography.Text className="client-card-title">{assignment.title}</Typography.Text>
            <span className={getStatusBadgeClass(status)}>{getStatusLabel(status)}</span>
          </div>
          <Typography.Text className="client-meta">{courseTitle}</Typography.Text>
          {assignment.description ? (
            <Typography.Paragraph className="client-body assignment-workspace__assignment-description">
              {assignment.description}
            </Typography.Paragraph>
          ) : (
            <Typography.Text className="client-meta">Assignment instructions are available inside the submission workspace.</Typography.Text>
          )}
          <div className="assignment-workspace__assignment-meta">
            <span>Due {formatDateTime(assignment.dueDate)}</span>
            <span>{getRelativeDueLabel(assignment.dueDate)}</span>
            {latestSubmission ? <span>Submitted {formatDateTime(latestSubmission.submittedAt)}</span> : null}
            {score ? <span>Score {score}</span> : null}
            {hasFeedback ? (
              <span className="assignment-workspace__feedback-indicator">
                <MessageSquareText size={14} />
                Feedback available
              </span>
            ) : null}
          </div>
        </div>
        <Link className={status === 'PENDING' || status === 'OVERDUE' ? 'client-button client-button-primary assignment-workspace__assignment-action' : 'client-button client-button-secondary assignment-workspace__assignment-action'} to={href}>
          {getPrimaryAction(status)}
        </Link>
      </article>
    );
  };

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Assignments"
        subtitle="Manage pending, submitted, graded, and overdue coursework."
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
              description={assignmentsQuery.error instanceof Error ? assignmentsQuery.error.message : 'The assignment list could not be loaded right now.'}
              action={
                <Button className="client-button client-button-primary" onClick={() => assignmentsQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          </section>
        ) : null}

        {!assignmentsQuery.isLoading && !assignmentsQuery.error ? (
          <div className="assignment-workspace assignment-workspace--management">
            <section className="client-card assignment-workspace__summary-panel">
              <div className="assignment-workspace__summary-heading">
                <Typography.Text className="client-caption">{courseTitle}</Typography.Text>
                <Typography.Title level={2} className="client-section-title">
                  Assignment status
                </Typography.Title>
              </div>
              <div className="assignment-workspace__summary-cards">
                <div className="client-card assignment-workspace__summary-card">
                  <TimerReset size={18} aria-hidden="true" />
                  <Typography.Text className="client-meta">Pending</Typography.Text>
                  <strong>{metrics.pending}</strong>
                </div>
                <div className="client-card assignment-workspace__summary-card">
                  <CalendarDays size={18} aria-hidden="true" />
                  <Typography.Text className="client-meta">Overdue</Typography.Text>
                  <strong>{metrics.overdue}</strong>
                </div>
                <div className="client-card assignment-workspace__summary-card">
                  <ClipboardList size={18} aria-hidden="true" />
                  <Typography.Text className="client-meta">Submitted</Typography.Text>
                  <strong>{metrics.submitted}</strong>
                </div>
                <div className="client-card assignment-workspace__summary-card">
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <Typography.Text className="client-meta">Graded</Typography.Text>
                  <strong>{metrics.graded}</strong>
                </div>
              </div>
            </section>

            <section className="client-card assignment-workspace__panel assignment-workspace__assignment-panel">
              <div className="assignment-workspace__section-header">
                <div className="assignment-workspace__section-header-copy">
                  <Typography.Text className="client-caption">Coursework</Typography.Text>
                  <Typography.Title level={3} className="client-section-title">
                    Manage assignments
                  </Typography.Title>
                </div>
              </div>

              <div className="assignment-workspace__management-controls">
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search assignments..."
                  prefix={<Search size={16} />}
                  className="assignment-workspace__search"
                />
                <Select<AssignmentSort>
                  value={sortBy}
                  onChange={setSortBy}
                  className="assignment-workspace__sort"
                  options={[
                    { value: 'DUE_DATE', label: 'Sort by due date' },
                    { value: 'STATUS', label: 'Sort by status' },
                    { value: 'UPDATED', label: 'Sort by recently updated' },
                  ]}
                />
              </div>

              <div className="assignment-workspace__filter-tabs" aria-label="Assignment status filters">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    className={`assignment-workspace__filter-tab${activeFilter === filter.value ? ' assignment-workspace__filter-tab--active' : ''}`}
                    onClick={() => setActiveFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {!assignments.length || !filteredAssignments.length ? (
                <EmptyState
                  compact
                  title={getEmptyTitle(activeFilter, assignments.length > 0)}
                  description={assignments.length ? 'Try another status or search term.' : 'Assignments will appear here when they are published to this course.'}
                />
              ) : (
                <div className="assignment-workspace__assignment-list">
                  {filteredAssignments.map((item) => renderAssignmentRow(item))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </ClientPageContainer>
    </ClientLayout>
  );
}

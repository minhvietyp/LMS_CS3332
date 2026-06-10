import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Select, Typography } from 'antd';
import { LoaderCircle } from 'lucide-react';
import { type CourseListItem, listCoursesRequest } from '../../../services/api/courseApi';
import { progressService } from '../../../services/api/progressService';
import type { CourseProgressItem } from '../../../types/progress';
import { useAuth } from '../../../context/useAuth';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { EmptyState } from '../../../components/client-ui';
import { CourseCatalogCard, type CourseCatalogStatus } from './components/CourseCatalogCard';
import { CourseCatalogFilters, type CourseCatalogFilterValue } from './components/CourseCatalogFilters';
import { CourseCatalogSkeleton } from './components/CourseCatalogSkeleton';
import { CourseCatalogStatePanel } from './components/CourseCatalogStatePanel';
import './ClientCoursesPage.css';

type SortOption = 'updated' | 'progress' | 'title';

type CatalogCourse = {
  course: CourseListItem;
  progress: CourseProgressItem | null;
  status: CourseCatalogStatus;
  progressPercent: number | null;
};

function getCatalogStatus(course: CourseListItem, progress: CourseProgressItem | null): CourseCatalogStatus {
  if (progress?.enrollmentStatus === 'COMPLETED' || (progress?.percentage ?? 0) >= 100) {
    return 'completed';
  }

  if (progress?.enrollmentStatus === 'ACTIVE' && (progress.percentage ?? 0) > 0) {
    return 'in-progress';
  }

  if (progress?.enrollmentStatus === 'ACTIVE') {
    return 'enrolled';
  }

  if (course.status === 'DRAFT') {
    return 'draft';
  }

  if (course.status === 'ARCHIVED') {
    return 'archived';
  }

  return 'available';
}

function getSearchText(course: CourseListItem) {
  return `${course.title} ${course.description ?? ''} ${course.instructor?.name ?? ''}`.toLowerCase();
}

function hasFilters(filters: CourseCatalogFilterValue) {
  return Boolean(filters.search.trim()) || filters.status !== 'all';
}

export function ClientCoursesPage() {
  const { user } = useAuth();
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [filters, setFilters] = useState<CourseCatalogFilterValue>({
    search: '',
    status: 'all',
  });
  const deferredFilters = useDeferredValue(filters);
  const deferredSortBy = useDeferredValue(sortBy);

  const coursesQuery = useQuery({
    queryKey: ['courses', 'client-library', user?.role],
    queryFn: async () => {
      const response = await listCoursesRequest({ page: 1, limit: 50 });
      return response.data;
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  const progressQuery = useQuery({
    queryKey: ['progress', 'overview'],
    queryFn: progressService.getOverview,
    enabled: user?.role === 'STUDENT',
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const progressByCourseId = useMemo(
    () => new Map((progressQuery.data?.courses ?? []).map((item) => [item.courseId, item])),
    [progressQuery.data?.courses],
  );
  const catalogCourses = useMemo<CatalogCourse[]>(
    () => courses.map((course) => {
      const progress = progressByCourseId.get(course.id) ?? null;
      const status = getCatalogStatus(course, progress);
      const progressPercent = progress ? Math.max(0, Math.min(100, Math.round(progress.percentage ?? 0))) : null;

      return {
        course,
        progress,
        status,
        progressPercent,
      };
    }),
    [courses, progressByCourseId],
  );

  const statusOptions = useMemo(() => {
    const labels: Record<CourseCatalogStatus, string> = {
      available: 'Available',
      enrolled: 'Enrolled',
      'in-progress': 'In progress',
      completed: 'Completed',
      draft: 'Draft',
      archived: 'Archived',
    };
    const statuses = new Set(catalogCourses.map((item) => item.status));
    const preferred: CourseCatalogStatus[] = ['enrolled', 'in-progress', 'completed', 'available', 'draft', 'archived'];

    return [
      { value: 'all', label: 'All' },
      ...preferred
        .filter((status) => statuses.has(status))
        .map((status) => ({ value: status, label: labels[status] })),
    ];
  }, [catalogCourses]);

  const filteredCourses = useMemo(() => {
    const searchTerm = deferredFilters.search.trim().toLowerCase();

    return catalogCourses.filter((item) => {
      const matchesSearch = !searchTerm || getSearchText(item.course).includes(searchTerm);
      const matchesStatus = deferredFilters.status === 'all' || item.status === deferredFilters.status;

      return matchesSearch && matchesStatus;
    });
  }, [catalogCourses, deferredFilters]);

  const sortedCourses = useMemo(() => {
    return [...filteredCourses].sort((left, right) => {
      switch (deferredSortBy) {
        case 'progress':
          return (right.progressPercent ?? -1) - (left.progressPercent ?? -1)
            || left.course.title.localeCompare(right.course.title);
        case 'title':
          return left.course.title.localeCompare(right.course.title);
        case 'updated':
        default:
          return right.course.updatedAt.localeCompare(left.course.updatedAt)
            || left.course.title.localeCompare(right.course.title);
      }
    });
  }, [deferredSortBy, filteredCourses]);

  const appliedFilters = useMemo(
    () => [
      filters.search.trim() ? { key: 'search', label: filters.search.trim() } : null,
      filters.status !== 'all'
        ? { key: 'status', label: statusOptions.find((option) => option.value === filters.status)?.label ?? filters.status }
        : null,
    ].filter(Boolean) as Array<{ key: string; label: string }>,
    [filters, statusOptions],
  );

  const isRefining = deferredSortBy !== sortBy
    || deferredFilters.search !== filters.search
    || deferredFilters.status !== filters.status;
  const showProgressNote = user?.role === 'STUDENT' && progressQuery.isError;

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
    });
  };

  return (
    <ClientLayout>
      <ClientPageContainer title="Courses" subtitle="Browse your courses and continue learning.">
        <div className="client-section client-catalog-shell">
          {coursesQuery.isLoading ? <CourseCatalogSkeleton /> : null}

          {!coursesQuery.isLoading && coursesQuery.error ? (
            <CourseCatalogStatePanel
              variant="error"
              title="Unable to load courses"
              description="Courses could not be loaded right now."
              actionLabel="Retry"
              onAction={() => {
                void coursesQuery.refetch();
              }}
            />
          ) : null}

          {!coursesQuery.isLoading && !coursesQuery.error && !courses.length ? (
            <CourseCatalogStatePanel
              variant="empty"
              title="No courses found."
              description="Courses will appear here when they become available."
              actionLabel="Refresh"
              onAction={() => {
                void coursesQuery.refetch();
              }}
            />
          ) : null}

          {!coursesQuery.isLoading && !coursesQuery.error && courses.length > 0 ? (
            <>
              <section className="client-card client-catalog-shell__controls" aria-label="Course catalog controls">
                <CourseCatalogFilters
                  value={filters}
                  statusOptions={statusOptions}
                  appliedFilters={appliedFilters}
                  resultCount={filteredCourses.length}
                  totalCount={courses.length}
                  onChange={setFilters}
                  onClearAll={handleClearFilters}
                />

                <label className="client-field client-catalog-shell__sort">
                  <span className="client-label">Sort</span>
                  <Select
                    size="large"
                    value={sortBy}
                    className="client-select"
                    aria-label="Sort course results"
                    onChange={(value) => setSortBy(value)}
                    options={[
                      { value: 'updated', label: 'Recently updated' },
                      { value: 'progress', label: 'Progress' },
                      { value: 'title', label: 'Title' },
                    ]}
                  />
                </label>
              </section>

              <section className="client-catalog-shell__summary" aria-live="polite">
                <div>
                  <Typography.Text className="client-card-title">
                    {filteredCourses.length === courses.length
                      ? `${filteredCourses.length} course${filteredCourses.length === 1 ? '' : 's'}`
                      : `${filteredCourses.length} of ${courses.length} courses`}
                  </Typography.Text>
                  <Typography.Paragraph className="client-meta">
                    {appliedFilters.length
                      ? 'Filtered results from your available catalog.'
                      : 'Showing the latest courses available in your workspace.'}
                  </Typography.Paragraph>
                </div>
                {isRefining ? (
                  <span className="client-catalog-shell__results-status">
                    <LoaderCircle size={14} />
                    Updating results
                  </span>
                ) : null}
                {showProgressNote ? (
                  <span className="client-meta client-catalog-shell__progress-note">
                    Progress data is temporarily unavailable.
                  </span>
                ) : null}
              </section>

              {sortedCourses.length ? (
                <section id="catalog-results" className="client-catalog-shell__grid" aria-label="Course results">
                  {sortedCourses.map((item) => (
                    <CourseCatalogCard
                      key={item.course.id}
                      course={item.course}
                      status={item.status}
                      progress={item.progress}
                      progressPercent={item.progressPercent}
                    />
                  ))}
                </section>
              ) : (
                <EmptyState
                  className="client-catalog-shell__empty-results"
                  compact
                  title={hasFilters(filters) ? 'No matching courses found.' : 'No courses found.'}
                  description={hasFilters(filters) ? 'Try a different search or clear the current filters.' : 'Courses will appear here when they become available.'}
                  action={hasFilters(filters) ? (
                    <Button className="client-button client-button-secondary" onClick={handleClearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined}
                />
              )}
            </>
          ) : null}
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}

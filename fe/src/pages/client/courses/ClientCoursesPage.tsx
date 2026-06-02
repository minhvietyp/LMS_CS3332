import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Col,
  Row,
  Select,
  Typography,
} from 'antd';
import { Filter, LayoutGrid, LoaderCircle, Rows3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type CourseListItem, listCoursesRequest } from '../../../services/api/courseApi';
import { useAuth } from '../../../context/AuthContext';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { EmptyState, MetricCard } from '../../../components/client-ui';
import { CourseCatalogCard } from './components/CourseCatalogCard';
import { CourseCatalogFilters, type CourseCatalogFilterValue } from './components/CourseCatalogFilters';
import { CourseCatalogSkeleton } from './components/CourseCatalogSkeleton';
import { CourseCatalogStatePanel } from './components/CourseCatalogStatePanel';
import './ClientCoursesPage.css';

function getCourseCategory(course: CourseListItem): string {
  const source = `${course.title} ${course.description ?? ''}`.toLowerCase();

  if (source.includes('react') || source.includes('frontend') || source.includes('ui')) return 'Frontend';
  if (source.includes('api') || source.includes('backend') || source.includes('server')) return 'Backend';
  if (source.includes('data') || source.includes('analytics')) return 'Data';
  if (source.includes('design') || source.includes('ux')) return 'Design';
  if (source.includes('business') || source.includes('management')) return 'Business';

  return 'General';
}

function getCourseLevel(course: CourseListItem): 'Beginner' | 'Advanced' | 'All Levels' {
  const source = `${course.title} ${course.description ?? ''}`.toLowerCase();

  if (source.includes('advanced') || source.includes('expert') || source.includes('architecture')) return 'Advanced';
  if (source.includes('foundation') || source.includes('intro') || source.includes('beginner')) return 'Beginner';
  return 'All Levels';
}

export function ClientCoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<'updated' | 'title-asc' | 'title-desc' | 'status' | 'recommended'>('updated');
  const [viewMode, setViewMode] = useState<'grid'>('grid');
  const [filters, setFilters] = useState<CourseCatalogFilterValue>({
    search: '',
    category: 'all',
    level: 'all',
    status: 'all',
  });
  const [isDesktopFilters, setIsDesktopFilters] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
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

  const title = user?.role === 'INSTRUCTOR' ? 'Course Library' : 'Enrolled Courses';
  const subtitle = user?.role === 'INSTRUCTOR'
    ? 'Open course detail pages or jump into your instructor course management tools.'
    : 'Browse the courses in your learning workspace and return to the material quickly.';

  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'All categories' },
      ...Array.from(new Set(courses.map(getCourseCategory))).map((category) => ({
        value: category,
        label: category,
      })),
    ],
    [courses],
  );
  const levelOptions = useMemo(
    () => [
      { value: 'all', label: 'All levels' },
      { value: 'Beginner', label: 'Beginner' },
      { value: 'Advanced', label: 'Advanced' },
      { value: 'All Levels', label: 'All Levels' },
    ],
    [],
  );
  const statusOptions = useMemo(
    () => [
      { value: 'all', label: 'All statuses' },
      ...Array.from(new Set(courses.map((course) => course.status))).map((status) => ({
        value: status,
        label: status,
      })),
    ],
    [courses],
  );
  const filteredCourses = useMemo(() => {
    const searchTerm = deferredFilters.search.trim().toLowerCase();

    return courses.filter((course) => {
      const category = getCourseCategory(course);
      const level = getCourseLevel(course);
      const matchesSearch = !searchTerm || `${course.title} ${course.description ?? ''} ${course.instructor?.name ?? ''}`
        .toLowerCase()
        .includes(searchTerm);
      const matchesCategory = deferredFilters.category === 'all' || category === deferredFilters.category;
      const matchesLevel = deferredFilters.level === 'all' || level === deferredFilters.level;
      const matchesStatus = deferredFilters.status === 'all' || course.status === deferredFilters.status;

      return matchesSearch && matchesCategory && matchesLevel && matchesStatus;
    });
  }, [courses, deferredFilters]);
  const sortedCourses = useMemo(() => {
    const withMeta = filteredCourses.map((course, index) => ({
      course,
      index,
      category: getCourseCategory(course),
      level: getCourseLevel(course),
      recommendationScore:
        (course.status === 'PUBLISHED' ? 3 : 0) +
        (course.instructor?.name ? 1 : 0) +
        (course.description ? 1 : 0),
    }));

    withMeta.sort((left, right) => {
      switch (deferredSortBy) {
        case 'title-asc':
          return left.course.title.localeCompare(right.course.title);
        case 'title-desc':
          return right.course.title.localeCompare(left.course.title);
        case 'status':
          return left.course.status.localeCompare(right.course.status) || left.course.title.localeCompare(right.course.title);
        case 'recommended':
          return right.recommendationScore - left.recommendationScore
            || right.course.updatedAt.localeCompare(left.course.updatedAt)
            || left.course.title.localeCompare(right.course.title);
        case 'updated':
        default:
          return right.course.updatedAt.localeCompare(left.course.updatedAt)
            || left.course.title.localeCompare(right.course.title);
      }
    });

    return withMeta;
  }, [deferredSortBy, filteredCourses]);
  const publishedCourses = useMemo(
    () => courses.filter((course) => course.status === 'PUBLISHED').length,
    [courses],
  );
  const availableStatuses = useMemo(
    () => Array.from(new Set(courses.map((course) => course.status))).length,
    [courses],
  );
  const continueCourseId = courses[0]?.id;
  const appliedFilters = useMemo(
    () => [
      filters.search.trim() ? { key: 'search', label: filters.search.trim() } : null,
      filters.category !== 'all' ? { key: 'category', label: filters.category } : null,
      filters.level !== 'all' ? { key: 'level', label: filters.level } : null,
      filters.status !== 'all' ? { key: 'status', label: filters.status.replace('_', ' ') } : null,
    ].filter(Boolean) as Array<{ key: string; label: string }>,
    [filters],
  );
  const isRefining = deferredSortBy !== sortBy
    || deferredFilters.search !== filters.search
    || deferredFilters.category !== filters.category
    || deferredFilters.level !== filters.level
    || deferredFilters.status !== filters.status;

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)');

    const syncFiltersShell = () => {
      const desktop = media.matches;
      setIsDesktopFilters(desktop);
      if (desktop) {
        setFiltersOpen(true);
      }
    };

    syncFiltersShell();
    media.addEventListener('change', syncFiltersShell);

    return () => {
      media.removeEventListener('change', syncFiltersShell);
    };
  }, []);

  const handleClearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      level: 'all',
      status: 'all',
    });
  };
  const handleReturnToDashboard = () => {
    navigate(user?.role === 'INSTRUCTOR' ? '/instructor/dashboard' : '/dashboard');
  };

  const renderToolbar = (
    <div className="client-card client-catalog-shell__toolbar">
      <div className="client-catalog-shell__toolbar-copy">
        <Typography.Text className="client-card-title">
          {filteredCourses.length === courses.length
            ? `${filteredCourses.length} course${filteredCourses.length === 1 ? '' : 's'} found`
            : `Showing ${filteredCourses.length} of ${courses.length} course${courses.length === 1 ? '' : 's'}`}
        </Typography.Text>
        <Typography.Text className="client-meta">
          {appliedFilters.length
            ? `Showing filtered results from ${courses.length} available course${courses.length === 1 ? '' : 's'}.`
            : 'Use filters and sorting to move from browsing to the next course action quickly.'}
        </Typography.Text>
        {isRefining ? (
          <span className="client-catalog-shell__results-status" aria-live="polite">
            <LoaderCircle size={14} />
            Updating results
          </span>
        ) : null}
      </div>
      <div className="client-catalog-shell__toolbar-actions">
        {appliedFilters.length ? (
          <div className="client-catalog-shell__toolbar-summary">
            <span className="client-badge client-badge-info">
              {appliedFilters.length} filter{appliedFilters.length === 1 ? '' : 's'} applied
            </span>
          </div>
        ) : null}
        <div className="client-catalog-shell__toolbar-controls">
          <label className="client-field client-catalog-shell__toolbar-field">
            <span className="client-label">Sort by</span>
            <Select
              size="large"
              value={sortBy}
              className="client-select"
              aria-label="Sort course results"
              onChange={(value) => setSortBy(value)}
              options={[
                { value: 'updated', label: 'Recently updated' },
                { value: 'title-asc', label: 'Course title A-Z' },
                { value: 'title-desc', label: 'Course title Z-A' },
                { value: 'status', label: 'Status' },
                { value: 'recommended', label: 'Recommended' },
              ]}
            />
          </label>

          <div className="client-field client-catalog-shell__toolbar-field">
            <span className="client-label">View</span>
            <div className="client-catalog-shell__view-controls" role="group" aria-label="Course results view">
              <Button
                className="client-button client-button-secondary"
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={16} />
                Grid
              </Button>
              <Button className="client-button client-button-ghost client-catalog-shell__view-control--disabled" disabled aria-disabled="true">
                <Rows3 size={16} />
                Compact
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ClientLayout>
      <ClientPageContainer title={title} subtitle={subtitle}>
        <div className="client-section client-catalog-shell">
          {coursesQuery.isLoading ? <CourseCatalogSkeleton /> : null}
          {!coursesQuery.isLoading && coursesQuery.error ? (
            <CourseCatalogStatePanel
              variant="error"
              title="Unable to load courses"
              description="Something went wrong while loading the catalog."
              actionLabel="Retry"
              onAction={() => {
                void coursesQuery.refetch();
              }}
            />
          ) : null}
          {!coursesQuery.isLoading && !coursesQuery.error && !courses.length ? (
            <CourseCatalogStatePanel
              variant="empty"
              title="No courses available"
              description="Courses will appear here when they become available."
              actionLabel="Return to Dashboard"
              onAction={handleReturnToDashboard}
            />
          ) : null}

          {!coursesQuery.isLoading && !coursesQuery.error && courses.length > 0 ? (
            <>
              <section className="client-card client-section client-catalog-shell__hero">
                <div className="client-catalog-shell__hero-copy">
                  <Typography.Text className="client-caption client-catalog-shell__eyebrow">
                    Course catalog
                  </Typography.Text>
                  <Typography.Title level={2} className="client-page-title">
                    Explore Courses
                  </Typography.Title>
                  <Typography.Paragraph className="client-body">
                    Find the right course to continue your learning journey.
                  </Typography.Paragraph>
                  <div className="client-catalog-shell__hero-actions">
                    <a href="#catalog-results" className="client-button client-button-primary">
                      View My Courses
                    </a>
                    {continueCourseId ? (
                      <Button
                        className="client-button client-button-secondary"
                        onClick={() => navigate(`/courses/${continueCourseId}`)}
                      >
                        Open first course
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="client-grid client-catalog-shell__hero-metrics" aria-label="Catalog summary metrics">
                  <MetricCard
                    label="Available courses"
                    value={courses.length || 0}
                    caption="Visible in your workspace catalog"
                    className="client-catalog-shell__hero-metric"
                  />
                  <MetricCard
                    label={user?.role === 'INSTRUCTOR' ? 'Managed courses' : 'Published courses'}
                    value={user?.role === 'INSTRUCTOR' ? courses.length || 0 : publishedCourses}
                    caption={user?.role === 'INSTRUCTOR' ? 'Open for instructor oversight' : 'Ready to open now'}
                    className="client-catalog-shell__hero-metric"
                  />
                  <MetricCard
                    label="Available statuses"
                    value={availableStatuses}
                    caption="Real course states in this catalog"
                    className="client-catalog-shell__hero-metric"
                  />
                </div>
              </section>

              <section className="client-card client-section client-catalog-shell__canvas">
                {renderToolbar}

                <div className="client-catalog-shell__body">
                  <aside className="client-catalog-shell__sidebar">
                    <details open={filtersOpen} className="client-card client-catalog-shell__filters-shell">
                      <summary
                        className="client-catalog-shell__filters-summary"
                        onClick={(event) => {
                          event.preventDefault();
                          if (!isDesktopFilters) {
                            setFiltersOpen((current) => !current);
                          }
                        }}
                        aria-expanded={isDesktopFilters ? true : filtersOpen}
                      >
                        <div className="client-catalog-shell__filters-summary-copy">
                          <span className="client-card-title">Filters</span>
                          <span className="client-meta">
                            {appliedFilters.length
                              ? `${appliedFilters.length} applied · ${filteredCourses.length} visible`
                              : 'Search, narrow, and clear filters from one control panel'}
                          </span>
                        </div>
                        <Button className="client-button client-button-secondary client-catalog-shell__filters-toggle">
                          <Filter size={16} />
                          {filtersOpen ? 'Hide filters' : 'Open filters'}
                        </Button>
                      </summary>

                      <div className="client-catalog-shell__filters-panel">
                        <CourseCatalogFilters
                          value={filters}
                          categoryOptions={categoryOptions}
                          levelOptions={levelOptions}
                          statusOptions={statusOptions}
                          appliedFilters={appliedFilters}
                          resultCount={filteredCourses.length}
                          onChange={setFilters}
                          onClearAll={handleClearFilters}
                        />
                      </div>
                    </details>
                  </aside>

                  <div className="client-section client-catalog-shell__results">
                    <section id="catalog-results" className="client-card client-catalog-shell__results-shell">
                      <div className="client-section-header">
                        <Typography.Title level={4} className="client-section-title">
                          Catalog results
                        </Typography.Title>
                        <Typography.Paragraph className="client-meta">
                          Open a course, review details, or use filters to narrow the next action.
                        </Typography.Paragraph>
                      </div>

                      <Row gutter={[16, 16]} className="client-catalog-shell__results-grid" data-view={viewMode}>
                        {sortedCourses.map(({ course, category, level }) => (
                          <Col key={course.id} xs={24} md={12} xl={8}>
                            <CourseCatalogCard
                              course={course}
                              category={category}
                              level={level}
                              role={user?.role}
                            />
                          </Col>
                        ))}
                      </Row>
                      {!coursesQuery.isLoading && courses.length > 0 && filteredCourses.length === 0 ? (
                        <EmptyState
                          className="client-catalog-shell__empty-results"
                          compact
                          title="No courses match your filters"
                          description="Try adjusting your search or clearing filters."
                          action={(
                            <Button className="client-button client-button-secondary" onClick={handleClearFilters}>
                              Clear filters
                            </Button>
                          )}
                        />
                      ) : null}
                    </section>
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </div>

      </ClientPageContainer>
    </ClientLayout>
  );
}

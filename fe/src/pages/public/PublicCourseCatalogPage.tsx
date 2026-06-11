import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Col, Empty, Input, Row, Select, Skeleton } from 'antd';
import { BookOpen, Filter, Search, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '../../components/public/MarketingLayout';
import { PublicCourseCard } from '../../components/public/PublicCourseCard';
import { listPublicCoursesRequest } from '../../services/api/courseApi';

type SortOption = 'newest' | 'lessons' | 'popular';

export function PublicCourseCatalogPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const coursesQuery = useQuery({
    queryKey: ['public', 'catalog', search],
    queryFn: async () => (await listPublicCoursesRequest({ page: 1, limit: 50, search: search || undefined })).data,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const courses = useMemo(() => {
    const results = [...(coursesQuery.data ?? [])];

    if (sort === 'lessons') {
      return results.sort((a, b) => (b.lessonCount ?? 0) - (a.lessonCount ?? 0));
    }

    if (sort === 'popular') {
      return results.sort((a, b) => (b.enrollmentCount ?? 0) - (a.enrollmentCount ?? 0));
    }

    return results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [coursesQuery.data, sort]);

  return (
    <MarketingLayout>
      <section className="public-page public-page--catalog">
        <div className="public-page-hero">
          <div>
            <span className="public-kicker">Public Catalog</span>
            <h1 className="public-page-title">Course Catalog</h1>
            <p className="public-page-copy">
              Browse published courses, compare curriculum depth, and open a course detail page for the full module outline.
            </p>
          </div>
          <div className="public-page-note">
            <BookOpen size={18} />
            <span>Sign in or create an account to access enrolled course work, assignments, quizzes, grades, and notifications.</span>
          </div>
        </div>
        <div className="public-filter-card" aria-label="Catalog filters">
          <div className="public-filter-card__search">
            <Search size={18} />
            <Input
              size="large"
              variant="borderless"
              placeholder="Search published courses"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select
            aria-label="Category"
            value="all"
            options={[{ value: 'all', label: 'All categories' }]}
          />
          <Select
            aria-label="Level"
            value="all"
            options={[{ value: 'all', label: 'All levels' }]}
          />
          <Select
            aria-label="Sort courses"
            value={sort}
            onChange={setSort}
            suffixIcon={<SlidersHorizontal size={16} />}
            options={[
              { value: 'newest', label: 'Recently updated' },
              { value: 'lessons', label: 'Most lessons' },
              { value: 'popular', label: 'Most enrolled' },
            ]}
          />
        </div>
        {coursesQuery.isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        {coursesQuery.error ? <Alert type="error" showIcon message="Failed to load catalog" /> : null}
        {!coursesQuery.isLoading && !courses.length ? (
          <div className="public-card public-empty-card">
            <Empty
              description={
                search
                  ? 'No published courses match your search.'
                  : 'No published courses are available yet.'
              }
            >
              <Link className="public-btn public-btn--primary" to="/register">Create account</Link>
            </Empty>
          </div>
        ) : null}
        <div className="public-result-summary">
          <Filter size={16} />
          <span>{courses.length} published course{courses.length === 1 ? '' : 's'} available</span>
        </div>
        <Row gutter={[24, 24]}>
          {courses.map((course) => (
            <Col key={course.id} xs={24} md={12} xl={8}>
              <PublicCourseCard course={course} />
            </Col>
          ))}
        </Row>
      </section>
    </MarketingLayout>
  );
}

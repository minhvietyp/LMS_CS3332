import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Col, Empty, Input, Row, Skeleton, Typography } from 'antd';
import { Search } from 'lucide-react';
import { MarketingLayout } from '../../components/public/MarketingLayout';
import { PublicCourseCard } from '../../components/public/PublicCourseCard';
import { listPublicCoursesRequest } from '../../services/api/courseApi';

export function PublicCourseCatalogPage() {
  const [search, setSearch] = useState('');
  const coursesQuery = useQuery({
    queryKey: ['public', 'catalog', search],
    queryFn: async () => (await listPublicCoursesRequest({ page: 1, limit: 50, search: search || undefined })).data,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);

  return (
    <MarketingLayout>
      <section className="marketing-section">
        <div className="marketing-section__header">
          <div>
            <Typography.Title level={1}>Course catalog</Typography.Title>
            <Typography.Paragraph type="secondary">
              Browse published courses, compare curriculum depth, and open a course detail page for the full module outline.
            </Typography.Paragraph>
          </div>
        </div>
        <div className="marketing-surface" style={{ marginBottom: 24 }}>
          <Input
            size="large"
            prefix={<Search size={16} />}
            placeholder="Search published courses"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {coursesQuery.isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        {coursesQuery.error ? <Alert type="error" showIcon message="Failed to load catalog" /> : null}
        {!coursesQuery.isLoading && !courses.length ? <Empty description="No published courses found." /> : null}
        <Row gutter={[16, 16]}>
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

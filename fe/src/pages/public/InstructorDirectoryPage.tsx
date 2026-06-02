import { useQuery } from '@tanstack/react-query';
import { Alert, Col, Empty, Row, Skeleton, Typography } from 'antd';
import { MarketingLayout } from '../../components/public/MarketingLayout';
import { PublicInstructorCard } from '../../components/public/PublicInstructorCard';
import { listPublicInstructorsRequest } from '../../services/api/authApi';

export function InstructorDirectoryPage() {
  const instructorsQuery = useQuery({
    queryKey: ['public', 'instructors'],
    queryFn: listPublicInstructorsRequest,
    staleTime: 60 * 1000,
    retry: 1,
  });

  return (
    <MarketingLayout>
      <section className="marketing-section">
        <div className="marketing-section__header">
          <div>
            <Typography.Title level={1}>Instructor directory</Typography.Title>
            <Typography.Paragraph type="secondary">
              Review instructor expertise, published course load, and links into each teaching profile.
            </Typography.Paragraph>
          </div>
        </div>
        {instructorsQuery.isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        {instructorsQuery.error ? <Alert type="error" showIcon message="Failed to load instructors" /> : null}
        {!instructorsQuery.isLoading && !instructorsQuery.data?.length ? <Empty description="No instructors are publicly listed yet." /> : null}
        <Row gutter={[16, 16]}>
          {(instructorsQuery.data ?? []).map((instructor) => (
            <Col key={instructor.id} xs={24} md={12} xl={8}>
              <PublicInstructorCard instructor={instructor} />
            </Col>
          ))}
        </Row>
      </section>
    </MarketingLayout>
  );
}

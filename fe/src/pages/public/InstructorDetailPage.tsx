import { useQuery } from '@tanstack/react-query';
import { Alert, Avatar, Col, Empty, Row, Skeleton, Space, Tag, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import { MarketingLayout } from '../../components/public/MarketingLayout';
import { PublicCourseCard } from '../../components/public/PublicCourseCard';
import { getPublicInstructorByIdRequest } from '../../services/api/authApi';

export function InstructorDetailPage() {
  const { instructorId = '' } = useParams();
  const instructorQuery = useQuery({
    queryKey: ['public', 'instructor-detail', instructorId],
    queryFn: () => getPublicInstructorByIdRequest(instructorId),
    enabled: Boolean(instructorId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const instructor = instructorQuery.data;

  return (
    <MarketingLayout>
      {instructorQuery.isLoading ? <Skeleton active paragraph={{ rows: 10 }} /> : null}
      {instructorQuery.error ? <Alert type="error" showIcon message="Failed to load instructor profile" /> : null}
      {!instructorQuery.isLoading && !instructor ? <Empty description="Instructor not found." /> : null}
      {instructor ? (
        <>
          <section className="marketing-surface">
            <Space align="start" size={20} wrap>
              <Avatar size={88} src={instructor.avatarUrl ?? undefined}>
                {instructor.name.slice(0, 1).toUpperCase()}
              </Avatar>
              <div>
                <Typography.Title level={1}>{instructor.name}</Typography.Title>
                <Typography.Paragraph type="secondary">
                  {instructor.occupation || 'Instructor'}
                </Typography.Paragraph>
                <Typography.Paragraph>{instructor.bio || 'This instructor profile highlights published courses and teaching focus.'}</Typography.Paragraph>
                <Space wrap>
                  <Tag color="blue">{instructor.courseCount ?? 0} courses</Tag>
                  <Tag color="green">{instructor.studentCount ?? 0} learners</Tag>
                </Space>
              </div>
            </Space>
          </section>

          <section className="marketing-section">
            <div className="marketing-section__header">
              <div>
                <Typography.Title level={2}>Published courses</Typography.Title>
                <Typography.Paragraph type="secondary">
                  Courses currently led by this instructor in the public catalog.
                </Typography.Paragraph>
              </div>
            </div>
            <Row gutter={[16, 16]}>
              {(instructor.publishedCourses ?? []).map((course) => (
                <Col key={course.id} xs={24} md={12} xl={8}>
                  <PublicCourseCard course={course} />
                </Col>
              ))}
            </Row>
          </section>
        </>
      ) : null}
    </MarketingLayout>
  );
}

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Progress,
  Row,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { listCoursesRequest } from '../services/courseApi';
import { useAuth } from '../components/context/AuthContext';
import { ClientLayout, ClientPageContainer } from '../components/client/layout';
import './ClientCoursesPage.css';

export function ClientCoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const filterCard = (
    <Card className="client-courses-filter-card">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Title level={5}>Refine courses</Typography.Title>
        <Input size="large" prefix={<Search size={16} />} placeholder="Search courses" />
        <Select
          size="large"
          defaultValue="all"
          options={[
            { value: 'all', label: 'All categories' },
            { value: 'frontend', label: 'Frontend' },
            { value: 'backend', label: 'Backend' },
          ]}
        />
        <Select
          size="large"
          defaultValue="all-levels"
          options={[
            { value: 'all-levels', label: 'All levels' },
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
          ]}
        />
        <div className="client-courses-filter-card__hint">
          Sticky filters, rating, duration, and language controls can connect here as API support grows.
        </div>
      </Space>
    </Card>
  );

  return (
    <ClientLayout>
      <ClientPageContainer title={title} subtitle={subtitle}>
        {coursesQuery.isLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
        {coursesQuery.error ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load courses"
            description={coursesQuery.error instanceof Error ? coursesQuery.error.message : 'Unexpected error'}
          />
        ) : null}
        {!coursesQuery.isLoading && !courses.length ? <Empty description="No courses available." /> : null}
        <div className="client-courses-layout">
          <aside className="client-courses-layout__sidebar">{filterCard}</aside>
          <div className="client-courses-layout__content">
            <div className="client-courses-toolbar">
              <Typography.Text type="secondary">
                {courses.length} course{courses.length === 1 ? '' : 's'} available
              </Typography.Text>
              <Space wrap>
                <Tag color="blue">{user?.role === 'INSTRUCTOR' ? 'Library view' : 'Enrolled view'}</Tag>
                <Tag color="gold">Grid layout</Tag>
              </Space>
            </div>
            <Row gutter={[16, 16]}>
              {courses.map((course, index) => (
                <Col key={course.id} xs={24} md={12} xl={8}>
                  <Card className="client-course-card">
                    <div className="client-course-card__thumbnail">
                      <span>{course.title.slice(0, 1).toUpperCase()}</span>
                    </div>
                    <Space direction="vertical" size={14} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={course.status === 'PUBLISHED' ? 'green' : course.status === 'ARCHIVED' ? 'gold' : 'blue'}>
                          {course.status}
                        </Tag>
                        {course.instructor?.name ? <Tag>{course.instructor.name}</Tag> : null}
                        <Tag color="purple">{index % 2 === 0 ? 'Intermediate' : 'Beginner'}</Tag>
                      </Space>
                      <div>
                        <Typography.Title level={4} className="client-course-card__title">
                          {course.title}
                        </Typography.Title>
                        <Typography.Paragraph type="secondary" className="client-course-card__description">
                          {course.description || 'No course description available yet.'}
                        </Typography.Paragraph>
                      </div>
                      <div className="client-course-card__meta">
                        <span>{12 + index * 2} lessons</span>
                        <span>{120 + index * 15} students</span>
                        <span>{index % 2 === 0 ? '4.8 rating' : '4.6 rating'}</span>
                      </div>
                      <div>
                        <div className="client-course-card__progress-copy">
                          <span>{user?.role === 'INSTRUCTOR' ? 'Completion trend' : 'Your progress'}</span>
                          <strong>{user?.role === 'INSTRUCTOR' ? `${68 + index}%` : `${42 + index * 6}%`}</strong>
                        </div>
                        <Progress
                          percent={user?.role === 'INSTRUCTOR' ? 68 + index : 42 + index * 6}
                          showInfo={false}
                          strokeColor={{ '0%': '#5b98ff', '100%': '#ff8e72' }}
                        />
                      </div>
                      <Space wrap>
                        <Button type="primary" onClick={() => navigate(`/courses/${course.id}`)}>
                          View detail
                        </Button>
                        {user?.role === 'INSTRUCTOR' ? (
                          <Button>
                            <Link to="/instructor/courses">Manage</Link>
                          </Button>
                        ) : (
                          <Button>Wishlist</Button>
                        )}
                      </Space>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}

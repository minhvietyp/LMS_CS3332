import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Empty, Skeleton, Space, Tag, Typography } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { MarketingLayout } from '../../components/public/MarketingLayout';
import { getPublicCourseByIdRequest } from '../../services/api/courseApi';

export function PublicCourseDetailPage() {
  const { courseId = '' } = useParams();
  const courseQuery = useQuery({
    queryKey: ['public', 'course-detail', courseId],
    queryFn: () => getPublicCourseByIdRequest(courseId),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const course = courseQuery.data;

  return (
    <MarketingLayout>
      {courseQuery.isLoading ? <Skeleton active paragraph={{ rows: 10 }} /> : null}
      {courseQuery.error ? <Alert type="error" showIcon message="Failed to load public course detail" /> : null}
      {!courseQuery.isLoading && !course ? <Empty description="Course not found." /> : null}
      {course ? (
        <>
          <section className="marketing-hero">
            <article className="marketing-hero__panel">
              <span className="marketing-hero__eyebrow">Published course</span>
              <Typography.Title className="marketing-hero__title">{course.title}</Typography.Title>
              <Typography.Paragraph className="marketing-hero__copy">
                {course.description || 'This course currently has a published curriculum available for review.'}
              </Typography.Paragraph>
              <div className="marketing-course-card__meta">
                <Tag color="blue">{course.moduleCount ?? course.modules.length} modules</Tag>
                <Tag color="purple">{course.lessonCount ?? 0} lessons</Tag>
                <Tag color="green">{course.enrollmentCount ?? 0} learners</Tag>
              </div>
              <div className="marketing-hero__actions">
                <Link to="/register">
                  <Button type="primary" size="large">Create account</Button>
                </Link>
                <Link to="/login">
                  <Button size="large">Login to enroll</Button>
                </Link>
              </div>
            </article>
            <aside className="marketing-surface">
              <Typography.Title level={4}>Instructor</Typography.Title>
              <Typography.Paragraph strong>{course.instructor?.name ?? 'Assigned instructor'}</Typography.Paragraph>
              <Typography.Paragraph type="secondary">
                {course.instructor?.bio || course.instructor?.occupation || 'Instructor information is available on the profile page.'}
              </Typography.Paragraph>
              {course.instructor?.id ? (
                <Link to={`/instructors/${course.instructor.id}`}>View instructor profile</Link>
              ) : null}
            </aside>
          </section>

          <section className="marketing-section">
            <div className="marketing-page-grid">
              <article className="marketing-surface">
                <Typography.Title level={3}>Modules and lessons</Typography.Title>
                <div className="marketing-list">
                  {course.modules.map((module) => (
                    <section key={module.id} className="marketing-list__item">
                      <Typography.Title level={4}>{module.title}</Typography.Title>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {module.lessons.map((lesson) => (
                          <Typography.Text key={lesson.id}>
                            Lesson {lesson.orderIndex}: {lesson.title}
                          </Typography.Text>
                        ))}
                      </Space>
                    </section>
                  ))}
                </div>
              </article>
              <aside className="marketing-surface">
                <Typography.Title level={4}>Before you enroll</Typography.Title>
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  <Typography.Paragraph type="secondary">
                    Review the curriculum, then register to access assignments, quizzes, progress tracking, and the full learning workspace.
                  </Typography.Paragraph>
                  <Link to="/help-center">Visit the Help Center</Link>
                  <Link to="/faq">Read learner FAQs</Link>
                  <Link to="/catalog">Back to catalog</Link>
                </Space>
              </aside>
            </div>
          </section>
        </>
      ) : null}
    </MarketingLayout>
  );
}

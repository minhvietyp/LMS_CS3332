import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Skeleton, Space, Tag, Typography } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../components/client/layout';
import { useAuth } from '../components/context/AuthContext';
import { listStudentCourseAssignmentsRequest } from '../services/assignmentApi';
import { listCoursesRequest } from '../services/courseApi';
import { listCourseModulesRequest } from '../services/lessonApi';
import { listStudentCourseQuizzesRequest } from '../services/quizApi';

export function ClientCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const courseQuery = useQuery({
    queryKey: ['courses', 'client-detail', courseId],
    queryFn: async () => {
      const response = await listCoursesRequest({ page: 1, limit: 100 });
      return response.data.find((course) => course.id === courseId) ?? null;
    },
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });

  const modulesQuery = useQuery({
    queryKey: ['courses', 'client-modules', courseId],
    queryFn: () => listCourseModulesRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const quizzesQuery = useQuery({
    queryKey: ['courses', 'client-quizzes', courseId],
    queryFn: () => listStudentCourseQuizzesRequest(courseId!),
    enabled: Boolean(courseId) && user?.role === 'STUDENT',
    staleTime: 60 * 1000,
    retry: 1,
  });

  const assignmentsQuery = useQuery({
    queryKey: ['courses', 'client-assignments', courseId],
    queryFn: () => listStudentCourseAssignmentsRequest(courseId!),
    enabled: Boolean(courseId) && user?.role === 'STUDENT',
    staleTime: 60 * 1000,
    retry: 1,
  });

  const course = courseQuery.data;

  return (
    <ClientLayout>
      <ClientPageContainer
        title={course?.title ?? 'Course Detail'}
        subtitle={course?.description ?? 'Review modules and lessons in this course.'}
        actions={
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      >
        {courseQuery.isLoading ? <Skeleton active paragraph={{ rows: 5 }} /> : null}
        {courseQuery.error ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load course"
            description={courseQuery.error instanceof Error ? courseQuery.error.message : 'Unexpected error'}
          />
        ) : null}
        {!courseQuery.isLoading && !course ? <Empty description="Course not found." /> : null}

        {course ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={course.status === 'PUBLISHED' ? 'green' : course.status === 'ARCHIVED' ? 'gold' : 'blue'}>
                {course.status}
              </Tag>
              {course.instructor?.name ? <Tag>{course.instructor.name}</Tag> : null}
            </Space>

            {modulesQuery.isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : null}
            {modulesQuery.error ? (
              <Alert
                type="warning"
                showIcon
                message="Modules could not be loaded"
                description={modulesQuery.error instanceof Error ? modulesQuery.error.message : 'Unexpected error'}
              />
            ) : null}
            {!modulesQuery.isLoading && !modulesQuery.data?.length ? (
              <Empty description="No modules available for this course yet." />
            ) : null}

            {modulesQuery.data?.map((module) => (
              <Card key={module.id} style={{ borderRadius: 24 }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <Typography.Title level={4} style={{ marginBottom: 4 }}>
                      {module.orderIndex + 1}. {module.title}
                    </Typography.Title>
                    <Typography.Text type="secondary">{module.lessons.length} lessons</Typography.Text>
                  </div>
                  {module.lessons.map((lesson) => (
                    <Card key={lesson.id} size="small">
                      <Space direction="vertical" size={4}>
                        <Typography.Text strong>{lesson.title}</Typography.Text>
                        <Typography.Text type="secondary">
                          {lesson.videoUrl || 'Lesson learning layout can be connected to this lesson next.'}
                        </Typography.Text>
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Card>
            ))}

            {user?.role === 'STUDENT' ? (
            <Card style={{ borderRadius: 24 }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div>
                  <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    Course assignments
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    Review deadlines and submit a text response, a file, or both.
                  </Typography.Text>
                </div>
                {assignmentsQuery.isLoading ? <Skeleton active paragraph={{ rows: 2 }} /> : null}
                {assignmentsQuery.error ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Assignments could not be loaded"
                    description={assignmentsQuery.error instanceof Error ? assignmentsQuery.error.message : 'Unexpected error'}
                  />
                ) : null}
                {!assignmentsQuery.isLoading && !assignmentsQuery.data?.length ? (
                  <Empty description="No assignments available for this course yet." />
                ) : null}
                {assignmentsQuery.data?.slice(0, 3).map((assignment) => (
                  <Card key={assignment.id} size="small">
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <div>
                        <Typography.Text strong>{assignment.title}</Typography.Text>
                        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                          {assignment.description || 'No assignment description yet.'}
                        </Typography.Paragraph>
                      </div>
                      <Space wrap>
                        <Tag color={assignment.dueDate ? 'gold' : 'default'}>
                          {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}
                        </Tag>
                        <Tag color={assignment.allowLateSubmission ? 'orange' : 'red'}>
                          {assignment.allowLateSubmission ? 'Late allowed' : 'Late blocked'}
                        </Tag>
                      </Space>
                    </Space>
                  </Card>
                ))}
                {assignmentsQuery.data?.length ? (
                  <Button type="primary" onClick={() => navigate(`/courses/${courseId}/assignments`)}>
                    Open assignment center
                  </Button>
                ) : null}
              </Space>
            </Card>
            ) : null}

            {user?.role === 'STUDENT' ? (
            <Card style={{ borderRadius: 24 }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div>
                  <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    Course quizzes
                  </Typography.Title>
                  <Typography.Text type="secondary">
                    Start a quiz attempt or review the current assessment availability for this course.
                  </Typography.Text>
                </div>
                {quizzesQuery.isLoading ? <Skeleton active paragraph={{ rows: 2 }} /> : null}
                {quizzesQuery.error ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Quizzes could not be loaded"
                    description={quizzesQuery.error instanceof Error ? quizzesQuery.error.message : 'Unexpected error'}
                  />
                ) : null}
                {!quizzesQuery.isLoading && !quizzesQuery.data?.length ? (
                  <Empty description="No quizzes available for this course yet." />
                ) : null}
                {quizzesQuery.data?.slice(0, 3).map((quiz) => (
                  <Card key={quiz.id} size="small">
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <div>
                        <Typography.Text strong>{quiz.title}</Typography.Text>
                        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                          {quiz.description || 'No quiz description yet.'}
                        </Typography.Paragraph>
                      </div>
                      <Space wrap>
                        <Tag color="blue">{quiz.questionCount} questions</Tag>
                        <Tag color="purple">{quiz.attemptsRemaining} attempts remaining</Tag>
                      </Space>
                    </Space>
                  </Card>
                ))}
                {quizzesQuery.data?.length ? (
                  <Button type="primary" onClick={() => navigate(`/courses/${courseId}/quizzes`)}>
                    Open quiz center
                  </Button>
                ) : null}
              </Space>
            </Card>
            ) : null}
          </Space>
        ) : null}
      </ClientPageContainer>
    </ClientLayout>
  );
}

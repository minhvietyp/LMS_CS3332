import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Collapse, Empty, Progress, Space, Spin, Tabs, Tag, Typography } from 'antd';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { listCourseAssignmentsRequest } from '../../../../services/api/assignmentApi';
import { getCourseByIdRequest } from '../../../../services/api/courseApi';
import { progressService } from '../../../../services/api/progressService';
import { listCourseQuizzesRequest } from '../../../../services/api/quizApi';
import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';
import { CourseManagementDetail } from '../../../admin/courses/components';
import '../InstructorWorkspacePage.css';

function formatShortDate(value: string | null | undefined) {
  if (!value) return 'No activity yet';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function InstructorCourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const courseId = id ?? '';

  const courseQuery = useQuery({
    queryKey: ['instructor-course-detail', courseId, 'detail'],
    queryFn: () => getCourseByIdRequest(courseId),
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });

  const assignmentsQuery = useQuery({
    queryKey: ['instructor-course-detail', courseId, 'assignments'],
    queryFn: () => listCourseAssignmentsRequest(courseId),
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });

  const quizzesQuery = useQuery({
    queryKey: ['instructor-course-detail', courseId, 'quizzes'],
    queryFn: () => listCourseQuizzesRequest(courseId),
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });

  const progressQuery = useQuery({
    queryKey: ['instructor-course-detail', courseId, 'progress'],
    queryFn: () =>
      progressService.getInstructorCourseProgress(courseId, {
        page: 1,
        pageSize: 6,
        sortBy: 'lastActivity',
        sortOrder: 'desc',
      }),
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });

  const summary = useMemo(() => {
    const course = courseQuery.data;
    const assignments = assignmentsQuery.data ?? [];
    const quizzes = quizzesQuery.data ?? [];
    const progress = progressQuery.data;

    return {
      lessonCount: course?.modules.reduce((sum, module) => sum + module.lessons.length, 0) ?? 0,
      studentCount: progress?.course.totalStudents ?? 0,
      completion: progress?.course.averageWeightedProgress ?? 0,
      assignments: assignments.length,
      quizzes: quizzes.length,
      recentActivities:
        progress?.students
          .filter((student) => student.lastProgressAt)
          .slice(0, 4)
          .map((student) => ({
            id: student.studentId,
            title: `${student.studentName} progressed in the course`,
            subtitle: `${student.completedLessons}/${student.totalLessons} lessons complete`,
            timestamp: student.lastProgressAt,
          })) ?? [],
      upcomingDeadlines: assignments
        .filter((assignment) => assignment.dueDate)
        .slice()
        .sort((left, right) => new Date(left.dueDate ?? '').getTime() - new Date(right.dueDate ?? '').getTime())
        .slice(0, 4),
    };
  }, [assignmentsQuery.data, courseQuery.data, progressQuery.data, quizzesQuery.data]);

  if (!id) {
    return <Navigate to="/instructor/courses" replace />;
  }

  const isLoading =
    courseQuery.isLoading ||
    assignmentsQuery.isLoading ||
    quizzesQuery.isLoading ||
    progressQuery.isLoading;

  const error =
    courseQuery.error || assignmentsQuery.error || quizzesQuery.error || progressQuery.error;

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Course Workspace"
        subtitle="Review teaching health, lesson structure, assessment pressure, and student movement in one instructor view."
      >
        <section className="instructor-workspace">
          {error ? (
            <Alert
              type="error"
              showIcon
              message="Failed to load course workspace"
              description={error instanceof Error ? error.message : 'Unexpected error'}
            />
          ) : null}

          {isLoading ? (
            <section className="instructor-workspace__loading">
              <Spin tip="Loading course workspace..." />
            </section>
          ) : courseQuery.data ? (
            <>
              <section className="instructor-course-workspace-hero">
                <div className="instructor-course-workspace-hero__copy">
                  <Typography.Text className="instructor-workspace-card__label">Teaching workspace</Typography.Text>
                  <Space wrap>
                    <Tag color={courseQuery.data.status === 'PUBLISHED' ? 'green' : courseQuery.data.status === 'ARCHIVED' ? 'default' : 'blue'}>
                      {courseQuery.data.status}
                    </Tag>
                    <Tag>{summary.lessonCount} lessons</Tag>
                  </Space>
                  <Typography.Title level={2}>{courseQuery.data.title}</Typography.Title>
                  <Typography.Paragraph>{courseQuery.data.description || 'No course summary available yet.'}</Typography.Paragraph>
                  <div className="instructor-course-workspace-hero__actions">
                    <Button type="primary" onClick={() => navigate('/instructor/lessons')}>Continue teaching</Button>
                    <Button onClick={() => navigate('/instructor/assessments')}>Open assessments</Button>
                    <Button onClick={() => navigate(`/courses/${courseId}/analytics`)}>Analytics</Button>
                  </div>
                </div>

                <Card className="instructor-workspace-card instructor-course-workspace-hero__stats">
                  <div className="instructor-course-workspace-hero__metrics">
                    <div><span>Students</span><strong>{summary.studentCount}</strong></div>
                    <div><span>Assignments</span><strong>{summary.assignments}</strong></div>
                    <div><span>Quizzes</span><strong>{summary.quizzes}</strong></div>
                    <div><span>Completion</span><strong>{summary.completion}%</strong></div>
                  </div>
                  <Progress percent={summary.completion} showInfo={false} />
                </Card>
              </section>

              <Tabs
                className="instructor-course-workspace-tabs"
                items={[
                  {
                    key: 'overview',
                    label: 'Overview',
                    children: (
                      <div className="instructor-course-workspace-grid">
                        <Card className="instructor-workspace-card">
                          <Typography.Title level={4}>Recent activity</Typography.Title>
                          {summary.recentActivities.length ? (
                            <div className="instructor-course-workspace-list">
                              {summary.recentActivities.map((activity) => (
                                <div key={activity.id} className="instructor-course-workspace-list__item">
                                  <strong>{activity.title}</strong>
                                  <span>{activity.subtitle}</span>
                                  <span>{formatShortDate(activity.timestamp)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No recent learner activity yet." />
                          )}
                        </Card>
                        <Card className="instructor-workspace-card">
                          <Typography.Title level={4}>Upcoming deadlines</Typography.Title>
                          {summary.upcomingDeadlines.length ? (
                            <div className="instructor-course-workspace-list">
                              {summary.upcomingDeadlines.map((assignment) => (
                                <div key={assignment.id} className="instructor-course-workspace-list__item">
                                  <strong>{assignment.title}</strong>
                                  <span>Due {formatShortDate(assignment.dueDate)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No scheduled deadlines yet." />
                          )}
                        </Card>
                      </div>
                    ),
                  },
                  {
                    key: 'lessons',
                    label: 'Lessons',
                    children: (
                      <div className="instructor-course-module-stack">
                        {courseQuery.data.modules.length ? (
                          courseQuery.data.modules.map((module) => (
                            <Card key={module.id} className="instructor-workspace-card">
                              <div className="instructor-course-module-stack__header">
                                <div>
                                  <Typography.Text className="instructor-workspace-card__label">
                                    Module {module.orderIndex + 1}
                                  </Typography.Text>
                                  <Typography.Title level={4}>{module.title}</Typography.Title>
                                </div>
                                <Tag>{module.lessons.length} lessons</Tag>
                              </div>
                              <div className="instructor-course-module-stack__lessons">
                                {module.lessons.map((lesson) => (
                                  <div key={lesson.id} className="instructor-course-module-stack__lesson">
                                    <div>
                                      <strong>{lesson.title}</strong>
                                      <span>{lesson.isPublished ? 'Published lesson' : 'Draft lesson'}</span>
                                    </div>
                                    <Button size="small" onClick={() => navigate('/instructor/lessons')}>
                                      Manage lesson
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </Card>
                          ))
                        ) : (
                          <Empty description="No modules have been created yet." />
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'assignments',
                    label: 'Assignments',
                    children: (
                      <div className="instructor-course-card-list">
                        {(assignmentsQuery.data ?? []).length ? (
                          assignmentsQuery.data?.map((assignment) => (
                            <Card key={assignment.id} className="instructor-workspace-card">
                              <div className="instructor-course-card-list__header">
                                <div>
                                  <Typography.Title level={5}>{assignment.title}</Typography.Title>
                                  <Typography.Paragraph>{assignment.description || 'No assignment summary yet.'}</Typography.Paragraph>
                                </div>
                                <Tag color={assignment.allowLateSubmission ? 'green' : 'red'}>
                                  {assignment.allowLateSubmission ? 'Late allowed' : 'Strict due date'}
                                </Tag>
                              </div>
                              <div className="instructor-course-card-list__actions">
                                <Typography.Text type="secondary">
                                  Due {formatShortDate(assignment.dueDate)}
                                </Typography.Text>
                                <Button onClick={() => navigate('/instructor/assessments')}>Review in workspace</Button>
                              </div>
                            </Card>
                          )) ?? null
                        ) : (
                          <Empty description="No assignments available for this course." />
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'quizzes',
                    label: 'Quizzes',
                    children: (
                      <div className="instructor-course-card-list">
                        {(quizzesQuery.data ?? []).length ? (
                          quizzesQuery.data?.map((quiz) => (
                            <Card key={quiz.id} className="instructor-workspace-card">
                              <div className="instructor-course-card-list__header">
                                <div>
                                  <Typography.Title level={5}>{quiz.title}</Typography.Title>
                                  <Typography.Paragraph>{quiz.description || 'No quiz summary yet.'}</Typography.Paragraph>
                                </div>
                                <Tag color={quiz.isPublished ? 'green' : 'default'}>
                                  {quiz.isPublished ? 'Published' : 'Draft'}
                                </Tag>
                              </div>
                              <div className="instructor-course-card-list__metrics">
                                <div><span>Questions</span><strong>{quiz.questions.length}</strong></div>
                                <div><span>Passing score</span><strong>{quiz.passingScore}%</strong></div>
                                <div><span>Attempts</span><strong>{quiz._count?.attempts ?? quiz.attempts?.length ?? 0}</strong></div>
                              </div>
                            </Card>
                          )) ?? null
                        ) : (
                          <Empty description="No quizzes available for this course." />
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'students',
                    label: 'Students',
                    children: (
                      <div className="instructor-course-card-list">
                        {progressQuery.data?.students.length ? (
                          progressQuery.data.students.map((student) => (
                            <Card key={student.studentId} className="instructor-workspace-card">
                              <div className="instructor-course-card-list__header">
                                <div>
                                  <Typography.Title level={5}>{student.studentName}</Typography.Title>
                                  <Typography.Paragraph>{student.studentEmail}</Typography.Paragraph>
                                </div>
                                <Tag>{student.enrollmentStatus}</Tag>
                              </div>
                              <Progress percent={student.weightedPercentage} showInfo={false} />
                            </Card>
                          ))
                        ) : (
                          <Empty description="No student progress available yet." />
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'analytics',
                    label: 'Analytics',
                    children: (
                      <Card className="instructor-workspace-card">
                        <Typography.Title level={4}>Course analytics</Typography.Title>
                        <Typography.Paragraph>
                          Open the analytics route for deeper course performance, learner activity, and assessment mix.
                        </Typography.Paragraph>
                        <Button type="primary">
                          <Link to={`/courses/${courseId}/analytics`}>Open analytics</Link>
                        </Button>
                      </Card>
                    ),
                  },
                  {
                    key: 'announcements',
                    label: 'Announcements',
                    children: (
                      <Card className="instructor-workspace-card">
                        <Typography.Title level={4}>Announcement center</Typography.Title>
                        <Typography.Paragraph>
                          Review course updates, reminders, and published notices inside the shared course announcement route.
                        </Typography.Paragraph>
                        <Button onClick={() => navigate(`/courses/${courseId}/announcements`)}>
                          Open announcements
                        </Button>
                      </Card>
                    ),
                  },
                  {
                    key: 'discussions',
                    label: 'Discussions',
                    children: (
                      <Card className="instructor-workspace-card">
                        <Typography.Title level={4}>Course discussions</Typography.Title>
                        <Typography.Paragraph>
                          Open the course discussion room to respond to questions and track peer collaboration.
                        </Typography.Paragraph>
                        <Button onClick={() => navigate(`/courses/${courseId}/discussion`)}>
                          Open discussions
                        </Button>
                      </Card>
                    ),
                  },
                ]}
              />

              <Collapse
                items={[
                  {
                    key: 'advanced-management',
                    label: 'Advanced course management',
                    children: (
                      <div className="instructor-workspace__embedded">
                        <CourseManagementDetail courseId={id} basePath="/instructor/courses" />
                      </div>
                    ),
                  },
                ]}
              />
            </>
          ) : (
            <Empty description="Course workspace is not available." />
          )}
        </section>
      </ClientPageContainer>
    </ClientLayout>
  );
}

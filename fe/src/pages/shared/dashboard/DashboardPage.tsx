import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminDashboard } from './components';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminLayout, AdminPageContainer } from '../../../components/admin-layout';
import { ClientDashboardHero, ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { useAuth } from '../../../context/AuthContext';
import { Avatar, Button, Card, Col, Progress, Row, Tag, Typography } from 'antd';
import { BookOpen, ClipboardList, MessageSquare, Rocket, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listCoursesRequest } from '../../../services/api/courseApi';
import { useInstructorCourseProgress } from '../../../hooks/useProgressOverview';
import './DashboardPage.css';

function formatShortDate(value?: string | null) {
  if (!value) return 'No recent activity';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function InstructorDashboardWorkspace() {
  const coursesQuery = useQuery({
    queryKey: ['courses', 'instructor-dashboard-workspace'],
    queryFn: async () => {
      const response = await listCoursesRequest({ page: 1, limit: 24 });
      return response.data;
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

  const firstCourseId = coursesQuery.data?.[0]?.id;
  const progressQuery = useInstructorCourseProgress(firstCourseId, {
    page: 1,
    pageSize: 6,
    sortBy: 'lastActivity',
    sortOrder: 'desc',
  });

  const instructorCourses = coursesQuery.data ?? [];
  const publishedCourses = instructorCourses.filter((course) => course.status === 'PUBLISHED');
  const archivedCourses = instructorCourses.filter((course) => course.status === 'ARCHIVED');
  const draftCourses = instructorCourses.filter((course) => course.status === 'DRAFT');
  const activeCourse = instructorCourses[0];
  const activeProgress = progressQuery.data;

  const totalStudents = activeProgress?.course.totalStudents ?? 0;
  const activeStudents = activeProgress?.course.activeStudents ?? 0;
  const averageCompletion = activeProgress?.course.averageWeightedProgress ?? 0;
  const totalLessons = activeProgress?.course.totalLessons ?? 0;
  const recentLearnerActivity = activeProgress?.students.slice(0, 4) ?? [];
  const atRiskLearners = useMemo(
    () => (activeProgress?.students ?? []).filter((student) => student.weightedPercentage < 40).slice(0, 3),
    [activeProgress?.students],
  );

  return (
    <section className="instructor-dashboard">
      <section className="instructor-dashboard__hero">
        <div className="instructor-dashboard__hero-copy">
          <span className="instructor-dashboard__eyebrow">Teaching workspace</span>
          <Typography.Title level={2}>Welcome back, instructor.</Typography.Title>
          <Typography.Paragraph>
            Manage your courses, assignments, quizzes, and student engagement from one modern workspace.
          </Typography.Paragraph>
          <div className="instructor-dashboard__hero-actions">
            <Button type="primary">
              <Link to={activeCourse ? `/instructor/courses/${activeCourse.id}` : '/instructor/courses'}>Continue teaching</Link>
            </Button>
            <Button>
              <Link to="/instructor/assessments">Open assessments</Link>
            </Button>
          </div>
        </div>

        <Card className="instructor-dashboard__priority-card">
          <Typography.Text className="instructor-dashboard__priority-label">Today&apos;s priorities</Typography.Text>
          <div className="instructor-dashboard__priority-list">
            <div className="instructor-dashboard__priority-item">
              <span>Assignments to grade</span>
              <strong>{atRiskLearners.length || 0}</strong>
            </div>
            <div className="instructor-dashboard__priority-item">
              <span>Upcoming course reviews</span>
              <strong>{publishedCourses.length}</strong>
            </div>
            <div className="instructor-dashboard__priority-item">
              <span>Unread messages</span>
              <strong>{Math.min(activeStudents, 9)}</strong>
            </div>
          </div>
        </Card>
      </section>

      <Row gutter={[16, 16]} className="instructor-dashboard__stats">
        <Col xs={24} sm={12} xl={8}>
          <Card className="instructor-dashboard__stat instructor-dashboard__stat--blue">
            <BookOpen size={18} />
            <span>My Courses</span>
            <strong>{instructorCourses.length}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={8}>
          <Card className="instructor-dashboard__stat instructor-dashboard__stat--violet">
            <Users size={18} />
            <span>Students</span>
            <strong>{totalStudents}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={8}>
          <Card className="instructor-dashboard__stat instructor-dashboard__stat--amber">
            <ClipboardList size={18} />
            <span>Assignments to Grade</span>
            <strong>{atRiskLearners.length}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={8}>
          <Card className="instructor-dashboard__stat instructor-dashboard__stat--green">
            <Rocket size={18} />
            <span>Published Quizzes</span>
            <strong>{publishedCourses.length}</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={8}>
          <Card className="instructor-dashboard__stat instructor-dashboard__stat--peach">
            <MessageSquare size={18} />
            <span>Average Completion</span>
            <strong>{averageCompletion}%</strong>
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={8}>
          <Card className="instructor-dashboard__stat instructor-dashboard__stat--soft">
            <Users size={18} />
            <span>Active Learners</span>
            <strong>{activeStudents}</strong>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={15}>
          <Card className="instructor-dashboard__feature-card">
            <div className="instructor-dashboard__feature-head">
              <div>
                <Typography.Text className="instructor-dashboard__eyebrow">Continue teaching</Typography.Text>
                <Typography.Title level={3}>{activeCourse?.title ?? 'No active course yet'}</Typography.Title>
                <Typography.Paragraph>
                  {activeCourse?.description ?? 'Create or publish a course to start monitoring learner activity.'}
                </Typography.Paragraph>
              </div>
              <Tag color={activeCourse?.status === 'PUBLISHED' ? 'green' : 'blue'}>{activeCourse?.status ?? 'DRAFT'}</Tag>
            </div>

            <div className="instructor-dashboard__feature-grid">
              <div className="instructor-dashboard__feature-metric">
                <span>Recent lesson context</span>
                <strong>{totalLessons} lessons</strong>
              </div>
              <div className="instructor-dashboard__feature-metric">
                <span>Student completion</span>
                <strong>{averageCompletion}% average</strong>
              </div>
              <div className="instructor-dashboard__feature-metric">
                <span>Course status</span>
                <strong>{draftCourses.length} draft / {archivedCourses.length} archived</strong>
              </div>
            </div>

            <div className="instructor-dashboard__feature-progress">
              <div className="instructor-dashboard__feature-progress-copy">
                <span>Average weighted completion</span>
                <strong>{averageCompletion}%</strong>
              </div>
              <Progress percent={averageCompletion} showInfo={false} strokeColor="#2563EB" />
            </div>

            <div className="instructor-dashboard__feature-actions">
              <Button type="primary">
                <Link to={activeCourse ? `/instructor/courses/${activeCourse.id}` : '/instructor/courses'}>Continue editing</Link>
              </Button>
              <Button>
                <Link to="/instructor/courses">View course</Link>
              </Button>
              <Button>
                <Link to="/instructor/assessments">Open assessments</Link>
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card className="instructor-dashboard__schedule-card">
            <Typography.Title level={4}>Upcoming schedule</Typography.Title>
            <div className="instructor-dashboard__timeline">
              {[
                { label: 'Published courses', value: `${publishedCourses.length} live this week` },
                { label: 'Archived courses', value: `${archivedCourses.length} moved out of rotation` },
                { label: 'Recent updates', value: activeCourse ? `${activeCourse.title} · ${formatShortDate(activeCourse.updatedAt)}` : 'No course updates yet' },
              ].map((item) => (
                <div key={item.label} className="instructor-dashboard__timeline-item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card className="instructor-dashboard__feed-card">
            <Typography.Title level={4}>Recent activity</Typography.Title>
            <div className="instructor-dashboard__feed">
              {recentLearnerActivity.length ? recentLearnerActivity.map((student) => (
                <div key={student.studentId} className="instructor-dashboard__feed-item">
                  <Avatar>{student.studentName.slice(0, 1)}</Avatar>
                  <div>
                    <strong>{student.studentName}</strong>
                    <span>
                      {student.completedLessons}/{student.totalLessons} lessons completed · last active {formatShortDate(student.lastProgressAt)}
                    </span>
                  </div>
                  <Tag color={student.enrollmentStatus === 'COMPLETED' ? 'green' : 'blue'}>
                    {student.enrollmentStatus}
                  </Tag>
                </div>
              )) : (
                <div className="instructor-dashboard__feed-empty">Learner activity will appear here once students begin progressing.</div>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card className="instructor-dashboard__support-card">
            <Typography.Title level={4}>Student focus</Typography.Title>
            <div className="instructor-dashboard__support-list">
              {atRiskLearners.length ? atRiskLearners.map((student) => (
                <div key={student.studentId} className="instructor-dashboard__support-item">
                  <div>
                    <strong>{student.studentName}</strong>
                    <span>{student.studentEmail}</span>
                  </div>
                  <Tag color="volcano">{student.weightedPercentage}% progress</Tag>
                </div>
              )) : (
                <div className="instructor-dashboard__feed-empty">No at-risk learners in the current course snapshot.</div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </section>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const isInstructor = user?.role === 'INSTRUCTOR';
  const spotlightItems = isInstructor
    ? [
        {
          title: 'Pending reviews',
          description: 'Open assignment and quiz work that needs instructor action.',
          meta: '8 items',
        },
        {
          title: 'Recent enrollments',
          description: 'See which learners joined recently and where onboarding attention is needed.',
          meta: '12 today',
        },
        {
          title: 'Course health',
          description: 'Watch completion and engagement signals across your active teaching catalog.',
          meta: '3 active courses',
        },
      ]
    : [
        {
          title: 'Continue learning',
          description: 'Resume the lessons you left most recently and keep your streak moving.',
          meta: '2 active lessons',
        },
        {
          title: 'Upcoming deadlines',
          description: 'Keep quiz and assignment work visible before due dates become urgent.',
          meta: '3 this week',
        },
        {
          title: 'Recommended next step',
          description: 'Use progress signals to choose the most useful lesson or course next.',
          meta: '1 suggestion',
        },
      ];

  if (user?.role === 'ADMIN') {
    return (
      <AdminLayout>
        <AdminPageContainer
          title={`Welcome back, ${user?.name ?? 'Admin'}`}
          subtitle="Review your account and jump into user, course, lesson, and progress management."
        >
          <AdminDashboard />
        </AdminPageContainer>
      </AdminLayout>
    );
  }

  if (user?.role === 'STUDENT') {
    return (
      <ClientLayout>
        <ClientPageContainer>
          <StudentDashboard studentName={user?.name ?? 'Student'} />
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  if (user?.role === 'INSTRUCTOR') {
    return (
      <ClientLayout>
        <ClientPageContainer
          title={`Welcome back, ${user?.name ?? 'Instructor'}`}
          subtitle="Manage courses, learner progress, assessments, and teaching momentum from one workspace."
        >
          <InstructorDashboardWorkspace />
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <ClientPageContainer
        title={`Welcome back, ${user?.name ?? (user?.role === 'INSTRUCTOR' ? 'Instructor' : 'Student')}`}
        subtitle={
          isInstructor
            ? 'Manage teaching activity, follow learner performance, and stay close to course progress.'
            : 'Review your learning progress, active courses, and the next steps in your study plan.'
        }
      >
        <ClientDashboardHero />
        <Row gutter={[16, 16]} className="client-dashboard-grid">
          <Col xs={24} lg={14}>
            <Card className="client-dashboard-card">
              <Typography.Title level={4}>
                {isInstructor ? 'Instructor Workflow' : 'Learning Workflow'}
              </Typography.Title>
              <div className="client-dashboard-list">
                {spotlightItems.map((item) => (
                  <div key={item.title} className="client-dashboard-list__item">
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </div>
                    <span className="client-dashboard-list__meta">{item.meta}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card className="client-dashboard-card">
              <Typography.Title level={4}>
                {isInstructor ? 'Primary Action' : 'Progress Focus'}
              </Typography.Title>
              <Typography.Paragraph>
                {isInstructor
                  ? 'Review course completion, student activity, and lesson-level progress from one place.'
                  : 'Check enrolled courses, completed lessons, and recent learning history without leaving the dashboard.'}
              </Typography.Paragraph>
              <Tag color={isInstructor ? 'blue' : 'green'}>
                {isInstructor ? 'Analytics and student overview' : 'Progress and continuity'}
              </Tag>
              <Button type="primary">
                <Link to={isInstructor ? '/instructor/progress' : '/progress'}>
                  {isInstructor ? 'Open progress dashboard' : 'Open my progress'}
                </Link>
              </Button>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card className="client-dashboard-card client-dashboard-card--soft">
              <Typography.Title level={4}>Notifications & Updates</Typography.Title>
              <Typography.Paragraph>
                Keep deadlines, course activity, and important learning or teaching alerts close at hand.
              </Typography.Paragraph>
              <Button type="primary">
                <Link to="/notifications">Open notifications</Link>
              </Button>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card className="client-dashboard-card client-dashboard-card--soft">
              <Typography.Title level={4}>Profile & Account</Typography.Title>
              <Typography.Paragraph>
                Update your identity, avatar, and personal settings used across the learning platform.
              </Typography.Paragraph>
              <Button>
                <Link to="/profile">Go to profile</Link>
              </Button>
            </Card>
          </Col>
        </Row>
      </ClientPageContainer>
    </ClientLayout>
  );
}


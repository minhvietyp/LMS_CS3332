import { AdminDashboard } from './components';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminLayout, AdminPageContainer } from '../../../components/admin-layout';
import { ClientDashboardHero, ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { useAuth } from '../../../context/AuthContext';
import { Button, Card, Col, Row, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import './DashboardPage.css';

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


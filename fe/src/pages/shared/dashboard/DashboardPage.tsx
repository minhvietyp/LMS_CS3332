import { AdminDashboard } from './components';
import { InstructorDashboard } from './components/InstructorDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { AdminLayout, AdminPageContainer } from '../../../components/admin-layout';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { useAuth } from '../../../context/useAuth';
import './DashboardPage.css';

export function DashboardPage() {
  const { user } = useAuth();

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
        <ClientPageContainer>
          <InstructorDashboard instructorId={user.id} instructorName={user.name} />
        </ClientPageContainer>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <ClientPageContainer>
        <StudentDashboard studentName={user?.name ?? 'Student'} />
      </ClientPageContainer>
    </ClientLayout>
  );
}


import { Navigate } from 'react-router-dom';
import { AdminLayout, AdminPageContainer } from '../components/admin/layout';
import { ProfileDetailsView } from '../components/account';
import { ClientLayout, ClientPageContainer } from '../components/client/layout';
import { useAuth } from '../components/context/AuthContext';

export function ProfilePage() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/settings" replace />;
  }

  return (
    <ClientLayout>
      <ClientPageContainer title="My profile" subtitle="Review the information that appears across your learning workspace.">
        <ProfileDetailsView />
      </ClientPageContainer>
    </ClientLayout>
  );
}

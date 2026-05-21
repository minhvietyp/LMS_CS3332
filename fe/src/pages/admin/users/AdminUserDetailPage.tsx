import { Navigate, useParams } from 'react-router-dom';
import { AdminPageContainer } from '../../../components/admin/layout';
import { UserManagementDetail } from '../../../components/admin/users';

export function AdminUserDetailPage() {
  const { id } = useParams();

  if (!id) {
    return <Navigate to="/admin/users" replace />;
  }

  return (
    <AdminPageContainer
      title="User Profile"
      subtitle="Review profile information, account status, and lifecycle metadata for this user."
    >
      <UserManagementDetail userId={id} />
    </AdminPageContainer>
  );
}

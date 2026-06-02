import { Navigate, useParams } from 'react-router-dom';
import { AdminPageContainer } from '../../../components/admin-layout';
import { UserManagementForm } from './components';

export function AdminUserEditPage() {
  const { id } = useParams();

  if (!id) {
    return <Navigate to="/admin/users" replace />;
  }

  return (
    <AdminPageContainer
      title="Edit User"
      subtitle="Update profile details, role assignment, avatar URL, and account status."
    >
      <UserManagementForm mode="edit" userId={id} />
    </AdminPageContainer>
  );
}


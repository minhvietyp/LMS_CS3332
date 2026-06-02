import { AdminPageContainer } from '../../../components/admin-layout';
import { UserManagementForm } from './components';

export function AdminUserCreatePage() {
  return (
    <AdminPageContainer
      title="Add User"
      subtitle="Create a new admin, instructor, or student account using the existing LMS user fields."
    >
      <UserManagementForm mode="create" />
    </AdminPageContainer>
  );
}


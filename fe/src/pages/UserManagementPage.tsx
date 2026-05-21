import { AdminPageContainer } from '../components/admin/layout';
import { UserManagement } from '../components/admin/users';

export function UserManagementPage() {
  return (
    <AdminPageContainer
      title="Soft delete and restore users"
      subtitle="Manage account visibility, role assignment, and reactivate deleted users."
    >
      <UserManagement />
    </AdminPageContainer>
  );
}

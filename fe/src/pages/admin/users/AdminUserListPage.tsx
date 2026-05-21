import { AdminPageContainer } from '../../../components/admin/layout';
import { UserManagement } from '../../../components/admin/users';

export function AdminUserListPage() {
  return (
    <AdminPageContainer
      title="Users"
      subtitle="Manage team members, roles, and account access across the LMS."
    >
      <UserManagement />
    </AdminPageContainer>
  );
}

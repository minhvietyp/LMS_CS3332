import { AdminPageContainer } from '../components/admin/layout';
import { AccessControl } from '../components/admin/access-control';

export function AccessControlPage() {
  return (
    <AdminPageContainer
      title="Roles and permissions"
      subtitle="Inspect what each role can do across users and courses."
    >
      <AccessControl />
    </AdminPageContainer>
  );
}

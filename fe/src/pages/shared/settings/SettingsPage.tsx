import { AdminLayout, AdminPageContainer } from '../../../components/admin-layout';
import { SettingsTabs } from '../account/components';
import { ClientLayout, ClientPageContainer } from '../../../components/client-layout';
import { useAuth } from '../../../context/useAuth';

export function SettingsPage() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return (
      <AdminLayout>
        <AdminPageContainer title="Settings" subtitle="Update profile details, password, and contact information for your account.">
          <SettingsTabs />
        </AdminPageContainer>
      </AdminLayout>
    );
  }

  return (
    <ClientLayout>
      <ClientPageContainer title="Settings" subtitle="Manage your profile, password, and contact details in one place.">
        <SettingsTabs />
      </ClientPageContainer>
    </ClientLayout>
  );
}


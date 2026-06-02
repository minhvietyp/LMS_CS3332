import { PasswordResetForm } from '../../../components/common/auth';

export function AdminResetPasswordPage() {
  return (
    <PasswordResetForm
      title="Reset admin password"
      subtitle="Set a new password for your administrator account"
      loginPath="/admin/login"
      heroEyebrow="LMS Admin Access"
      heroTitle="Set a new administrator password"
      heroSubtitle="Use the reset link from your email to restore access to the LMS administration workspace."
    />
  );
}


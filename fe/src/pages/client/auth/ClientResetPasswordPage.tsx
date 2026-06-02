import { PasswordResetForm } from '../../../components/common/auth';

export function ClientResetPasswordPage() {
  return (
    <PasswordResetForm
      title="Reset password"
      subtitle="Create a new password for your LMS account"
      loginPath="/login"
      heroEyebrow="Password recovery"
      heroTitle="Choose a new password"
      heroSubtitle="Use the reset link from your email to restore access to your student or instructor account."
    />
  );
}


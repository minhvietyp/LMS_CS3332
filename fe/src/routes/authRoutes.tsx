import { Route } from 'react-router-dom';
import { AdminForgotPasswordPage } from '../pages/admin/auth/AdminForgotPasswordPage';
import { AdminLoginPage } from '../pages/admin/auth/AdminLoginPage';
import { AdminResetPasswordPage } from '../pages/admin/auth/AdminResetPasswordPage';
import { ClientForgotPasswordPage } from '../pages/client/auth/ClientForgotPasswordPage';
import { ClientLoginPage } from '../pages/client/auth/ClientLoginPage';
import { ClientRegisterPage } from '../pages/client/auth/ClientRegisterPage';
import { ClientResetPasswordPage } from '../pages/client/auth/ClientResetPasswordPage';

export function AuthRoutes() {
  return (
    <>
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/forgot-password" element={<AdminForgotPasswordPage />} />
      <Route path="/admin/reset-password" element={<AdminResetPasswordPage />} />
      <Route path="/login" element={<ClientLoginPage />} />
      <Route path="/forgot-password" element={<ClientForgotPasswordPage />} />
      <Route path="/register" element={<ClientRegisterPage />} />
      <Route path="/reset-password" element={<ClientResetPasswordPage />} />
    </>
  );
}

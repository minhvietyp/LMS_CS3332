import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { loginRequest } from '../../../../../services/api/authApi';
import { useAuth } from '../../../../../context/AuthContext';
import { getDefaultRouteForRole, isAdminRole } from '../../../../../utils/authRedirect';
import './AdminLoginForm.css';

interface AdminLoginFormValues {
  email: string;
  password: string;
}

export function AdminLoginForm() {
  const [form] = Form.useForm<AdminLoginFormValues>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, user, login, logout } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  const handleFinish = async (values: AdminLoginFormValues) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await loginRequest(values);

      if (!isAdminRole(result.user.role)) {
        logout();
        setErrorMessage('This login is for administrators only.');
        return;
      }

      login({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      navigate('/admin/dashboard', { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-page__shell">
        <div className="admin-auth-page__brand">
          <p className="admin-auth-page__eyebrow">LMS Admin Access</p>
          <Typography.Title level={1} className="admin-auth-page__title">
            Administrator sign in
          </Typography.Title>
          <Typography.Paragraph className="admin-auth-page__subtitle">
            Access user management, courses, lessons, and platform progress monitoring.
          </Typography.Paragraph>
        </div>

        <Card className="admin-auth-page__card" bordered={false}>
          <Form<AdminLoginFormValues> form={form} layout="vertical" requiredMark={false} onFinish={handleFinish}>
            {errorMessage ? <Alert className="admin-auth-form__alert" type="error" showIcon message={errorMessage} /> : null}

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email address' },
              ]}
            >
              <Input autoComplete="email" placeholder="Username or email" size="large" />
            </Form.Item>

            <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Password is required' }]}>
              <Input.Password autoComplete="current-password" placeholder="Password" size="large" />
            </Form.Item>

            <div className="admin-auth-form__actions">
              <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>
                Log In
              </Button>
              <div className="admin-auth-form__switch">
                <Link to="/admin/forgot-password">Forgot password?</Link>
              </div>
            </div>
          </Form>
        </Card>
      </section>
    </main>
  );
}


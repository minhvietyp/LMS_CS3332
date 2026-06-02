import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Link, Navigate } from 'react-router-dom';
import { forgotPasswordRequest } from '../../../../../services/api/authApi';
import { useAuth } from '../../../../../context/AuthContext';
import { getDefaultRouteForRole } from '../../../../../utils/authRedirect';
import '../login/AdminLoginForm.css';
import './AdminForgotPasswordForm.css';

interface ForgotPasswordValues {
  email: string;
}

export function AdminForgotPasswordForm() {
  const [form] = Form.useForm<ForgotPasswordValues>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  const handleFinish = async (values: ForgotPasswordValues) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await forgotPasswordRequest(values);
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to send reset email.');
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
            Recover administrator access
          </Typography.Title>
          <Typography.Paragraph className="admin-auth-page__subtitle">
            Enter your administrator email and we will send a secure password reset link.
          </Typography.Paragraph>
        </div>

        <Card className="admin-auth-page__card" bordered={false}>
          <Form<ForgotPasswordValues> form={form} layout="vertical" requiredMark={false} onFinish={handleFinish}>
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

            <div className="admin-auth-form__actions">
              <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>
                Send reset link
              </Button>
              <div className="admin-auth-form__switch">
                <Link to="/admin/login">Back to admin login</Link>
              </div>
            </div>

            {isSuccess ? (
              <div className="admin-forgot-password__success">
                If the account exists, a password reset email has been sent.
              </div>
            ) : null}
          </Form>
        </Card>
      </section>
    </main>
  );
}


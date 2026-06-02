import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Link, Navigate } from 'react-router-dom';
import { forgotPasswordRequest } from '../../../../../services/api/authApi';
import { useAuth } from '../../../../../context/AuthContext';
import { getDefaultRouteForRole } from '../../../../../utils/authRedirect';
import '../login/ClientLoginForm.css';
import './ClientForgotPasswordForm.css';

interface ForgotPasswordValues {
  email: string;
}

export function ClientForgotPasswordForm() {
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
    <main className="client-auth-page">
      <section className="client-auth-page__shell">
        <div className="client-auth-page__hero">
          <p className="client-auth-page__eyebrow">Password recovery</p>
          <Typography.Title level={1} className="client-auth-page__title">
            Reset your LMS password
          </Typography.Title>
          <Typography.Paragraph className="client-auth-page__subtitle">
            Enter your account email and we will send a reset link so you can get back to learning.
          </Typography.Paragraph>
          <div className="client-auth-page__highlights">
            <div className="client-auth-page__highlight">
              <strong>Secure reset</strong>
              Password reset links are single-use and expire automatically for security.
            </div>
            <div className="client-auth-page__highlight">
              <strong>Shared access flow</strong>
              Students and instructors can recover access without contacting support first.
            </div>
          </div>
        </div>

        <Card className="client-auth-page__card" bordered={false}>
          <Typography.Title level={3} className="client-auth-page__card-title">
            Forgot password
          </Typography.Title>
          <Typography.Text className="client-auth-page__card-subtitle">
            Student and instructor account recovery
          </Typography.Text>

          <Form<ForgotPasswordValues> form={form} layout="vertical" requiredMark={false} onFinish={handleFinish}>
            {errorMessage ? <Alert className="client-auth-form__alert" type="error" showIcon message={errorMessage} /> : null}

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email address' },
              ]}
            >
              <Input autoComplete="email" placeholder="Email address" size="large" />
            </Form.Item>

            <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>
              Send reset link
            </Button>

            <div className="client-auth-form__footer">
              <Link to="/login">Back to login</Link>
            </div>

            {isSuccess ? (
              <div className="client-forgot-password__success">
                If the account exists, a password reset email has been sent.
              </div>
            ) : null}
          </Form>
        </Card>
      </section>
    </main>
  );
}


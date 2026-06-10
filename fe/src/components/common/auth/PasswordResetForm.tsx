import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordRequest } from '../../../services/api/authApi';
import { useAuth } from '../../../context/useAuth';
import { getDefaultRouteForRole } from '../../../utils/authRedirect';
import '../../../pages/client/auth/components/login/ClientLoginForm.css';
import './PasswordResetForm.css';

interface ResetPasswordValues {
  password: string;
  confirmPassword: string;
}

type PasswordResetFormProps = {
  title: string;
  subtitle: string;
  loginPath: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
};

export function PasswordResetForm({
  title,
  subtitle,
  loginPath,
  heroEyebrow,
  heroTitle,
  heroSubtitle,
}: PasswordResetFormProps) {
  const [form] = Form.useForm<ResetPasswordValues>();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  const handleFinish = async (values: ResetPasswordValues) => {
    if (!token) {
      setErrorMessage('Reset token is missing or invalid.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await resetPasswordRequest({
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      setIsSuccess(true);
      setTimeout(() => navigate(loginPath, { replace: true }), 1200);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="client-auth-page">
      <section className="client-auth-page__shell">
        <div className="client-auth-page__hero">
          <p className="client-auth-page__eyebrow">{heroEyebrow}</p>
          <Typography.Title level={1} className="client-auth-page__title">
            {heroTitle}
          </Typography.Title>
          <Typography.Paragraph className="client-auth-page__subtitle">
            {heroSubtitle}
          </Typography.Paragraph>
          <div className="client-auth-page__highlights">
            <div className="client-auth-page__highlight">
              <strong>Single-use token</strong>
              Reset links are valid for a limited time and are revoked after successful use.
            </div>
            <div className="client-auth-page__highlight">
              <strong>Fresh session required</strong>
              Existing sessions are revoked after a password reset for account security.
            </div>
          </div>
        </div>

        <Card className="client-auth-page__card" bordered={false}>
          <Typography.Title level={3} className="client-auth-page__card-title">
            {title}
          </Typography.Title>
          <Typography.Text className="client-auth-page__card-subtitle">
            {subtitle}
          </Typography.Text>

          {!token ? <Alert className="client-auth-form__alert" type="error" showIcon message="Reset token is missing or invalid." /> : null}
          {errorMessage ? <Alert className="client-auth-form__alert" type="error" showIcon message={errorMessage} /> : null}

          <Form<ResetPasswordValues> form={form} layout="vertical" requiredMark={false} onFinish={handleFinish}>
            <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Password is required' }]}>
              <Input.Password autoComplete="new-password" placeholder="Password" size="large" />
            </Form.Item>

            <Form.Item
              label="Confirm password"
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }

                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="new-password" placeholder="Confirm Password" size="large" />
            </Form.Item>

            <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting} disabled={!token || isSuccess}>
              Reset password
            </Button>

            <div className="client-auth-form__footer">
              <Link to={loginPath}>Back to login</Link>
            </div>

            {isSuccess ? (
              <div className="password-reset-form__success">
                Password updated successfully. Redirecting to <Link to={loginPath}>login</Link>.
              </div>
            ) : null}
          </Form>
        </Card>
      </section>
    </main>
  );
}


import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginRequest } from '../../../services/authApi';
import { useAuth } from '../../context/AuthContext';
import './index.css';

interface LocationState {
  from?: {
    pathname?: string;
  };
}

interface LoginFormValues {
  email: string;
  password: string;
}

export function Login() {
  const [form] = Form.useForm<LoginFormValues>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const redirectPath = state?.from?.pathname ?? '/dashboard';

  if (isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  const handleFinish = async (values: LoginFormValues) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await loginRequest(values);
      login({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      navigate(redirectPath, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-page__panel">
        <div className="auth-page__hero">
          <p className="auth-page__eyebrow">Online Learning Management System</p>
          <Typography.Title level={1} className="auth-page__title">
            Sign in to continue
          </Typography.Title>
          <Typography.Paragraph className="auth-page__subtitle">
            Access courses, progress tracking, quizzes, assignments, and realtime learning tools.
          </Typography.Paragraph>
        </div>

        <Card className="auth-page__card" bordered={false}>
          <Form<LoginFormValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={handleFinish}
            className="auth-form"
          >
            {errorMessage ? <Alert className="auth-form__alert" type="error" showIcon message={errorMessage} /> : null}

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email address' },
              ]}
            >
              <Input autoComplete="email" placeholder="you@example.com" size="large" />
            </Form.Item>

            <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Password is required' }]}>
              <Input.Password autoComplete="current-password" placeholder="Your password" size="large" />
            </Form.Item>

            <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting} className="auth-form__submit">
              Sign in
            </Button>
          </Form>
        </Card>
      </section>
    </main>
  );
}

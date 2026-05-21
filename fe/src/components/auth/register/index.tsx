import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { registerRequest } from '../../../services/authApi';
import { useAuth } from '../../context/AuthContext';
import '../login/index.css';
import './index.css';

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
}

export function Register() {
  const [form] = Form.useForm<RegisterFormValues>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleFinish = async (values: RegisterFormValues) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await registerRequest(values);

      login({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-page__panel">
        <div className="auth-page__hero">
          <p className="auth-page__eyebrow">Create your account</p>
          <Typography.Title level={1} className="auth-page__title">
            Register
          </Typography.Title>
          <Typography.Paragraph className="auth-page__subtitle">
            Join the LMS to access courses, quizzes, and collaborative learning.
          </Typography.Paragraph>
        </div>

        <Card className="auth-page__card" bordered={false}>
          <Form<RegisterFormValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={handleFinish}
            className="auth-form"
          >
            {errorMessage ? <Alert className="auth-form__alert" type="error" showIcon message={errorMessage} /> : null}

            <Form.Item label="Full name" name="name" rules={[{ required: true, message: 'Name is required' }]}>
              <Input autoComplete="name" placeholder="Your full name" size="large" />
            </Form.Item>

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
              <Input.Password autoComplete="new-password" placeholder="Choose a password" size="large" />
            </Form.Item>

            <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting} className="auth-form__submit">
              Create account
            </Button>

            <div className="register-form__login-link">
              <Link to="/login">Already have an account? Sign in</Link>
            </div>
          </Form>
        </Card>
      </section>
    </main>
  );
}

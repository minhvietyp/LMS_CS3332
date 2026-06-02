import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { registerRequest } from '../../../../../services/api/authApi';
import { useAuth } from '../../../../../context/AuthContext';
import { getDefaultRouteForRole, isClientRole } from '../../../../../utils/authRedirect';
import '../login/ClientLoginForm.css';
import './ClientRegisterForm.css';

interface ClientRegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function ClientRegisterForm() {
  const [form] = Form.useForm<ClientRegisterFormValues>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, user, login, logout } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  const handleFinish = async (values: ClientRegisterFormValues) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await registerRequest({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (!isClientRole(result.user.role) || result.user.role !== 'STUDENT') {
        logout();
        setErrorMessage('Public registration is available for student accounts only.');
        return;
      }

      login({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      navigate(getDefaultRouteForRole(result.user.role), { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="client-auth-page">
      <section className="client-auth-page__shell">
        <div className="client-auth-page__hero">
          <p className="client-auth-page__eyebrow">Join the LMS</p>
          <Typography.Title level={1} className="client-auth-page__title">
            Create your student account
          </Typography.Title>
          <Typography.Paragraph className="client-auth-page__subtitle">
            Register to start learning, track lesson completion, and follow your progress across enrolled courses.
          </Typography.Paragraph>
          <div className="client-auth-page__highlights">
            <div className="client-auth-page__highlight">
              <strong>One place for learning</strong>
              Access lessons, quizzes, assignments, and progress history from one dashboard.
            </div>
            <div className="client-auth-page__highlight">
              <strong>Instructor-managed access</strong>
              Instructor accounts stay protected and are created by administrators only.
            </div>
          </div>
        </div>

        <Card className="client-auth-page__card" bordered={false}>
          <Typography.Title level={3} className="client-auth-page__card-title">
            Register
          </Typography.Title>
          <Typography.Text className="client-auth-page__card-subtitle">
            Public registration creates student access only
          </Typography.Text>

          <Form<ClientRegisterFormValues> form={form} layout="vertical" requiredMark={false} onFinish={handleFinish}>
            {errorMessage ? <Alert className="client-auth-form__alert" type="error" showIcon message={errorMessage} /> : null}

            <Form.Item label="Full name" name="name" rules={[{ required: true, message: 'Full name is required' }]}>
              <Input autoComplete="name" placeholder="Username" size="large" />
            </Form.Item>

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

            <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>
              Register
            </Button>

            <div className="client-register-form__footer">
              <Link to="/login">Already have an account? Sign in</Link>
            </div>
          </Form>
        </Card>
      </section>
    </main>
  );
}


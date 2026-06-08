import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { ClipboardCheck, GraduationCap, TrendingUp } from 'lucide-react';
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
          <Link to="/" className="client-auth-page__brand">
            <span>E</span>
            <strong>EduFlow LMS</strong>
            <small>Academic Portal</small>
          </Link>
          <p className="client-auth-page__eyebrow">Student registration</p>
          <Typography.Title level={1} className="client-auth-page__title">
            Build your student workspace.
          </Typography.Title>
          <Typography.Paragraph className="client-auth-page__subtitle">
            Register to start learning, track lesson completion, and follow your progress across enrolled courses.
          </Typography.Paragraph>
          <div className="client-auth-page__highlights">
            <div className="client-auth-page__highlight">
              <TrendingUp size={18} />
              <strong>Track progress</strong>
              Follow lessons, completion status, calendar deadlines, and course movement.
            </div>
            <div className="client-auth-page__highlight">
              <ClipboardCheck size={18} />
              <strong>Manage assignments</strong>
              Access quizzes, submissions, and feedback after your course access is available.
            </div>
            <div className="client-auth-page__highlight client-auth-page__highlight--wide">
              <GraduationCap size={18} />
              <strong>Review grades</strong>
              Public registration creates student access only; instructor accounts remain administrator-managed.
            </div>
          </div>
        </div>

        <Card className="client-auth-page__card" bordered={false}>
          <Typography.Title level={3} className="client-auth-page__card-title">
            Create your account
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
              <span>Already have an account?</span> <Link to="/login">Sign in</Link>
            </div>
          </Form>
        </Card>
      </section>
    </main>
  );
}


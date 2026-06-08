import { useState } from 'react';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Form, Input, Typography } from 'antd';
import { ClipboardCheck, GraduationCap, TrendingUp } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { loginRequest } from '../../../../../services/api/authApi';
import { useAuth } from '../../../../../context/AuthContext';
import { getDefaultRouteForRole, isClientRole } from '../../../../../utils/authRedirect';
import './ClientLoginForm.css';

interface ClientLoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

export function ClientLoginForm() {
  const [form] = Form.useForm<ClientLoginFormValues>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAuthenticated, user, login, logout } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  const handleFinish = async (values: ClientLoginFormValues) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await loginRequest(values);

      if (!isClientRole(result.user.role)) {
        logout();
        setErrorMessage('Please use the admin login page for administrator accounts.');
        return;
      }

      login({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      navigate(getDefaultRouteForRole(result.user.role), { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed.');
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
          <p className="client-auth-page__eyebrow">Academic Portal</p>
          <Typography.Title level={1} className="client-auth-page__title">
            Return to a calmer academic workspace.
          </Typography.Title>
          <Typography.Paragraph className="client-auth-page__subtitle">
            Continue courses, review progress, submit assignments, and stay connected with your instructors.
          </Typography.Paragraph>
          <div className="client-auth-page__highlights">
            <div className="client-auth-page__highlight">
              <TrendingUp size={18} />
              <strong>Track progress</strong>
              Review completion, deadlines, and learning movement across enrolled courses.
            </div>
            <div className="client-auth-page__highlight">
              <ClipboardCheck size={18} />
              <strong>Manage assignments</strong>
              Resume submissions, quizzes, and instructor feedback from the course context.
            </div>
            <div className="client-auth-page__highlight client-auth-page__highlight--wide">
              <GraduationCap size={18} />
              <strong>Review grades</strong>
              Keep grades, unread notifications, and academic updates visible after sign-in.
            </div>
          </div>
        </div>

        <Card className="client-auth-page__card" bordered={false}>
          <Typography.Title level={3} className="client-auth-page__card-title">
            Sign in
          </Typography.Title>
          <Typography.Text className="client-auth-page__card-subtitle">
            Use your student or instructor account to continue.
          </Typography.Text>

          <Form<ClientLoginFormValues> form={form} layout="vertical" requiredMark={false} onFinish={handleFinish}>
            {errorMessage ? <Alert className="client-auth-form__alert" type="error" showIcon message={errorMessage} /> : null}

            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email address' },
              ]}
            >
              <Input
                autoComplete="email"
                placeholder="example@mail.com"
                prefix={<MailOutlined />}
                size="large"
              />
            </Form.Item>

            <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Password is required' }]}>
              <Input.Password
                autoComplete="current-password"
                placeholder="Password"
                prefix={<LockOutlined />}
                size="large"
              />
            </Form.Item>

            <div className="client-auth-form__options">
              <Form.Item name="remember" valuePropName="checked" className="client-auth-form__remember">
                <Checkbox>Remember me</Checkbox>
              </Form.Item>
              <Link to="/forgot-password">Forgot Password</Link>
            </div>

            <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>
              Login
            </Button>

            <div className="client-auth-form__register">
              <span>New to EduFlow?</span> <Link to="/register">Create your account</Link>
            </div>
          </Form>
        </Card>
      </section>
    </main>
  );
}


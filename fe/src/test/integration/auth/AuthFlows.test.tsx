import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../context/AuthContext';
import { AdminLoginPage } from '../../../pages/admin/auth/AdminLoginPage';
import { AdminForgotPasswordPage } from '../../../pages/admin/auth/AdminForgotPasswordPage';
import { ClientLoginPage } from '../../../pages/client/auth/ClientLoginPage';
import { ClientForgotPasswordPage } from '../../../pages/client/auth/ClientForgotPasswordPage';
import { ClientRegisterPage } from '../../../pages/client/auth/ClientRegisterPage';
import { ClientResetPasswordPage } from '../../../pages/client/auth/ClientResetPasswordPage';
import { loginRequest, registerRequest, forgotPasswordRequest, resetPasswordRequest } from '../../../services/api/authApi';

vi.mock('../../../services/api/authApi', async () => {
  const actual = await vi.importActual<typeof import('../../../services/api/authApi')>('../../../services/api/authApi');

  return {
    ...actual,
    loginRequest: vi.fn(),
    registerRequest: vi.fn(),
    forgotPasswordRequest: vi.fn(),
    resetPasswordRequest: vi.fn(),
  };
});

const loginRequestMock = vi.mocked(loginRequest);
const registerRequestMock = vi.mocked(registerRequest);
const forgotPasswordRequestMock = vi.mocked(forgotPasswordRequest);
const resetPasswordRequestMock = vi.mocked(resetPasswordRequest);

function renderWithRoutes(initialEntry: string, element: React.ReactElement) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/login" element={element} />
          <Route path="/login" element={element} />
          <Route path="/register" element={element} />
          <Route path="/forgot-password" element={element} />
          <Route path="/reset-password" element={element} />
          <Route path="/admin/forgot-password" element={element} />
          <Route path="/admin/reset-password" element={element} />
          <Route path="/admin/dashboard" element={<div>Admin dashboard landing</div>} />
          <Route path="/instructor/dashboard" element={<div>Instructor dashboard landing</div>} />
          <Route path="/dashboard" element={<div>Student dashboard landing</div>} />
          <Route path="/student/dashboard" element={<div>Student dashboard landing</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Authentication flows', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    loginRequestMock.mockReset();
    registerRequestMock.mockReset();
    forgotPasswordRequestMock.mockReset();
    resetPasswordRequestMock.mockReset();
  });

  it('allows admin login through the admin page only', async () => {
    loginRequestMock.mockResolvedValue({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
      user: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN',
        avatarUrl: null,
      },
    });

    renderWithRoutes('/admin/login', <AdminLoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Admin@123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

    await waitFor(() => {
      expect(loginRequestMock).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'Admin@123456',
      });
    });
    expect(await screen.findByText('Admin dashboard landing')).toBeInTheDocument();
  }, 15000);

  it('rejects non-admin users on the admin login page', async () => {
    loginRequestMock.mockResolvedValue({
      accessToken: 'student-token',
      refreshToken: 'student-refresh',
      user: {
        id: 'student-1',
        name: 'Student User',
        email: 'student@example.com',
        role: 'STUDENT',
        avatarUrl: null,
      },
    });

    renderWithRoutes('/admin/login', <AdminLoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Student@123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

    expect(await screen.findByText('This login is for administrators only.')).toBeInTheDocument();
  });

  it('allows instructor login through the client login page', async () => {
    loginRequestMock.mockResolvedValue({
      accessToken: 'instructor-token',
      refreshToken: 'instructor-refresh',
      user: {
        id: 'instructor-1',
        name: 'Instructor User',
        email: 'instructor@example.com',
        role: 'INSTRUCTOR',
        avatarUrl: null,
      },
    });

    renderWithRoutes('/login', <ClientLoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'instructor@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Instructor@123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Instructor dashboard landing')).toBeInTheDocument();
  });

  it('rejects admin accounts on the client login page', async () => {
    loginRequestMock.mockResolvedValue({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
      user: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN',
        avatarUrl: null,
      },
    });

    renderWithRoutes('/login', <ClientLoginPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Admin@123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Please use the admin login page for administrator accounts.')).toBeInTheDocument();
  });

  it('validates confirm password on client register', async () => {
    renderWithRoutes('/register', <ClientRegisterPage />);

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'New Student' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@student.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Student@123456' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Mismatch@123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(registerRequestMock).not.toHaveBeenCalled();
  });

  it('registers a student account and redirects to the student dashboard', async () => {
    registerRequestMock.mockResolvedValue({
      accessToken: 'student-token',
      refreshToken: 'student-refresh',
      user: {
        id: 'student-1',
        name: 'New Student',
        email: 'new@student.com',
        role: 'STUDENT',
        avatarUrl: null,
      },
    });

    renderWithRoutes('/register', <ClientRegisterPage />);

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'New Student' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@student.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Student@123456' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Student@123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(registerRequestMock).toHaveBeenCalledWith({
        name: 'New Student',
        email: 'new@student.com',
        password: 'Student@123456',
      });
    });

    expect(await screen.findByText('Student dashboard landing')).toBeInTheDocument();
  });

  it('submits forgot password for client accounts', async () => {
    forgotPasswordRequestMock.mockResolvedValue(undefined);

    renderWithRoutes('/forgot-password', <ClientForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => {
      expect(forgotPasswordRequestMock).toHaveBeenCalledWith({ email: 'student@example.com' });
    });

    expect(await screen.findByText('If the account exists, a password reset email has been sent.')).toBeInTheDocument();
  });

  it('submits forgot password for admin accounts', async () => {
    forgotPasswordRequestMock.mockResolvedValue(undefined);

    renderWithRoutes('/admin/forgot-password', <AdminForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => {
      expect(forgotPasswordRequestMock).toHaveBeenCalledWith({ email: 'admin@example.com' });
    });
  });

  it('validates reset password confirm password mismatch', async () => {
    renderWithRoutes('/reset-password?token=test-token', <ClientResetPasswordPage />);

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'NewPassword123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Mismatch123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(resetPasswordRequestMock).not.toHaveBeenCalled();
  });

  it('submits reset password and redirects back to login', async () => {
    resetPasswordRequestMock.mockResolvedValue(undefined);

    renderWithRoutes('/reset-password?token=test-token', <ClientResetPasswordPage />);

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'NewPassword123' } });
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'NewPassword123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    await waitFor(() => {
      expect(resetPasswordRequestMock).toHaveBeenCalledWith({
        token: 'test-token',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });
    });

    expect(await screen.findByText(/Password updated successfully/i)).toBeInTheDocument();
  });
});

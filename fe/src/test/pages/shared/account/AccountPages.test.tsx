import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../../../App';
import { AuthProvider } from '../../../../context/AuthContext';
import { ProfilePage } from '../../../../pages/shared/account/ProfilePage';
import { SettingsPage } from '../../../../pages/shared/settings/SettingsPage';

const getMyProfileRequestMock = vi.fn();
const updateMeRequestMock = vi.fn();
const updateMyPasswordRequestMock = vi.fn();
const updateMyContactRequestMock = vi.fn();
const listCoursesRequestMock = vi.fn();
const listNotificationsRequestMock = vi.fn();

vi.mock('../../../../services/api/authApi', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/api/authApi')>('../../../../services/api/authApi');

  return {
    ...actual,
    getMyProfileRequest: (...args: unknown[]) => getMyProfileRequestMock(...args),
    updateMeRequest: (...args: unknown[]) => updateMeRequestMock(...args),
    updateMyPasswordRequest: (...args: unknown[]) => updateMyPasswordRequestMock(...args),
    updateMyContactRequest: (...args: unknown[]) => updateMyContactRequestMock(...args),
    uploadAvatarRequest: vi.fn(),
    uploadCoverImageRequest: vi.fn(),
    logoutRequest: vi.fn(),
  };
});

vi.mock('../../../../services/api/courseApi', () => ({
  listCoursesRequest: (...args: unknown[]) => listCoursesRequestMock(...args),
}));

vi.mock('../../../../services/api/notificationApi', () => ({
  listNotificationsRequest: (...args: unknown[]) => listNotificationsRequestMock(...args),
}));

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function seedAuth(role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT') {
  localStorage.setItem(
    'lms.auth',
    JSON.stringify({
      user: {
        id: `${role.toLowerCase()}-1`,
        name: `${role} User`,
        email: `${role.toLowerCase()}@example.com`,
        role,
        avatarUrl: null,
      },
      token: buildToken(),
      refreshToken: 'refresh-token',
    }),
  );
}

function renderWithRole(role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT', element: React.ReactElement, initialEntry = '/profile') {
  seedAuth(role);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{element}</AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const profileFixture = {
  id: 'user-1',
  email: 'john@example.com',
  name: 'John Doe',
  role: 'INSTRUCTOR' as const,
  avatarUrl: null,
  coverImageUrl: null,
  firstName: 'John',
  lastName: 'Doe',
  displayName: 'John Doe',
  phone: '+1-202-555-0147',
  age: 28,
  occupation: 'Application Developer',
  bio: 'Builds modern learning experiences.',
  websiteUrl: 'https://example.com',
  linkedinUrl: 'https://linkedin.com/in/john',
  githubUrl: 'https://github.com/john',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('account pages', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    getMyProfileRequestMock.mockReset();
    updateMeRequestMock.mockReset();
    updateMyPasswordRequestMock.mockReset();
    updateMyContactRequestMock.mockReset();
    listCoursesRequestMock.mockReset();
    listNotificationsRequestMock.mockReset();
    getMyProfileRequestMock.mockResolvedValue(profileFixture);
    updateMeRequestMock.mockResolvedValue(profileFixture);
    updateMyPasswordRequestMock.mockResolvedValue(undefined);
    updateMyContactRequestMock.mockResolvedValue(profileFixture);
    listCoursesRequestMock.mockResolvedValue({
      data: [],
    });
    listNotificationsRequestMock.mockResolvedValue([]);
  });

  it('renders the shared profile details for client users', async () => {
    getMyProfileRequestMock.mockResolvedValue({
      ...profileFixture,
      role: 'STUDENT',
      email: 'student@example.com',
    });

    renderWithRole('STUDENT', <ProfilePage />);

    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Application Developer')).toBeInTheDocument();
    expect(screen.getByText('Builds modern learning experiences.')).toBeInTheDocument();
    expect(screen.getByText('This account view is shared across admin, instructor, and student workspaces.')).toBeInTheDocument();
  });

  it('renders settings for admins and submits the password form', async () => {
    getMyProfileRequestMock.mockResolvedValue({
      ...profileFixture,
      role: 'ADMIN',
      email: 'admin@example.com',
      name: 'Admin User',
    });

    renderWithRole('ADMIN', <SettingsPage />, '/admin/settings');

    expect(await screen.findByText('Account profile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update cover image' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Password' }));
    expect(await screen.findByText('Set a new password to keep your account secure.')).toBeInTheDocument();

    const currentPasswordInput = await screen.findByPlaceholderText('Current password');
    const newPasswordInput = await screen.findByPlaceholderText('New password');
    const confirmPasswordInput = await screen.findByPlaceholderText('Confirm password');

    fireEvent.change(currentPasswordInput, { target: { value: 'OldPassword123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123' } });
    fireEvent.submit(currentPasswordInput.closest('form')!);

    await waitFor(() => {
      expect(updateMyPasswordRequestMock).toHaveBeenCalledWith({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });
    });
  }, 25000);

  it('redirects admin profile routes to admin settings', async () => {
    getMyProfileRequestMock.mockResolvedValue({
      ...profileFixture,
      role: 'ADMIN',
      email: 'admin@example.com',
      name: 'Admin User',
    });

    seedAuth('ADMIN');

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <MemoryRouter initialEntries={['/admin/profile']}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Account profile')).toBeInTheDocument();
    expect(screen.queryByText('This account view is shared across admin, instructor, and student workspaces.')).not.toBeInTheDocument();
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
  });

});

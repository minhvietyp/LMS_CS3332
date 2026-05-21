import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { AuthProvider } from '../components/context/AuthContext';
import { ProfilePage } from './ProfilePage';
import { SettingsPage } from './SettingsPage';

const getMyProfileRequestMock = vi.fn();
const updateMeRequestMock = vi.fn();
const updateMyPasswordRequestMock = vi.fn();
const updateMyContactRequestMock = vi.fn();

vi.mock('../services/authApi', async () => {
  const actual = await vi.importActual<typeof import('../services/authApi')>('../services/authApi');

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

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>{element}</AuthProvider>
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
    getMyProfileRequestMock.mockResolvedValue(profileFixture);
    updateMeRequestMock.mockResolvedValue(profileFixture);
    updateMyPasswordRequestMock.mockResolvedValue(undefined);
    updateMyContactRequestMock.mockResolvedValue(profileFixture);
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

    fireEvent.change(screen.getByPlaceholderText('Current password'), { target: { value: 'OldPassword123' } });
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'NewPassword123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'NewPassword123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

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

    render(
      <MemoryRouter initialEntries={['/admin/profile']}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Account profile')).toBeInTheDocument();
    expect(screen.queryByText('This account view is shared across admin, instructor, and student workspaces.')).not.toBeInTheDocument();
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
  });

});

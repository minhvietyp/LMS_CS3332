import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../../context/AuthContext';
import { AdminUserCreatePage } from '../../../../pages/admin/users/AdminUserCreatePage';
import { AdminUserDetailPage } from '../../../../pages/admin/users/AdminUserDetailPage';
import { AdminUserEditPage } from '../../../../pages/admin/users/AdminUserEditPage';
import { AdminUserListPage } from '../../../../pages/admin/users/AdminUserListPage';
import { HEAVY_UI_TEST_TIMEOUT } from '../../../utils/testTimeouts';
import {
  createUserRequest,
  getUserByIdRequest,
  getRoleAccessMatrixRequest,
  listUsersRequest,
  restoreUserRequest,
  softDeleteUserRequest,
  updateUserRequest,
} from '../../../../services/api/authApi';

vi.mock('../../../../services/api/authApi', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/api/authApi')>('../../../../services/api/authApi');

  return {
    ...actual,
    listUsersRequest: vi.fn(),
    createUserRequest: vi.fn(),
    getUserByIdRequest: vi.fn(),
    getRoleAccessMatrixRequest: vi.fn(),
    updateUserRequest: vi.fn(),
    softDeleteUserRequest: vi.fn(),
    restoreUserRequest: vi.fn(),
  };
});

const listUsersRequestMock = vi.mocked(listUsersRequest);
const createUserRequestMock = vi.mocked(createUserRequest);
const getUserByIdRequestMock = vi.mocked(getUserByIdRequest);
const getRoleAccessMatrixRequestMock = vi.mocked(getRoleAccessMatrixRequest);
const updateUserRequestMock = vi.mocked(updateUserRequest);
const softDeleteUserRequestMock = vi.mocked(softDeleteUserRequest);
const restoreUserRequestMock = vi.mocked(restoreUserRequest);

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function renderWithAdmin(initialEntry: string) {
  localStorage.setItem(
    'lms.auth',
    JSON.stringify({
      user: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN',
        avatarUrl: null,
      },
      token: buildToken(),
      refreshToken: 'refresh-token',
    }),
  );

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/users" element={<AdminUserListPage />} />
          <Route path="/admin/users/create" element={<AdminUserCreatePage />} />
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
          <Route path="/admin/users/:id/edit" element={<AdminUserEditPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const roleMatrixFixture = [
  {
    role: 'ADMIN' as const,
    label: 'Admin',
    description: 'Full administrative access to users, courses, and lessons.',
    permissions: ['user:read', 'user:create', 'user:update', 'user:delete', 'user:restore', 'course:read'],
  },
  {
    role: 'INSTRUCTOR' as const,
    label: 'Instructor',
    description: 'Manage teaching content and course operations.',
    permissions: ['course:read', 'course:create', 'course:update', 'course:delete', 'lesson:create'],
  },
  {
    role: 'STUDENT' as const,
    label: 'Student',
    description: 'Access published course content only.',
    permissions: ['course:read'],
  },
];

describe('Admin user management pages', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    listUsersRequestMock.mockReset();
    createUserRequestMock.mockReset();
    getUserByIdRequestMock.mockReset();
    getRoleAccessMatrixRequestMock.mockReset();
    updateUserRequestMock.mockReset();
    softDeleteUserRequestMock.mockReset();
    restoreUserRequestMock.mockReset();
    getRoleAccessMatrixRequestMock.mockResolvedValue(roleMatrixFixture);
  });

  it('loads the list page with query params and updates search', async () => {
    listUsersRequestMock.mockResolvedValue({
      data: [
        {
          id: 'user-1',
          name: 'Jamie Chen',
          email: 'jamie@example.com',
          role: 'INSTRUCTOR',
          avatarUrl: null,
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          deletedAt: null,
          deletedBy: null,
        },
      ],
      meta: {
        page: 2,
        limit: 20,
        total: 21,
        totalPages: 2,
      },
    });

    renderWithAdmin('/admin/users?page=2&limit=20&role=INSTRUCTOR&status=ACTIVE');

    await waitFor(() => {
      expect(listUsersRequestMock).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        search: undefined,
        role: 'INSTRUCTOR',
        isActive: true,
        includeDeleted: false,
        deleted: undefined,
      });
    });

    fireEvent.change(screen.getByPlaceholderText('Search users...'), {
      target: { value: 'jamie' },
    });

    await waitFor(() => {
      expect(listUsersRequestMock).toHaveBeenLastCalledWith({
        page: 1,
        limit: 20,
        search: 'jamie',
        role: 'INSTRUCTOR',
        isActive: true,
        includeDeleted: false,
        deleted: undefined,
      });
    }, { timeout: 12000 });
  }, 15000);

  it('creates a user and navigates to the detail page', async () => {
    createUserRequestMock.mockResolvedValue({
      id: 'user-99',
      name: 'New Instructor',
      email: 'new-instructor@example.com',
      role: 'INSTRUCTOR',
      avatarUrl: 'https://cdn.example.com/avatar.png',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
      deletedBy: null,
    });

    renderWithAdmin('/admin/users/create');

    expect(screen.queryByText('Review the permissions this account inherits from its selected role.')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Instructor' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new-instructor@example.com' } });
    fireEvent.change(screen.getByLabelText('Temporary Password'), { target: { value: 'Password123' } });
    fireEvent.change(screen.getByLabelText('Avatar URL'), {
      target: { value: 'https://cdn.example.com/avatar.png' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create User' }));

    await waitFor(() => {
      expect(createUserRequestMock).toHaveBeenCalledWith({
        name: 'New Instructor',
        email: 'new-instructor@example.com',
        password: 'Password123',
        role: 'STUDENT',
        avatarUrl: 'https://cdn.example.com/avatar.png',
        isActive: true,
      });
    });

    expect(await screen.findByText('User Profile')).toBeInTheDocument();
  }, HEAVY_UI_TEST_TIMEOUT);

  it('loads the detail page and restores a deleted user', async () => {
    getUserByIdRequestMock
      .mockResolvedValueOnce({
        id: 'user-50',
        name: 'Deleted Learner',
        email: 'deleted@example.com',
        role: 'STUDENT',
        avatarUrl: null,
        isActive: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        deletedAt: '2026-01-03T00:00:00.000Z',
        deletedBy: 'admin-1',
      })
      .mockResolvedValueOnce({
        id: 'user-50',
        name: 'Deleted Learner',
        email: 'deleted@example.com',
        role: 'STUDENT',
        avatarUrl: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-04T00:00:00.000Z',
        deletedAt: null,
        deletedBy: null,
      });
    restoreUserRequestMock.mockResolvedValue(undefined);

    renderWithAdmin('/admin/users/user-50');

    expect((await screen.findAllByText('Deleted Learner')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Access published course content only.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));

    await waitFor(() => {
      expect(restoreUserRequestMock).toHaveBeenCalledWith('user-50');
    });

    await waitFor(() => {
      expect(getUserByIdRequestMock).toHaveBeenCalledTimes(2);
    });
  });

  it('loads the edit page and updates the user', async () => {
    getUserByIdRequestMock.mockResolvedValue({
      id: 'user-77',
      name: 'Jamie Chen',
      email: 'jamie@example.com',
      role: 'INSTRUCTOR',
      avatarUrl: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: null,
      deletedBy: null,
    });
    updateUserRequestMock.mockResolvedValue({
      id: 'user-77',
      name: 'Jamie Chen Updated',
      email: 'jamie.updated@example.com',
      role: 'ADMIN',
      avatarUrl: 'https://cdn.example.com/avatar.png',
      isActive: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
      deletedAt: null,
      deletedBy: null,
    });

    renderWithAdmin('/admin/users/user-77/edit');

    expect(await screen.findByDisplayValue('Jamie Chen')).toBeInTheDocument();
    expect(await screen.findByText('Manage teaching content and course operations.')).toBeInTheDocument();
    expect(screen.getByText('View user information')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jamie Chen Updated' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jamie.updated@example.com' } });
    fireEvent.change(screen.getByLabelText('Avatar URL'), {
      target: { value: 'https://cdn.example.com/avatar.png' },
    });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(updateUserRequestMock).toHaveBeenCalledWith('user-77', {
        name: 'Jamie Chen Updated',
        email: 'jamie.updated@example.com',
        role: 'INSTRUCTOR',
        avatarUrl: 'https://cdn.example.com/avatar.png',
        isActive: false,
      });
    });

    expect(updateUserRequestMock).toHaveBeenCalledTimes(1);
  });

  it('shows delete action for an active user on the detail page', async () => {
    getUserByIdRequestMock
      .mockResolvedValueOnce({
        id: 'user-88',
        name: 'Taylor Reed',
        email: 'taylor@example.com',
        role: 'STUDENT',
        avatarUrl: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        deletedAt: null,
        deletedBy: null,
      })
      .mockResolvedValueOnce({
        id: 'user-88',
        name: 'Taylor Reed',
        email: 'taylor@example.com',
        role: 'STUDENT',
        avatarUrl: null,
        isActive: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        deletedAt: '2026-01-05T00:00:00.000Z',
        deletedBy: 'admin-1',
      });

    renderWithAdmin('/admin/users/user-88');

    expect((await screen.findAllByText('Taylor Reed')).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Delete' }).length).toBeGreaterThan(0);
  });

  it('deletes a user from the detail page after confirming the modal', async () => {
    getUserByIdRequestMock
      .mockResolvedValueOnce({
        id: 'user-88',
        name: 'Taylor Reed',
        email: 'taylor@example.com',
        role: 'STUDENT',
        avatarUrl: null,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        deletedAt: null,
        deletedBy: null,
      })
      .mockResolvedValueOnce({
        id: 'user-88',
        name: 'Taylor Reed',
        email: 'taylor@example.com',
        role: 'STUDENT',
        avatarUrl: null,
        isActive: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        deletedAt: '2026-01-05T00:00:00.000Z',
        deletedBy: 'admin-1',
      });
    softDeleteUserRequestMock.mockResolvedValue(undefined);

    renderWithAdmin('/admin/users/user-88');

    expect((await screen.findAllByText('Taylor Reed')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(screen.getByText('Delete User')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]);

    await waitFor(() => {
      expect(softDeleteUserRequestMock).toHaveBeenCalledWith('user-88');
    });

    await waitFor(() => {
      expect(getUserByIdRequestMock).toHaveBeenCalledTimes(2);
    });
  });
});

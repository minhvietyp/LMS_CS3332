import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserByIdRequest } from '../../../services/api/authApi';
import { getCourseByIdRequest } from '../../../services/api/courseApi';
import { AdminLayout } from '../../../components/admin-layout/layout/AdminLayout';
import { getVisibleAdminNavigation } from '../../../components/admin-layout/layout/adminNavigation';
import { AuthProvider } from '../../../context/AuthContext';

vi.mock('../../../services/api/authApi', () => ({
  logoutRequest: vi.fn(),
  getUserByIdRequest: vi.fn(),
}));

vi.mock('../../../services/api/courseApi', () => ({
  getCourseByIdRequest: vi.fn(),
}));

describe('AdminLayout', () => {
  const getUserByIdRequestMock = vi.mocked(getUserByIdRequest);
  const getCourseByIdRequestMock = vi.mocked(getCourseByIdRequest);

  const buildToken = () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
    return `header.${payload}.signature`;
  };

  beforeEach(() => {
    getUserByIdRequestMock.mockReset();
    getCourseByIdRequestMock.mockReset();
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
  });

  const renderWithAuth = (initialEntry = '/admin/users') =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <AuthProvider>
          <AdminLayout>
            <div>Page content</div>
          </AdminLayout>
        </AuthProvider>
      </MemoryRouter>,
    );

  it('renders shared admin navigation and page content', () => {
    renderWithAuth();

    const menu = screen.getByRole('menu');
    expect(screen.getByText('LMS Admin')).toBeInTheDocument();
    expect(screen.getByText('Learning Management System')).toBeInTheDocument();
    expect(within(menu).getByText('User Management')).toBeInTheDocument();
    expect(within(menu).getByText('Role & Permissions')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('renders nested breadcrumb paths for user edit pages', async () => {
    getUserByIdRequestMock.mockResolvedValue({
      id: 'user-77',
      name: 'Aigars Silkans',
      email: 'aigars@example.com',
      role: 'ADMIN',
      avatarUrl: null,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: null,
      deletedBy: null,
    });

    renderWithAuth('/admin/users/user-77/edit');

    const breadcrumb = screen
      .getAllByRole('navigation')
      .filter((element) => element.className.includes('ant-breadcrumb'))
      .at(-1)!;

    expect(await within(breadcrumb).findByRole('link', { name: 'Aigars Silkans' })).toBeInTheDocument();
    expect(within(breadcrumb).getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(within(breadcrumb).getByRole('link', { name: 'Users' })).toBeInTheDocument();
    expect(within(breadcrumb).getByText('Edit')).toBeInTheDocument();
  });

  it('filters admin-only items out of instructor navigation', () => {
    const items = getVisibleAdminNavigation('INSTRUCTOR');

    expect(items.some((item) => item.label === 'User Management')).toBe(false);
    expect(items.some((item) => item.label === 'Courses')).toBe(true);
    expect(items.some((item) => item.label === 'Lessons')).toBe(true);
  });

  it('renders nested breadcrumb paths for course detail pages', async () => {
    getCourseByIdRequestMock.mockResolvedValue({
      id: 'course-42',
      title: 'React Foundations',
      description: 'Build reliable admin workflows.',
      thumbnailUrl: null,
      status: 'DRAFT',
      instructorId: 'admin-1',
      instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: null,
      deletedBy: null,
      modules: [],
    });

    renderWithAuth('/admin/courses/course-42');

    const breadcrumb = screen
      .getAllByRole('navigation')
      .filter((element) => element.className.includes('ant-breadcrumb'))
      .at(-1)!;

    expect(await within(breadcrumb).findByText('React Foundations')).toBeInTheDocument();
    expect(within(breadcrumb).getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
    expect(within(breadcrumb).getByRole('link', { name: 'Courses' })).toBeInTheDocument();
  });

  it('renders nested breadcrumb paths for course edit pages', async () => {
    getCourseByIdRequestMock.mockResolvedValue({
      id: 'course-42',
      title: 'React Foundations',
      description: 'Build reliable admin workflows.',
      thumbnailUrl: null,
      status: 'DRAFT',
      instructorId: 'admin-1',
      instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: null,
      deletedBy: null,
      modules: [],
    });

    renderWithAuth('/admin/courses/course-42/edit');

    const breadcrumb = screen
      .getAllByRole('navigation')
      .filter((element) => element.className.includes('ant-breadcrumb'))
      .at(-1)!;

    expect(await within(breadcrumb).findByRole('link', { name: 'React Foundations' })).toBeInTheDocument();
    expect(within(breadcrumb).getByText('Edit')).toBeInTheDocument();
  });
});

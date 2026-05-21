import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../context/AuthContext';
import { ClientLayout } from './ClientLayout';
import { getVisibleClientMenu } from './ClientRoleMenu/clientMenu.config';

vi.mock('../../../services/authApi', async () => {
  const actual = await vi.importActual<typeof import('../../../services/authApi')>('../../../services/authApi');

  return {
    ...actual,
    logoutRequest: vi.fn(),
  };
});

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function renderWithRole(role: 'STUDENT' | 'INSTRUCTOR') {
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

  return render(
    <MemoryRouter initialEntries={[role === 'STUDENT' ? '/student/progress' : '/instructor/progress']}>
      <AuthProvider>
        <ClientLayout>
          <div>Client page content</div>
        </ClientLayout>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ClientLayout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders student navigation and page content', () => {
    renderWithRole('STUDENT');

    const menu = screen.getByRole('menu', { name: 'Client navigation' });
    expect(screen.getByText('LMS Client')).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /Dashboard/i })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: /My Progress/i })).toBeInTheDocument();
    expect(screen.getByText('Client page content')).toBeInTheDocument();
  });

  it('filters instructor-only items away from student menu data', () => {
    const items = getVisibleClientMenu('STUDENT');
    const labels = items.flatMap((section) => section.items.map((item) => item.label));

    expect(labels.includes('My Progress')).toBe(true);
    expect(labels.includes('Student Progress')).toBe(false);
  });

  it('shows instructor progress menu item for instructors', () => {
    const items = getVisibleClientMenu('INSTRUCTOR');
    const labels = items.flatMap((section) => section.items.map((item) => item.label));

    expect(labels.includes('Student Progress')).toBe(true);
    expect(labels.includes('My Progress')).toBe(false);
  });
});

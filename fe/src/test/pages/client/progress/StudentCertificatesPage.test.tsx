import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AuthProvider } from '../../../../context/AuthContext';
import { StudentCertificatesPage } from '../../../../pages/client/progress/StudentCertificatesPage';

const getOverview = vi.fn();

vi.mock('../../../../services/api/progressService', () => ({
  progressService: {
    getOverview: (...args: unknown[]) => getOverview(...args),
  },
}));

vi.mock('../../../../components/client-layout', () => ({
  ClientLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ClientPageContainer: ({ title, subtitle, actions, children }: { title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {subtitle ? <p>{subtitle}</p> : null}
      {actions}
      {children}
    </div>
  ),
}));

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function renderPage() {
  localStorage.clear();
  localStorage.setItem(
    'lms.auth',
    JSON.stringify({
      user: { id: 'student-1', name: 'Student', email: 'student@example.com', role: 'STUDENT' },
      token: buildToken(),
      refreshToken: 'refresh-token',
    }),
  );

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <MemoryRouter initialEntries={['/student/certificates']}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StudentCertificatesPage />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('StudentCertificatesPage', () => {
  beforeEach(() => {
    getOverview.mockReset();
    getOverview.mockResolvedValue({
      summary: {
        totalCourses: 2,
        activeCourses: 1,
        completedCourses: 1,
        droppedCourses: 0,
        overallProgress: 75,
        lastActivityAt: null,
      },
      courses: [
        {
          courseId: 'course-1',
          courseTitle: 'React Foundations',
          courseThumbnail: null,
          instructorName: 'Alex Tran',
          enrollmentStatus: 'COMPLETED',
          enrolledAt: '2026-01-01T00:00:00.000Z',
          lessonsCompleted: 6,
          totalLessons: 6,
          percentage: 100,
          weightedPercentage: 100,
          totalWeight: 6,
          completedWeight: 6,
        },
      ],
    });
  });

  it('renders completed course count and unavailable issuance state', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Certificates' })).toBeInTheDocument();
    expect(await screen.findByText('Issuance unavailable')).toBeInTheDocument();
    expect(await screen.findByText(/completed 1 course/i)).toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicRoutes } from '../../routes/publicRoutes';

vi.mock('../../services/api/courseApi', () => ({
  listPublicCoursesRequest: vi.fn().mockResolvedValue({ data: [] }),
  getPublicCourseByIdRequest: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/api/authApi', () => ({
  listPublicInstructorsRequest: vi.fn().mockResolvedValue([]),
  getPublicInstructorByIdRequest: vi.fn().mockResolvedValue(null),
}));

function renderRoute(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <Routes>{PublicRoutes({ fallbackElement: <div>fallback</div> })}</Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('route modules', () => {
  afterEach(() => vi.clearAllMocks());

  it('renders the public home route', async () => {
    renderRoute('/');
    expect(await screen.findByText('Explore catalog')).toBeInTheDocument();
  });

  it('renders public course catalog and detail routes', async () => {
    renderRoute('/catalog');
    expect(await screen.findByText('Course catalog')).toBeInTheDocument();
  });

  it('renders instructor and support routes', async () => {
    renderRoute('/instructors');
    expect(await screen.findByText('Instructor directory')).toBeInTheDocument();
  });
});

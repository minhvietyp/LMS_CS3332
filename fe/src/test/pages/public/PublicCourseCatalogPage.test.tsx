import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicCourseCatalogPage } from '../../../pages/public/PublicCourseCatalogPage';
import { renderPublicPage } from '../../utils/renderPublicPage';

const listPublicCoursesRequest = vi.fn();

vi.mock('../../../services/api/courseApi', () => ({
  listPublicCoursesRequest: (...args: unknown[]) => listPublicCoursesRequest(...args),
}));

describe('PublicCourseCatalogPage', () => {
  afterEach(() => vi.clearAllMocks());

  beforeEach(() => {
    listPublicCoursesRequest.mockResolvedValue({
      data: [
        {
          id: 'course-1',
          title: 'Frontend Foundations',
          description: 'Master the fundamentals of modern frontend engineering.',
          status: 'PUBLISHED',
          instructorId: 'instructor-1',
          instructor: { id: 'instructor-1', name: 'Dr. Ada' },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          moduleCount: 4,
          lessonCount: 18,
          enrollmentCount: 120,
        },
      ],
    });
  });

  it('renders published catalog results', async () => {
    renderPublicPage(<PublicCourseCatalogPage />, '/catalog');

    await waitFor(() => {
      expect(listPublicCoursesRequest).toHaveBeenCalled();
    });
    expect(await screen.findByRole('heading', { name: 'Frontend Foundations' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View course' })).toBeInTheDocument();
  }, 10000);
});
